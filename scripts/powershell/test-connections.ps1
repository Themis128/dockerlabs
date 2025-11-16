# Test connectivity to all Raspberry Pis
# Usage: .\test-connections.ps1

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing Raspberry Pi Connectivity" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

function Test-PiConnection {
    param(
        [string]$PiName,
        [string]$IpAddress,
        [string]$ConnectionType,
        [int]$SshPort = 22,
        [int]$TelnetPort = 23
    )

    Write-Host "Testing: $PiName ($IpAddress) via $ConnectionType" -ForegroundColor Yellow

    # Test ping
    Write-Host "  [Ping] " -NoNewline
    $pingResult = Test-Connection -ComputerName $IpAddress -Count 2 -Quiet
    if ($pingResult) {
        Write-Host "✓ OK" -ForegroundColor Green
    } else {
        Write-Host "✗ FAILED" -ForegroundColor Red
        return
    }

    # Test SSH
    Write-Host "  [SSH]  " -NoNewline
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, $SshPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($wait) {
            $tcpClient.EndConnect($connect)
            Write-Host "✓ Port $SshPort open" -ForegroundColor Green
            $tcpClient.Close()
        } else {
            Write-Host "✗ Port $SshPort closed/timeout" -ForegroundColor Red
        }
    } catch {
        Write-Host "✗ Port $SshPort closed/timeout" -ForegroundColor Red
    }

    # Test Telnet
    Write-Host "  [Telnet] " -NoNewline
    try {
        $tcpClient = New-Object System.Net.Sockets.TcpClient
        $connect = $tcpClient.BeginConnect($IpAddress, $TelnetPort, $null, $null)
        $wait = $connect.AsyncWaitHandle.WaitOne(2000, $false)
        if ($wait) {
            $tcpClient.EndConnect($connect)
            Write-Host "✓ Port $TelnetPort open" -ForegroundColor Green
            $tcpClient.Close()
        } else {
            Write-Host "✗ Port $TelnetPort closed (telnet not enabled)" -ForegroundColor Yellow
        }
    } catch {
        Write-Host "✗ Port $TelnetPort closed (telnet not enabled)" -ForegroundColor Yellow
    }

    Write-Host ""
}

# Test Ethernet Pis
Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
foreach ($pi in $ethernetPis) {
    Test-PiConnection -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection
}

# Test WiFi Pis
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
foreach ($pi in $wifiPis) {
    Test-PiConnection -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
