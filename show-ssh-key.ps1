# Display SSH public key for manual copying to Raspberry Pis
# Usage: .\show-ssh-key.ps1

$sshPubKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "ERROR: SSH public key not found!" -ForegroundColor Red
    Write-Host "Generating SSH key..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f "$env:USERPROFILE\.ssh\id_rsa" -N '""' -C "raspberry-pi-access"

    if (-not (Test-Path $sshPubKeyPath)) {
        Write-Host "Failed to generate SSH key" -ForegroundColor Red
        exit 1
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Your SSH Public Key" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
$publicKey = Get-Content $sshPubKeyPath
Write-Host $publicKey -ForegroundColor Yellow
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Instructions to Add Key to Raspberry Pi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You need PHYSICAL ACCESS to the Raspberry Pi to add this key." -ForegroundColor Yellow
Write-Host ""
Write-Host "Method 1: Direct Copy (if you have keyboard/monitor)" -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor Green
Write-Host "1. Connect keyboard and monitor to the Pi" -ForegroundColor White
Write-Host "2. Log in to the Pi" -ForegroundColor White
Write-Host "3. Run these commands:" -ForegroundColor White
Write-Host ""
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Cyan
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Cyan
Write-Host "   nano ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "4. Paste the key above (entire line), then:" -ForegroundColor White
Write-Host "   - Press Ctrl+X to exit" -ForegroundColor Gray
Write-Host "   - Press Y to save" -ForegroundColor Gray
Write-Host "   - Press Enter to confirm" -ForegroundColor Gray
Write-Host ""
Write-Host "5. Set permissions:" -ForegroundColor White
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "Method 2: One-Line Command (copy entire key first)" -ForegroundColor Green
Write-Host "----------------------------------------------------" -ForegroundColor Green
Write-Host "Run this on the Pi (replace KEY with your key above):" -ForegroundColor White
Write-Host ""
Write-Host "   echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 700 ~/.ssh && chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "Method 3: USB Drive" -ForegroundColor Green
Write-Host "-------------------" -ForegroundColor Green
Write-Host "1. Run: .\copy-key-to-usb.ps1" -ForegroundColor Cyan
Write-Host "2. Insert USB into Pi" -ForegroundColor White
Write-Host "3. On Pi, run:" -ForegroundColor White
Write-Host "   mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor Cyan
Write-Host "   cat /media/pi/*/id_rsa.pub >> ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After Adding Key" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Test connection:" -ForegroundColor White
Write-Host "  .\connect-ssh.ps1 1  # For 192.168.0.48" -ForegroundColor Yellow
Write-Host "  .\connect-ssh.ps1 2  # For 192.168.0.41 (WiFi Pi 2)" -ForegroundColor Yellow
