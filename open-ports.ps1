# Script to open ports 22 (SSH) and 23 (Telnet) on all Raspberry Pis
# Usage: .\open-ports.ps1 [username]

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Opening Ports 22 and 23 on Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Commands to open ports (works with both ufw and iptables)
$firewallCommands = @"
# Check if ufw is installed and active
if command -v ufw &> /dev/null; then
    echo "Using UFW firewall..."
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 23/tcp comment 'Telnet'
    sudo ufw --force enable
    sudo ufw status | grep -E '(22|23)'
elif command -v firewall-cmd &> /dev/null; then
    echo "Using firewalld..."
    sudo firewall-cmd --permanent --add-port=22/tcp
    sudo firewall-cmd --permanent --add-port=23/tcp
    sudo firewall-cmd --reload
    sudo firewall-cmd --list-ports | grep -E '(22|23)'
else
    echo "Using iptables..."
    sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    sudo iptables -A INPUT -p tcp --dport 23 -j ACCEPT
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>&1 || sudo sh -c 'iptables-save > /etc/iptables/rules.v4'
    echo "Ports 22 and 23 opened via iptables"
fi
# Ensure SSH is enabled
sudo systemctl enable ssh
sudo systemctl start ssh
# Ensure telnet is enabled (if installed)
if systemctl list-unit-files | grep -q inetd; then
    sudo systemctl enable inetd
    sudo systemctl start inetd
fi
echo "Port configuration complete for $(hostname)"
"@

function Open-PortsOnPi {
    param(
        [string]$PiName,
        [string]$IpAddress,
        [string]$ConnectionType,
        [string]$User
    )

    Write-Host "Processing: $PiName ($IpAddress) via $ConnectionType" -ForegroundColor Yellow

    # Test connectivity
    $pingResult = Test-Connection -ComputerName $IpAddress -Count 2 -Quiet
    if (-not $pingResult) {
        Write-Host "  ✗ Cannot reach $IpAddress - skipping" -ForegroundColor Red
        return $false
    }

    Write-Host "  ✓ Connectivity OK" -ForegroundColor Green

    # Test SSH connectivity
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, 22, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

        if (-not $wait) {
            Write-Host "  ⚠ SSH not available - cannot configure firewall remotely" -ForegroundColor Yellow
            Write-Host "    Please configure manually on the Pi:" -ForegroundColor Cyan
            Write-Host "      sudo ufw allow 22/tcp" -ForegroundColor White
            Write-Host "      sudo ufw allow 23/tcp" -ForegroundColor White
            Write-Host "      sudo ufw enable" -ForegroundColor White
            return $false
        }

        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
    } catch {
        Write-Host "  ⚠ SSH not available - cannot configure firewall remotely" -ForegroundColor Yellow
        return $false
    }

    Write-Host "  ✓ SSH available, configuring firewall..." -ForegroundColor Green

    # Execute firewall commands via SSH
    try {
        Write-Host "    Opening ports 22 (SSH) and 23 (Telnet)..." -ForegroundColor Gray

        # Create a temporary script file
        $tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
        $firewallCommands | Out-File -FilePath $tempScript -Encoding ASCII -NoNewline

        # Copy script to Pi
        Write-Host "    Copying configuration script..." -ForegroundColor Gray
        $copyResult = scp -o StrictHostKeyChecking=no "$tempScript" "${User}@${IpAddress}:/tmp/open-ports.sh" 2>&1

        if ($LASTEXITCODE -ne 0) {
            Write-Host "    ⚠ SSH authentication required" -ForegroundColor Yellow
            Write-Host "    Please run manually on the Pi:" -ForegroundColor Cyan
            Write-Host "      ssh ${User}@${IpAddress}" -ForegroundColor White
            Write-Host "      Then run: bash open-ports-manual.sh" -ForegroundColor White
            Write-Host "    Or copy and run these commands:" -ForegroundColor Cyan
            Write-Host "      sudo ufw allow 22/tcp" -ForegroundColor White
            Write-Host "      sudo ufw allow 23/tcp" -ForegroundColor White
            Write-Host "      sudo ufw enable" -ForegroundColor White
            Write-Host "      sudo systemctl enable ssh" -ForegroundColor White
            Write-Host "      sudo systemctl start ssh" -ForegroundColor White
            return $false
        } else {
            # Execute script on Pi
            Write-Host "    Running configuration script..." -ForegroundColor Gray
            $result = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${User}@${IpAddress}" "bash /tmp/open-ports.sh && rm /tmp/open-ports.sh" 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "    ✓ Firewall configured successfully" -ForegroundColor Green
            } else {
                if ($result -match "Permission denied") {
                    Write-Host "    ⚠ SSH authentication required" -ForegroundColor Yellow
                    Write-Host "    Please configure manually (see instructions below)" -ForegroundColor Cyan
                } else {
                    Write-Host "    ⚠ Some commands may have failed" -ForegroundColor Yellow
                    Write-Host "    Output: $result" -ForegroundColor Gray
                }
            }
        }

        # Cleanup
        if (Test-Path $tempScript) {
            Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
        }

        # Verify ports are open
        Start-Sleep -Seconds 2
        Write-Host "    Verifying ports..." -ForegroundColor Gray

        $sshOpen = $false
        $telnetOpen = $false

        # Test SSH port
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connect = $tcpClient.BeginConnect($IpAddress, 22, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
            if ($wait) {
                $tcpClient.EndConnect($connect)
                $tcpClient.Close()
                $sshOpen = $true
            }
        } catch { }

        # Test Telnet port
        try {
            $tcpClient = New-Object System.Net.Sockets.TcpClient
            $connect = $tcpClient.BeginConnect($IpAddress, 23, $null, $null)
            $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
            if ($wait) {
                $tcpClient.EndConnect($connect)
                $tcpClient.Close()
                $telnetOpen = $true
            }
        } catch { }

        if ($sshOpen) {
            Write-Host "    ✓ Port 22 (SSH) is open" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Port 22 (SSH) may not be accessible" -ForegroundColor Yellow
        }

        if ($telnetOpen) {
            Write-Host "    ✓ Port 23 (Telnet) is open" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Port 23 (Telnet) may not be open (service may not be running)" -ForegroundColor Yellow
        }

        return $true
    } catch {
        Write-Host "  ✗ Error configuring firewall: $_" -ForegroundColor Red
        return $false
    }
}

# Process Ethernet Pis first (priority)
Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
foreach ($pi in $ethernetPis) {
    Open-PortsOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

# Process WiFi Pis
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
foreach ($pi in $wifiPis) {
    Open-PortsOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Port Configuration Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing all connections..." -ForegroundColor Yellow
& pwsh -ExecutionPolicy Bypass -File ".\test-connections.ps1"
