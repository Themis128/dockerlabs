# List all Raspberry Pis with their connection information
# Usage: .\list-pis.ps1

# Load configuration
$config = Get-Content -Path "pi-config.json" | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Raspberry Pi Network Configuration" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Display Ethernet connections
Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
$counter = 1
foreach ($pi in $ethernetPis) {
    Write-Host "  [$counter] $($pi.name)" -ForegroundColor Yellow
    Write-Host "      IP: $($pi.ip)" -ForegroundColor White
    Write-Host "      MAC: $($pi.mac)" -ForegroundColor White
    Write-Host "      Description: $($pi.description)" -ForegroundColor Gray
    Write-Host ""
    $counter++
}

# Display WiFi connections
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
$counter = 1
foreach ($pi in $wifiPis) {
    Write-Host "  [$counter] $($pi.name)" -ForegroundColor Yellow
    Write-Host "      IP: $($pi.ip)" -ForegroundColor White
    Write-Host "      MAC: $($pi.mac)" -ForegroundColor White
    Write-Host "      Description: $($pi.description)" -ForegroundColor Gray
    Write-Host ""
    $counter++
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Quick Connect Commands (Ethernet First):" -ForegroundColor Cyan
Write-Host "  SSH Pi 1 (Ethernet preferred):  .\connect-ssh.ps1 1" -ForegroundColor Yellow
Write-Host "  SSH Pi 2 (Ethernet preferred):  .\connect-ssh.ps1 2" -ForegroundColor Yellow
Write-Host "  Telnet Pi 1 (Ethernet preferred): .\connect-telnet.ps1 1" -ForegroundColor Yellow
Write-Host "  Telnet Pi 2 (Ethernet preferred): .\connect-telnet.ps1 2" -ForegroundColor Yellow
Write-Host ""
Write-Host "Force Connection Type:" -ForegroundColor Cyan
Write-Host "  SSH Ethernet:  .\connect-ssh.ps1 1 -ConnectionType ethernet" -ForegroundColor Gray
Write-Host "  SSH WiFi:      .\connect-ssh.ps1 1 -ConnectionType wifi" -ForegroundColor Gray
Write-Host "  Telnet Ethernet: .\connect-telnet.ps1 1 -ConnectionType ethernet" -ForegroundColor Gray
Write-Host "  Telnet WiFi:     .\connect-telnet.ps1 1 -ConnectionType wifi" -ForegroundColor Gray
