# Telnet Connection Script for Raspberry Pis via WiFi
# Usage: .\connect-telnet-wifi.ps1 [pi-number] [port]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("1", "2")]
    [string]$PiNumber = "1",

    [Parameter(Mandatory=$false)]
    [int]$Port = 23
)

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

# Select Raspberry Pi based on connection type and number
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value

if ($PiNumber -eq "1") {
    $selectedPi = $wifiPis[0]
} else {
    $selectedPi = $wifiPis[1]
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Connecting to Raspberry Pi via Telnet (WiFi)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Name: $($selectedPi.name)" -ForegroundColor Yellow
Write-Host "IP Address: $($selectedPi.ip)" -ForegroundColor Yellow
Write-Host "MAC Address: $($selectedPi.mac)" -ForegroundColor Yellow
Write-Host "Connection: $($selectedPi.connection)" -ForegroundColor Yellow
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Test connectivity first
Write-Host "Testing connectivity..." -ForegroundColor Green
$pingResult = Test-Connection -ComputerName $selectedPi.ip -Count 2 -Quiet

if (-not $pingResult) {
    Write-Host "ERROR: Cannot reach $($selectedPi.ip). Please check:" -ForegroundColor Red
    Write-Host "  1. The Raspberry Pi is powered on" -ForegroundColor Red
    Write-Host "  2. WiFi is connected and working" -ForegroundColor Red
    Write-Host "  3. Both devices are on the same network" -ForegroundColor Red
    exit 1
}

Write-Host "Connection successful! Starting Telnet..." -ForegroundColor Green
Write-Host "Note: Telnet must be enabled on the Raspberry Pi" -ForegroundColor Yellow
Write-Host ""

# Check if telnet client is available
try {
    $telnetCheck = Get-Command telnet -ErrorAction Stop
    Write-Host "Starting telnet connection..." -ForegroundColor Green
    telnet $selectedPi.ip $Port
} catch {
    Write-Host "Telnet client not found. Installing..." -ForegroundColor Yellow
    Write-Host "Please run as Administrator: Enable-WindowsOptionalFeature -Online -FeatureName TelnetClient" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Or use PowerShell to connect:" -ForegroundColor Yellow
    Write-Host "  `$tcpClient = New-Object System.Net.Sockets.TcpClient('$($selectedPi.ip)', $Port)" -ForegroundColor Cyan
    Write-Host "  `$stream = `$tcpClient.GetStream()" -ForegroundColor Cyan
    Write-Host "  `$reader = New-Object System.IO.StreamReader(`$stream)" -ForegroundColor Cyan
    Write-Host "  `$writer = New-Object System.IO.StreamWriter(`$stream)" -ForegroundColor Cyan
}
