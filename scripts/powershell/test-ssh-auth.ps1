# Test SSH Authentication Methods
# Usage: .\test-ssh-auth.ps1 [pi-number]

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

# Get Ethernet Pi first (priority)
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value

if ($PiNumber -eq "1" -and $ethernetPis.Count -ge 1) {
    $selectedPi = $ethernetPis[0]
} elseif ($PiNumber -eq "2" -and $ethernetPis.Count -ge 2) {
    $selectedPi = $ethernetPis[1]
} else {
    Write-Host "ERROR: Ethernet Pi #$PiNumber not found" -ForegroundColor Red
    exit 1
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Testing SSH Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Pi: $($selectedPi.name) ($($selectedPi.ip))" -ForegroundColor Yellow
Write-Host ""

# Test 1: SSH Key Authentication
Write-Host "Test 1: SSH Key Authentication" -ForegroundColor Green
Write-Host "-----------------------------" -ForegroundColor Green
$keyTest = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o BatchMode=yes "${Username}@$($selectedPi.ip)" "echo 'SSH key works!'" 2>&1

if ($LASTEXITCODE -eq 0) {
    Write-Host "✓ SSH key authentication WORKS!" -ForegroundColor Green
    Write-Host "  You can connect with: .\connect-ssh.ps1 $PiNumber" -ForegroundColor Cyan
    exit 0
} else {
    Write-Host "✗ SSH key authentication FAILED" -ForegroundColor Red
    if ($keyTest -match "Permission denied") {
        Write-Host "  Your SSH key is not added to this Pi" -ForegroundColor Yellow
    }
}

Write-Host ""

# Test 2: Password Authentication
Write-Host "Test 2: Password Authentication" -ForegroundColor Green
Write-Host "-------------------------------" -ForegroundColor Green
Write-Host "Testing if password authentication is enabled..." -ForegroundColor Gray

# Try to connect with password (non-interactive test)
$passwordTest = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o PreferredAuthentications=password -o PubkeyAuthentication=no "${Username}@$($selectedPi.ip)" "echo 'test'" 2>&1

if ($passwordTest -match "password" -or $passwordTest -match "Password") {
    Write-Host "✓ Password authentication is ENABLED" -ForegroundColor Green
    Write-Host "  You can connect with password" -ForegroundColor Cyan
    Write-Host "  Try: .\connect-ssh.ps1 $PiNumber" -ForegroundColor Yellow
} elseif ($passwordTest -match "Permission denied" -and $passwordTest -notmatch "publickey") {
    Write-Host "⚠ Password authentication may be enabled but test failed" -ForegroundColor Yellow
    Write-Host "  Try connecting manually to verify" -ForegroundColor Cyan
} else {
    Write-Host "✗ Password authentication is DISABLED" -ForegroundColor Red
    Write-Host "  You need to add SSH key or enable password auth" -ForegroundColor Yellow
}

Write-Host ""

# Show solutions
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Solutions" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option A: Add SSH Key (Recommended)" -ForegroundColor Green
Write-Host "  1. Run: .\get-pi-command.ps1" -ForegroundColor White
Write-Host "  2. Connect to Pi physically (keyboard/monitor)" -ForegroundColor White
Write-Host "  3. Run the command shown on the Pi" -ForegroundColor White
Write-Host "  4. Test again: .\test-ssh-auth.ps1 $PiNumber" -ForegroundColor White
Write-Host ""

Write-Host "Option B: Enable Password Authentication" -ForegroundColor Green
Write-Host "  On the Pi (physical access), run:" -ForegroundColor White
Write-Host "    sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config" -ForegroundColor Yellow
Write-Host "    sudo systemctl restart ssh" -ForegroundColor Yellow
Write-Host "  Then test: .\test-ssh-auth.ps1 $PiNumber" -ForegroundColor White
Write-Host ""

Write-Host "Option C: Use USB Drive" -ForegroundColor Green
Write-Host "  1. Run: .\copy-key-to-usb.ps1" -ForegroundColor White
Write-Host "  2. Insert USB into Pi" -ForegroundColor White
Write-Host "  3. On Pi: bash /media/pi/*/setup-ssh-key.sh" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Commands" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Get SSH key command: .\get-pi-command.ps1" -ForegroundColor Yellow
Write-Host "  Test this Pi again: .\test-ssh-auth.ps1 $PiNumber" -ForegroundColor Yellow
Write-Host "  Try connecting: .\connect-ssh.ps1 $PiNumber" -ForegroundColor Yellow
Write-Host ""
