# SSH Connection Script for Raspberry Pis via WiFi
# Usage: .\connect-ssh-wifi.ps1 [pi-number] [username]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("1", "2")]
    [string]$PiNumber = "1",

    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

# Select Raspberry Pi based on connection type and number
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value

if ($PiNumber -eq "1") {
    $selectedPi = $wifiPis[0]
} else {
    $selectedPi = $wifiPis[1]
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Connecting to Raspberry Pi via WiFi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Name: $($selectedPi.name)" -ForegroundColor Yellow
Write-Host "IP Address: $($selectedPi.ip)" -ForegroundColor Yellow
Write-Host "MAC Address: $($selectedPi.mac)" -ForegroundColor Yellow
Write-Host "Connection: $($selectedPi.connection)" -ForegroundColor Yellow
Write-Host "Username: $Username" -ForegroundColor Yellow
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

Write-Host "Connection successful! Starting SSH..." -ForegroundColor Green
Write-Host ""

# Connect via SSH
ssh "$Username@$($selectedPi.ip)"
