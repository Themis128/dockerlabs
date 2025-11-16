# Quick reference script showing what needs to be done on each Pi
# This is a reference guide, not an executable script

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Fix Guide for Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "CURRENT STATUS:" -ForegroundColor Yellow
Write-Host "---------------" -ForegroundColor Yellow
Write-Host "192.168.0.48 (Ethernet Pi 1):" -ForegroundColor White
Write-Host "  ✓ Reachable via ping" -ForegroundColor Green
Write-Host "  ✓ SSH port 22 open" -ForegroundColor Green
Write-Host "  ✗ Password auth disabled (needs physical access)" -ForegroundColor Red
Write-Host ""
Write-Host "192.168.0.16 (Ethernet Pi 2):" -ForegroundColor White
Write-Host "  ✓ Reachable via ping" -ForegroundColor Green
Write-Host "  ✗ SSH not running (needs physical access)" -ForegroundColor Red
Write-Host ""
Write-Host "192.168.0.17 (WiFi Pi 1):" -ForegroundColor White
Write-Host "  ✓ Reachable via ping" -ForegroundColor Green
Write-Host "  ✗ SSH not running (needs physical access)" -ForegroundColor Red
Write-Host ""
Write-Host "192.168.0.41 (WiFi Pi 2):" -ForegroundColor White
Write-Host "  ✓ Reachable via ping" -ForegroundColor Green
Write-Host "  ✓ SSH port 22 open" -ForegroundColor Green
Write-Host "  ✗ Password auth disabled (needs physical access)" -ForegroundColor Red
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SOLUTION: Physical Access Required" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "For each Pi, you need physical access to:" -ForegroundColor Yellow
Write-Host "1. Enable password authentication, OR" -ForegroundColor White
Write-Host "2. Manually add your SSH public key" -ForegroundColor White
Write-Host ""

Write-Host "QUICK COMMANDS (run on each Pi):" -ForegroundColor Cyan
Write-Host "-------------------------------" -ForegroundColor Cyan
Write-Host ""

Write-Host "Option A: Enable Password Auth (One-liner):" -ForegroundColor Green
Write-Host "  sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && sudo systemctl restart ssh" -ForegroundColor Yellow
Write-Host ""

Write-Host "Option B: Add SSH Key Manually:" -ForegroundColor Green
Write-Host "  1. Get your public key:" -ForegroundColor White
Write-Host "     cat `$env:USERPROFILE\.ssh\id_rsa.pub" -ForegroundColor Cyan
Write-Host "  2. On the Pi, run:" -ForegroundColor White
Write-Host "     mkdir -p ~/.ssh && chmod 700 ~/.ssh" -ForegroundColor Yellow
Write-Host "     nano ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "     # Paste your public key, save (Ctrl+X, Y, Enter)" -ForegroundColor Gray
Write-Host "     chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host ""

Write-Host "Option C: Use USB Drive:" -ForegroundColor Green
Write-Host "  1. Run: .\copy-key-to-usb.ps1" -ForegroundColor Cyan
Write-Host "  2. Insert USB into Pi" -ForegroundColor White
Write-Host "  3. Copy key from USB to Pi" -ForegroundColor White
Write-Host ""

Write-Host "For Pis with SSH not running (192.168.0.16, 192.168.0.17):" -ForegroundColor Yellow
Write-Host "  sudo systemctl enable ssh" -ForegroundColor Cyan
Write-Host "  sudo systemctl start ssh" -ForegroundColor Cyan
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "After Setup:" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Once password auth is enabled, you can:" -ForegroundColor White
Write-Host "  .\connect-ssh.ps1 1  # Connect with password" -ForegroundColor Yellow
Write-Host "  .\setup-ssh-keys.ps1  # Set up keys for passwordless access" -ForegroundColor Yellow
Write-Host "  .\open-ports.ps1      # Open ports 22 and 23" -ForegroundColor Yellow
Write-Host "  .\setup-telnet.ps1   # Enable telnet" -ForegroundColor Yellow
