# Script to copy SSH public key to USB drive for manual transfer
# Usage: .\copy-key-to-usb.ps1 [drive-letter]

param(
    [Parameter(Mandatory=$false)]
    [string]$DriveLetter = ""
)

$sshPubKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "ERROR: SSH public key not found at $sshPubKeyPath" -ForegroundColor Red
    Write-Host "Generate one first with: ssh-keygen -t rsa -b 4096" -ForegroundColor Yellow
    exit 1
}

# If no drive letter specified, list available drives
if ([string]::IsNullOrEmpty($DriveLetter)) {
    Write-Host "Available removable drives:" -ForegroundColor Cyan
    $removableDrives = Get-PSDrive -PSProvider FileSystem | Where-Object {
        (Get-Volume $_.Name -ErrorAction SilentlyContinue).DriveType -eq 'Removable'
    }

    if ($removableDrives.Count -eq 0) {
        Write-Host "No removable drives found. Please insert a USB drive." -ForegroundColor Yellow
        exit 1
    }

    foreach ($drive in $removableDrives) {
        Write-Host "  $($drive.Name): - $($drive.Description)" -ForegroundColor White
    }

    $DriveLetter = Read-Host "Enter drive letter (e.g., E)"
}

$usbPath = "${DriveLetter}:\"

if (-not (Test-Path $usbPath)) {
    Write-Host "ERROR: Drive $DriveLetter not found" -ForegroundColor Red
    exit 1
}

Write-Host "Copying SSH public key to USB drive..." -ForegroundColor Green
Copy-Item $sshPubKeyPath "$usbPath\id_rsa.pub" -Force

# Also copy the enable password auth script
if (Test-Path ".\enable-password-auth.sh") {
    Copy-Item ".\enable-password-auth.sh" "$usbPath\" -Force
    Write-Host "Also copied enable-password-auth.sh" -ForegroundColor Green
}

Write-Host ""
Write-Host "✓ Files copied to $usbPath" -ForegroundColor Green
Write-Host ""
Write-Host "On the Raspberry Pi:" -ForegroundColor Cyan
Write-Host "1. Insert USB drive" -ForegroundColor White
Write-Host "2. Mount it (usually auto-mounted)" -ForegroundColor White
Write-Host "3. Run these commands:" -ForegroundColor White
Write-Host "   mkdir -p ~/.ssh" -ForegroundColor Yellow
Write-Host "   chmod 700 ~/.ssh" -ForegroundColor Yellow
Write-Host "   cat /media/pi/*/id_rsa.pub >> ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host "   chmod 600 ~/.ssh/authorized_keys" -ForegroundColor Yellow
Write-Host ""
Write-Host "Or to enable password auth:" -ForegroundColor Cyan
Write-Host "   bash /media/pi/*/enable-password-auth.sh" -ForegroundColor Yellow
