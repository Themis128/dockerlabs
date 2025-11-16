# Check if the web server is running
Write-Host "=== Checking Web Server Status ===" -ForegroundColor Cyan
Write-Host ""

$port = 3000
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($connection) {
    Write-Host "✓ Server is running on port $port" -ForegroundColor Green
    Write-Host "  State: $($connection.State)" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Open your browser and go to:" -ForegroundColor Cyan
    Write-Host "  http://localhost:$port" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  http://127.0.0.1:$port" -ForegroundColor White
} else {
    Write-Host "✗ Server is NOT running on port $port" -ForegroundColor Red
    Write-Host ""
    Write-Host "To start the server, run:" -ForegroundColor Yellow
    Write-Host "  .\start-web-gui.ps1" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  npm run start:server" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  python web-gui/server.py" -ForegroundColor White
}
