# Get network IP addresses for accessing the web server
Write-Host "=== Network IP Addresses ===" -ForegroundColor Cyan
Write-Host ""

# Get all network adapters with IPv4 addresses
$adapters = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike "127.*" -and $_.IPAddress -notlike "169.254.*" } | Select-Object IPAddress, InterfaceAlias

if ($adapters) {
    Write-Host "Your computer can be accessed via these IP addresses:" -ForegroundColor Green
    Write-Host ""
    foreach ($adapter in $adapters) {
        Write-Host "  http://$($adapter.IPAddress):3000" -ForegroundColor White
        Write-Host "    (Interface: $($adapter.InterfaceAlias))" -ForegroundColor Gray
    }
    Write-Host ""
    Write-Host "Also accessible via:" -ForegroundColor Yellow
    Write-Host "  http://localhost:3000" -ForegroundColor White
    Write-Host "  http://127.0.0.1:3000" -ForegroundColor White
} else {
    Write-Host "No network adapters found." -ForegroundColor Red
}

Write-Host ""
Write-Host "Note: Make sure Windows Firewall allows connections on port 3000" -ForegroundColor Yellow
