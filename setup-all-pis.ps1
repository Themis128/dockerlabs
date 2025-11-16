# Comprehensive setup script for all Raspberry Pis
# Sets up SSH keys, opens ports, and enables telnet
# Prioritizes Ethernet connections
# Usage: .\setup-all-pis.ps1 [username]

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Complete Raspberry Pi Setup" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "This script will:" -ForegroundColor Yellow
Write-Host "  1. Test connectivity to all Pis" -ForegroundColor White
Write-Host "  2. Show SSH key setup instructions" -ForegroundColor White
Write-Host "  3. Provide commands to open ports 22 and 23" -ForegroundColor White
Write-Host "  4. Provide commands to enable telnet" -ForegroundColor White
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

# Test all connections
Write-Host "Step 1: Testing Connectivity" -ForegroundColor Green
Write-Host "----------------------------" -ForegroundColor Green
& pwsh -ExecutionPolicy Bypass -File ".\test-connections.ps1"

Write-Host ""
Write-Host "Step 2: SSH Key Setup" -ForegroundColor Green
Write-Host "---------------------" -ForegroundColor Green
Write-Host "If you need to add SSH keys, run:" -ForegroundColor Yellow
Write-Host "  .\get-pi-command.ps1" -ForegroundColor Cyan
Write-Host ""
Write-Host "This will show you the exact command to run on each Pi." -ForegroundColor White
Write-Host ""

# Show which Pis need setup
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value

Write-Host "Step 3: Setup Commands for Each Pi" -ForegroundColor Green
Write-Host "-----------------------------------" -ForegroundColor Green
Write-Host ""

Write-Host "ETHERNET PIs (Priority):" -ForegroundColor Cyan
Write-Host "=======================" -ForegroundColor Cyan
foreach ($pi in $ethernetPis) {
    Write-Host ""
    Write-Host "Pi: $($pi.name) - $($pi.ip)" -ForegroundColor Yellow
    Write-Host "  Connect: .\connect-ssh.ps1 $($ethernetPis.IndexOf($pi) + 1) -ConnectionType ethernet" -ForegroundColor White
    Write-Host "  Or: ssh $Username@$($pi.ip)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  On the Pi, run these commands:" -ForegroundColor Cyan
    Write-Host "    # Open ports 22 and 23" -ForegroundColor Gray
    Write-Host "    sudo ufw allow 22/tcp && sudo ufw allow 23/tcp && sudo ufw enable" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    # Enable telnet" -ForegroundColor Gray
    Write-Host "    sudo apt-get update -y" -ForegroundColor Yellow
    Write-Host "    sudo apt-get install -y telnetd inetutils-inetd" -ForegroundColor Yellow
    Write-Host "    sudo systemctl enable inetd && sudo systemctl start inetd" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "WIFI PIS (Fallback):" -ForegroundColor Cyan
Write-Host "===================" -ForegroundColor Cyan
foreach ($pi in $wifiPis) {
    Write-Host ""
    Write-Host "Pi: $($pi.name) - $($pi.ip)" -ForegroundColor Yellow
    Write-Host "  Connect: .\connect-ssh.ps1 $($wifiPis.IndexOf($pi) + 1) -ConnectionType wifi" -ForegroundColor White
    Write-Host "  Or: ssh $Username@$($pi.ip)" -ForegroundColor Gray
    Write-Host ""
    Write-Host "  On the Pi, run these commands:" -ForegroundColor Cyan
    Write-Host "    # Open ports 22 and 23" -ForegroundColor Gray
    Write-Host "    sudo ufw allow 22/tcp && sudo ufw allow 23/tcp && sudo ufw enable" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "    # Enable telnet" -ForegroundColor Gray
    Write-Host "    sudo apt-get update -y" -ForegroundColor Yellow
    Write-Host "    sudo apt-get install -y telnetd inetutils-inetd" -ForegroundColor Yellow
    Write-Host "    sudo systemctl enable inetd && sudo systemctl start inetd" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Quick Reference" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "SSH Connection (Ethernet first):" -ForegroundColor Yellow
Write-Host "  .\connect-ssh.ps1 1  # Pi 1 via Ethernet" -ForegroundColor White
Write-Host "  .\connect-ssh.ps1 2  # Pi 2 via Ethernet" -ForegroundColor White
Write-Host ""
Write-Host "Telnet Connection (Ethernet first):" -ForegroundColor Yellow
Write-Host "  .\connect-telnet.ps1 1  # Pi 1 via Ethernet" -ForegroundColor White
Write-Host "  .\connect-telnet.ps1 2  # Pi 2 via Ethernet" -ForegroundColor White
Write-Host ""
Write-Host "Test All Connections:" -ForegroundColor Yellow
Write-Host "  .\test-connections.ps1" -ForegroundColor White
Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
