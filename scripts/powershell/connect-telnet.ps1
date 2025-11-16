# Telnet Connection Script - Prioritizes Ethernet, falls back to WiFi
# Usage: .\connect-telnet.ps1 [pi-number] [port] [connection-type]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("1", "2")]
    [string]$PiNumber = "1",

    [Parameter(Mandatory=$false)]
    [int]$Port = 23,

    [Parameter(Mandatory=$false)]
    [ValidateSet("ethernet", "wifi", "auto")]
    [string]$ConnectionType = "auto"
)

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

$selectedPi = $null
$connectionMethod = ""

if ($ConnectionType -eq "auto") {
    # ALWAYS try Ethernet first (priority)
    $ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value

    # Check Ethernet first - this is the priority
    if ($ethernetPis.Count -gt 0) {
        if ($PiNumber -eq "1" -and $ethernetPis.Count -ge 1) {
            $selectedPi = $ethernetPis[0]
            $connectionMethod = "Ethernet"
        } elseif ($PiNumber -eq "2" -and $ethernetPis.Count -ge 2) {
            $selectedPi = $ethernetPis[1]
            $connectionMethod = "Ethernet"
        }
    }

    # Only fall back to WiFi if Ethernet Pi not found
    if ($null -eq $selectedPi) {
        $wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
        if ($PiNumber -eq "1" -and $wifiPis.Count -ge 1) {
            $selectedPi = $wifiPis[0]
            $connectionMethod = "WiFi"
            Write-Host "⚠ Ethernet Pi #$PiNumber not found, using WiFi fallback" -ForegroundColor Yellow
        } elseif ($PiNumber -eq "2" -and $wifiPis.Count -ge 2) {
            $selectedPi = $wifiPis[1]
            $connectionMethod = "WiFi"
            Write-Host "⚠ Ethernet Pi #$PiNumber not found, using WiFi fallback" -ForegroundColor Yellow
        }
    }
} elseif ($ConnectionType -eq "ethernet") {
    $ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
    if ($PiNumber -eq "1") {
        $selectedPi = $ethernetPis[0]
    } else {
        $selectedPi = $ethernetPis[1]
    }
    $connectionMethod = "Ethernet"
} else {
    $wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
    if ($PiNumber -eq "1") {
        $selectedPi = $wifiPis[0]
    } else {
        $selectedPi = $wifiPis[1]
    }
    $connectionMethod = "WiFi"
}

if ($null -eq $selectedPi) {
    Write-Host "ERROR: Raspberry Pi #$PiNumber not found" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Connecting to Raspberry Pi via Telnet ($connectionMethod)" -ForegroundColor Cyan
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
    if ($connectionMethod -eq "Ethernet") {
        Write-Host "  1. The Raspberry Pi is powered on" -ForegroundColor Red
        Write-Host "  2. Ethernet cable is connected" -ForegroundColor Red
        Write-Host "  3. Both devices are on the same network" -ForegroundColor Red
    } else {
        Write-Host "  1. The Raspberry Pi is powered on" -ForegroundColor Red
        Write-Host "  2. WiFi is connected and working" -ForegroundColor Red
        Write-Host "  3. Both devices are on the same network" -ForegroundColor Red
    }
    exit 1
}

Write-Host "Connection successful! Testing Telnet port..." -ForegroundColor Green

# Test Telnet port
$telnetPortOpen = $false
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($selectedPi.ip, $Port, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

    if ($wait) {
        $tcpClient.EndConnect($connect)
        $tcpClient.Close()
        $telnetPortOpen = $true
        Write-Host "✓ Telnet port $Port is open" -ForegroundColor Green
    } else {
        Write-Host "⚠ Telnet port $Port is not accessible" -ForegroundColor Yellow
        Write-Host "  Telnet service may not be enabled on the Pi" -ForegroundColor Yellow
        Write-Host "  On the Pi, run:" -ForegroundColor Cyan
        Write-Host "    sudo apt-get install -y telnetd inetutils-inetd" -ForegroundColor White
        Write-Host "    sudo systemctl enable inetd && sudo systemctl start inetd" -ForegroundColor White
    }
} catch {
    Write-Host "⚠ Cannot connect to Telnet port $Port" -ForegroundColor Yellow
    Write-Host "  Error: $_" -ForegroundColor Red
}

Write-Host ""

# Check if telnet client is available
try {
    $telnetCheck = Get-Command telnet -ErrorAction Stop
    if ($telnetPortOpen) {
        Write-Host "Starting telnet connection..." -ForegroundColor Green
        telnet $selectedPi.ip $Port
    } else {
        Write-Host "Telnet port is not open. Please enable telnet on the Pi first." -ForegroundColor Yellow
        Write-Host "See setup-telnet.ps1 or PHYSICAL-ACCESS-SETUP.md for instructions." -ForegroundColor Cyan
    }
} catch {
    Write-Host "Telnet client not found on Windows." -ForegroundColor Yellow
    Write-Host ""
    Write-Host "To install telnet client:" -ForegroundColor Cyan
    Write-Host "  Run PowerShell as Administrator:" -ForegroundColor White
    Write-Host "  Enable-WindowsOptionalFeature -Online -FeatureName TelnetClient" -ForegroundColor Yellow
    Write-Host ""
    if ($telnetPortOpen) {
        Write-Host "Or use PowerShell to connect:" -ForegroundColor Yellow
        Write-Host "  `$tcpClient = New-Object System.Net.Sockets.TcpClient('$($selectedPi.ip)', $Port)" -ForegroundColor Cyan
        Write-Host "  `$stream = `$tcpClient.GetStream()" -ForegroundColor Cyan
        Write-Host "  `$reader = New-Object System.IO.StreamReader(`$stream)" -ForegroundColor Cyan
        Write-Host "  `$writer = New-Object System.IO.StreamWriter(`$stream)" -ForegroundColor Cyan
    }
}
