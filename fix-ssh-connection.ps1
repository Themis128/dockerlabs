# Fix SSH connection issues (known_hosts and authentication)
# Usage: .\fix-ssh-connection.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Fixing SSH Connection Issues" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

Write-Host "Step 1: Removing old host keys from known_hosts" -ForegroundColor Green
Write-Host "------------------------------------------------" -ForegroundColor Green

$allPis = @()
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value

$allPis = $ethernetPis + $wifiPis

foreach ($pi in $allPis) {
    Write-Host "Removing old key for $($pi.ip)..." -ForegroundColor Yellow
    ssh-keygen -R $pi.ip -f "$env:USERPROFILE\.ssh\known_hosts" 2>&1 | Out-Null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ Removed old key for $($pi.ip)" -ForegroundColor Green
    } else {
        Write-Host "  ⚠ No old key found for $($pi.ip)" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Step 2: Current Status" -ForegroundColor Green
Write-Host "---------------------" -ForegroundColor Green
Write-Host ""

Write-Host "All Pis require SSH key authentication." -ForegroundColor Yellow
Write-Host "You have two options:" -ForegroundColor Cyan
Write-Host ""
Write-Host "Option A: Add SSH Key to Each Pi (Recommended)" -ForegroundColor Green
Write-Host "  1. Run: .\get-pi-command.ps1" -ForegroundColor White
Write-Host "  2. Copy the command shown" -ForegroundColor White
Write-Host "  3. SSH into each Pi (you'll need password or existing key)" -ForegroundColor White
Write-Host "  4. Run the command on each Pi" -ForegroundColor White
Write-Host ""
Write-Host "Option B: Enable Password Authentication" -ForegroundColor Green
Write-Host "  On each Pi (via physical access or existing SSH):" -ForegroundColor White
Write-Host "    sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config" -ForegroundColor Yellow
Write-Host "    sudo systemctl restart ssh" -ForegroundColor Yellow
Write-Host ""

Write-Host "Step 3: Quick Test" -ForegroundColor Green
Write-Host "-----------------" -ForegroundColor Green
Write-Host "After fixing authentication, test with:" -ForegroundColor Yellow
Write-Host "  .\connect-ssh.ps1 1  # Connect to Pi 1 via Ethernet" -ForegroundColor White
Write-Host "  .\connect-ssh.ps1 2  # Connect to Pi 2 via Ethernet" -ForegroundColor White
Write-Host ""

Write-Host "Step 4: Enable Telnet" -ForegroundColor Green
Write-Host "---------------------" -ForegroundColor Green
Write-Host "Once SSH is working, enable telnet with:" -ForegroundColor Yellow
Write-Host "  .\enable-telnet-remote.ps1" -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "✓ Removed old host keys from known_hosts" -ForegroundColor Green
Write-Host "⚠ SSH authentication still needs to be configured" -ForegroundColor Yellow
Write-Host "  - Either add SSH keys (Option A)" -ForegroundColor White
Write-Host "  - Or enable password auth (Option B)" -ForegroundColor White
Write-Host ""
