# Comprehensive SSH Access Setup Script
# Provides multiple methods to set up SSH access to Raspberry Pis
# Usage: .\setup-ssh-access.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH Access Setup for Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

# Get SSH public key
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

$publicKey = Get-Content $sshPubKeyPath

Write-Host "Your SSH Public Key:" -ForegroundColor Green
Write-Host $publicKey -ForegroundColor Yellow
Write-Host ""

# Get all Pis
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
$allPis = $ethernetPis + $wifiPis

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Method 1: Physical Access (Recommended)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "For each Pi, connect keyboard/monitor and run:" -ForegroundColor Yellow
Write-Host ""

$oneLineCommand = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$publicKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key added successfully!'"

Write-Host $oneLineCommand -ForegroundColor Green
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Method 2: USB Drive Transfer" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for USB drives
$removableDrives = Get-PSDrive -PSProvider FileSystem | Where-Object {
    try {
        (Get-Volume $_.Name -ErrorAction SilentlyContinue).DriveType -eq 'Removable'
    } catch {
        $false
    }
}

if ($removableDrives.Count -gt 0) {
    Write-Host "Found removable drive(s):" -ForegroundColor Green
    foreach ($drive in $removableDrives) {
        Write-Host "  $($drive.Name):" -ForegroundColor White
    }
    Write-Host ""

    $useUSB = Read-Host "Copy SSH key to USB drive? (y/N)"
    if ($useUSB -eq "y" -or $useUSB -eq "Y") {
        if ($removableDrives.Count -eq 1) {
            $driveLetter = $removableDrives[0].Name
        } else {
            $driveLetter = Read-Host "Enter drive letter (e.g., E)"
        }

        $usbPath = "${driveLetter}:\"
        if (Test-Path $usbPath) {
            # Copy key file
            Copy-Item $sshPubKeyPath "$usbPath\id_rsa.pub" -Force
            Write-Host "✓ SSH key copied to $usbPath\id_rsa.pub" -ForegroundColor Green

            # Create setup script for Pi
            $piScript = @"
#!/bin/bash
# SSH Key Setup Script for Raspberry Pi
# Run this on the Pi after inserting USB drive

echo "Setting up SSH key from USB drive..."

# Find USB drive
USB_PATH=`$(find /media -name "id_rsa.pub" 2>/dev/null | head -1)
if [ -z "`$USB_PATH" ]; then
    USB_PATH=`$(find /mnt -name "id_rsa.pub" 2>/dev/null | head -1)
fi

if [ -z "`$USB_PATH" ]; then
    echo "ERROR: Could not find id_rsa.pub on USB drive"
    echo "Please check USB drive is mounted"
    exit 1
fi

echo "Found key at: `$USB_PATH"

# Setup SSH directory
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add key
cat `$USB_PATH >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys

echo "✓ SSH key added successfully!"
echo "You can now connect from Windows without a password."
"@

            $piScript | Out-File -FilePath "$usbPath\setup-ssh-key.sh" -Encoding ASCII
            Write-Host "✓ Setup script created at $usbPath\setup-ssh-key.sh" -ForegroundColor Green
            Write-Host ""
            Write-Host "On the Pi, after inserting USB:" -ForegroundColor Cyan
            Write-Host "  bash /media/pi/*/setup-ssh-key.sh" -ForegroundColor Yellow
            Write-Host "  # or find the USB mount point and run:" -ForegroundColor Gray
            Write-Host "  bash <USB_MOUNT>/setup-ssh-key.sh" -ForegroundColor Yellow
        }
    }
} else {
    Write-Host "No removable drives found." -ForegroundColor Yellow
    Write-Host "To use USB method:" -ForegroundColor White
    Write-Host "  1. Insert USB drive" -ForegroundColor White
    Write-Host "  2. Run: .\copy-key-to-usb.ps1" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Method 3: Enable Password Authentication" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If you have physical access, you can enable password auth instead:" -ForegroundColor Yellow
Write-Host ""
Write-Host "On each Pi, run:" -ForegroundColor White
Write-Host "  sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config" -ForegroundColor Green
Write-Host "  sudo systemctl restart ssh" -ForegroundColor Green
Write-Host ""
Write-Host "Then you can connect with password and add SSH keys later." -ForegroundColor White
Write-Host ""

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Method 4: Try Existing Access" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Testing if any Pi already has your SSH key..." -ForegroundColor Yellow
Write-Host ""

foreach ($pi in $allPis) {
    Write-Host "Testing: $($pi.name) ($($pi.ip))..." -ForegroundColor Gray

    # Test SSH connection
    $testResult = ssh -o ConnectTimeout=5 -o StrictHostKeyChecking=no -o BatchMode=yes "pi@$($pi.ip)" "echo 'test'" 2>&1

    if ($LASTEXITCODE -eq 0) {
        Write-Host "  ✓ SSH key already works! Adding key to other Pis..." -ForegroundColor Green

        # Try to add key to other Pis via this working connection
        foreach ($otherPi in $allPis) {
            if ($otherPi.ip -ne $pi.ip) {
                Write-Host "    Attempting to add key to $($otherPi.name) ($($otherPi.ip))..." -ForegroundColor Gray
                # Escape the public key for use in nested command
                $escapedKey = $publicKey -replace "'", "''"
                $addKeyCmd = "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$escapedKey' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
                $result = ssh -o ConnectTimeout=5 "pi@$($pi.ip)" "ssh pi@$($otherPi.ip) `"$addKeyCmd`"" 2>&1
                if ($LASTEXITCODE -eq 0) {
                    Write-Host "      ✓ Key added to $($otherPi.name)" -ForegroundColor Green
                } else {
                    Write-Host "      ⚠ Could not add key to $($otherPi.name) (may need password auth)" -ForegroundColor Yellow
                }
            }
        }
        break
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Next Steps" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "After adding SSH keys, test connection:" -ForegroundColor Yellow
Write-Host "  .\connect-ssh.ps1 1  # Pi 1 via Ethernet" -ForegroundColor White
Write-Host "  .\connect-ssh.ps1 2  # Pi 2 via Ethernet" -ForegroundColor White
Write-Host ""
Write-Host "Then enable telnet:" -ForegroundColor Yellow
Write-Host "  .\enable-telnet-remote.ps1" -ForegroundColor White
Write-Host ""
