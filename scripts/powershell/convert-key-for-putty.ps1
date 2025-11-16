# Convert SSH key to PuTTY format (.ppk)
# Usage: .\convert-key-for-putty.ps1

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Convert SSH Key for PuTTY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
$ppkPath = "$env:USERPROFILE\.ssh\id_rsa.ppk"

# Check if key exists
if (-not (Test-Path $sshKeyPath)) {
    Write-Host "ERROR: SSH private key not found at $sshKeyPath" -ForegroundColor Red
    Write-Host "Generating SSH key..." -ForegroundColor Yellow
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "raspberry-pi-access"

    if (-not (Test-Path $sshKeyPath)) {
        Write-Host "Failed to generate SSH key" -ForegroundColor Red
        exit 1
    }
}

Write-Host "SSH key found: $sshKeyPath" -ForegroundColor Green
Write-Host ""

# Check if PuTTYgen is available
$puttygenPath = Get-Command puttygen -ErrorAction SilentlyContinue

if ($puttygenPath) {
    Write-Host "Found PuTTYgen at: $($puttygenPath.Source)" -ForegroundColor Green
    Write-Host "Converting key to PuTTY format..." -ForegroundColor Yellow

    # Convert using puttygen command line
    & puttygen $sshKeyPath -o $ppkPath -O private

    if (Test-Path $ppkPath) {
        Write-Host "✓ Key converted successfully!" -ForegroundColor Green
        Write-Host "  Saved to: $ppkPath" -ForegroundColor Cyan
        Write-Host ""
        Write-Host "Next steps:" -ForegroundColor Yellow
        Write-Host "  1. Open PuTTY" -ForegroundColor White
        Write-Host "  2. Go to: Connection → SSH → Auth" -ForegroundColor White
        Write-Host "  3. Browse and select: $ppkPath" -ForegroundColor White
        Write-Host "  4. Go back to Session, enter Pi IP (192.168.0.48), and Save" -ForegroundColor White
        Write-Host ""
        Write-Host "Don't forget to add your SSH key to the Pi first!" -ForegroundColor Yellow
        Write-Host "  Run: .\get-pi-command.ps1" -ForegroundColor Cyan
    } else {
        Write-Host "✗ Conversion failed" -ForegroundColor Red
        Write-Host "  Try manual conversion using PuTTYgen GUI" -ForegroundColor Yellow
    }
} else {
    Write-Host "PuTTYgen not found in PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Manual conversion steps:" -ForegroundColor Cyan
    Write-Host "  1. Open PuTTYgen (usually in PuTTY installation folder)" -ForegroundColor White
    Write-Host "  2. Click 'Load'" -ForegroundColor White
    Write-Host "  3. Navigate to: $sshKeyPath" -ForegroundColor White
    Write-Host "     (Change file filter to 'All Files' to see .ssh folder)" -ForegroundColor Gray
    Write-Host "  4. Click 'Save private key' and save as: $ppkPath" -ForegroundColor White
    Write-Host ""
    Write-Host "Or install PuTTY tools and add to PATH:" -ForegroundColor Yellow
    Write-Host "  Download from: https://www.chiark.greenend.org.uk/~sgtatham/putty/" -ForegroundColor Cyan
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Important: Add Key to Pi First!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Before using PuTTY, you must add your SSH key to the Pi:" -ForegroundColor Yellow
Write-Host "  1. Run: .\get-pi-command.ps1" -ForegroundColor White
Write-Host "  2. Connect to Pi physically (keyboard/monitor)" -ForegroundColor White
Write-Host "  3. Run the command shown on the Pi" -ForegroundColor White
Write-Host ""
