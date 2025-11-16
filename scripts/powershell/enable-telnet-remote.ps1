# Enable Telnet on all Raspberry Pis via SSH
# This script connects to each Pi and enables telnet service
# Usage: .\enable-telnet-remote.ps1 [username]

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enabling Telnet on All Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Commands to enable telnet (all in one)
$telnetSetupCommand = "sudo apt-get update -y && sudo apt-get install -y telnetd inetutils-inetd && sudo systemctl enable inetd && sudo systemctl start inetd && sleep 2 && sudo systemctl status inetd --no-pager | head -5"

function Enable-TelnetOnPi {
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

    # Test SSH port
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, 22, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

        if (-not $wait) {
            Write-Host "  ✗ SSH port 22 not accessible - skipping" -ForegroundColor Red
            return $false
        }

        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
    } catch {
        Write-Host "  ✗ SSH not available - skipping" -ForegroundColor Red
        return $false
    }

    Write-Host "  ✓ SSH available, enabling telnet..." -ForegroundColor Green

    # Execute telnet setup via SSH
    try {
        Write-Host "    Installing and configuring telnet..." -ForegroundColor Gray

        # Remove old host key first to avoid warnings
        ssh-keygen -R $IpAddress -f "$env:USERPROFILE\.ssh\known_hosts" 2>&1 | Out-Null

        # Run the setup command
        $result = ssh -o StrictHostKeyChecking=accept-new -o ConnectTimeout=15 "${User}@${IpAddress}" $telnetSetupCommand 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Telnet setup completed" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Setup may have issues. Output:" -ForegroundColor Yellow
            Write-Host $result -ForegroundColor Gray
        }

        # Wait for service to start
        Start-Sleep -Seconds 3

        # Verify telnet port is open
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, 23, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

        if ($wait) {
            try {
                $tcpClient.EndConnect($connect)
                $tcpClient.Close()
                Write-Host "  ✓ Telnet enabled and running on port 23" -ForegroundColor Green
                return $true
            } catch {
                Write-Host "  ⚠ Port test failed: $_" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠ Telnet port not open yet. Service may need a moment to start." -ForegroundColor Yellow
            Write-Host "    Try: ssh ${User}@${IpAddress} 'sudo systemctl restart inetd'" -ForegroundColor Cyan
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        Write-Host "    You may need to enable password authentication or add SSH key" -ForegroundColor Yellow
        return $false
    }
}

# Process Ethernet Pis first (priority)
Write-Host "ETHERNET CONNECTIONS (Priority):" -ForegroundColor Green
Write-Host "-------------------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
foreach ($pi in $ethernetPis) {
    Enable-TelnetOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

# Process WiFi Pis
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
foreach ($pi in $wifiPis) {
    Enable-TelnetOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing all connections..." -ForegroundColor Yellow
& pwsh -ExecutionPolicy Bypass -File ".\test-connections.ps1"
