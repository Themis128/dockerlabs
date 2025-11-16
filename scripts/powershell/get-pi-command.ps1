# Generate one-line command to add SSH key to Raspberry Pi
# Usage: .\get-pi-command.ps1

$sshPubKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "ERROR: SSH public key not found!" -ForegroundColor Red
    Write-Host "Run: .\show-ssh-key.ps1 first" -ForegroundColor Yellow
    exit 1
}

$publicKey = Get-Content $sshPubKeyPath

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "One-Line Command for Raspberry Pi" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Copy and paste this ENTIRE command on the Pi:" -ForegroundColor Yellow
Write-Host ""
Write-Host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key added successfully!'" -ForegroundColor Green
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Or use this shorter version:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Cyan
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After running on the Pi, test from Windows:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  .\connect-ssh.ps1 1  # For 192.168.0.48" -ForegroundColor Yellow
Write-Host "  .\connect-ssh.ps1 2  # For 192.168.0.41" -ForegroundColor Yellow
