# SSH Connection Script - Prioritizes Ethernet, falls back to WiFi
# Usage: .\connect-ssh.ps1 [pi-number] [username] [connection-type]

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("1", "2")]
    [string]$PiNumber = "1",

    [Parameter(Mandatory=$false)]
    [string]$Username = "pi",

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
Write-Host "Connecting to Raspberry Pi via $connectionMethod" -ForegroundColor Cyan
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

Write-Host "Connection successful! Testing SSH port..." -ForegroundColor Green

# Test SSH port
try {
    $tcpClient = New-Object System.Net.Sockets.TcpClient
    $connect = $tcpClient.BeginConnect($selectedPi.ip, 22, $null, $null)
    $wait = $connect.AsyncWaitHandle.WaitOne(3000, $false)

    if (-not $wait) {
        Write-Host "⚠ SSH port 22 is not accessible" -ForegroundColor Yellow
        Write-Host "  The SSH service may not be running on the Pi" -ForegroundColor Yellow
        Write-Host "  On the Pi, run: sudo systemctl enable ssh && sudo systemctl start ssh" -ForegroundColor Cyan
        exit 1
    }

    $tcpClient.EndConnect($connect)
    $tcpClient.Close()
    Write-Host "✓ SSH port 22 is open" -ForegroundColor Green
} catch {
    Write-Host "⚠ Cannot connect to SSH port 22" -ForegroundColor Yellow
    Write-Host "  Error: $_" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Connecting via SSH..." -ForegroundColor Green
Write-Host ""

# Remove old host key to avoid warnings
ssh-keygen -R $selectedPi.ip -f "$env:USERPROFILE\.ssh\known_hosts" 2>&1 | Out-Null

# Connect via SSH with better error handling
try {
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=accept-new "$Username@$($selectedPi.ip)"

    if ($LASTEXITCODE -ne 0) {
        Write-Host ""
        Write-Host "Connection failed. Common issues:" -ForegroundColor Yellow
        Write-Host "  1. Password authentication disabled (needs SSH key)" -ForegroundColor White
        Write-Host "  2. Wrong username or password" -ForegroundColor White
        Write-Host "  3. SSH key not added to authorized_keys" -ForegroundColor White
        Write-Host ""
        Write-Host "Solutions:" -ForegroundColor Cyan
        Write-Host "  - Add SSH key: .\get-pi-command.ps1" -ForegroundColor Yellow
        Write-Host "  - Enable password auth: See PHYSICAL-ACCESS-SETUP.md" -ForegroundColor Yellow
    }
} catch {
    Write-Host "SSH connection error: $_" -ForegroundColor Red
    exit 1
}
