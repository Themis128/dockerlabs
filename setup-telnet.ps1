# Automated Telnet Setup Script for Raspberry Pis
# This script will enable telnet on all accessible Raspberry Pis

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enabling Telnet on Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Commands to enable telnet
$telnetCommands = @"
sudo apt-get update -y
sudo apt-get install -y telnetd inetutils-inetd
sudo systemctl enable inetd
sudo systemctl start inetd
sudo systemctl status inetd --no-pager | head -10
"@

function Enable-TelnetViaSSH {
    param(
        [string]$PiName,
        [string]$IpAddress,
        [string]$ConnectionType,
        [string]$User
    )

    Write-Host "Processing: $PiName ($IpAddress) via $ConnectionType" -ForegroundColor Yellow

    # Test SSH connectivity
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, 22, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

        if (-not $wait) {
            Write-Host "  ⚠ SSH not available - manual setup required" -ForegroundColor Yellow
            Write-Host "    Run these commands on the Pi:" -ForegroundColor Cyan
            Write-Host "      sudo apt-get update -y" -ForegroundColor White
            Write-Host "      sudo apt-get install -y telnetd inetutils-inetd" -ForegroundColor White
            Write-Host "      sudo systemctl enable inetd" -ForegroundColor White
            Write-Host "      sudo systemctl start inetd" -ForegroundColor White
            return $false
        }

        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
    } catch {
        Write-Host "  ⚠ SSH not available - manual setup required" -ForegroundColor Yellow
        return $false
    }

    Write-Host "  ✓ SSH available, enabling telnet..." -ForegroundColor Green

    # Execute commands via SSH (all in one command)
    try {
        Write-Host "    Installing and configuring telnet..." -ForegroundColor Gray

        # Combine all commands with && to run sequentially
        $combinedCommand = "sudo apt-get update -y && sudo apt-get install -y telnetd inetutils-inetd && sudo systemctl enable inetd && sudo systemctl start inetd && sleep 2 && sudo systemctl status inetd --no-pager | head -5"

        $result = ssh -o StrictHostKeyChecking=no -o ConnectTimeout=10 "${User}@${IpAddress}" $combinedCommand 2>&1

        if ($LASTEXITCODE -eq 0) {
            Write-Host "    ✓ Commands executed successfully" -ForegroundColor Green
        } else {
            Write-Host "    ⚠ Some commands may have failed. Output:" -ForegroundColor Yellow
            Write-Host $result -ForegroundColor Gray
        }

        # Wait a bit for service to start
        Start-Sleep -Seconds 3

        # Verify telnet is running
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
                Write-Host "  ⚠ Connection test failed: $_" -ForegroundColor Yellow
            }
        } else {
            Write-Host "  ⚠ Telnet port not open yet. The service may need a restart." -ForegroundColor Yellow
            Write-Host "    Try: ssh ${User}@${IpAddress} 'sudo systemctl restart inetd'" -ForegroundColor Cyan
            return $false
        }
    } catch {
        Write-Host "  ✗ Error enabling telnet: $_" -ForegroundColor Red
        Write-Host "    You may need to run commands manually" -ForegroundColor Yellow
        return $false
    }
}

# Process all Pis
$allPis = @()
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value

Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
foreach ($pi in $ethernetPis) {
    Enable-TelnetViaSSH -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
foreach ($pi in $wifiPis) {
    Enable-TelnetViaSSH -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing telnet connections..." -ForegroundColor Yellow
& pwsh -ExecutionPolicy Bypass -File ".\test-connections.ps1"
