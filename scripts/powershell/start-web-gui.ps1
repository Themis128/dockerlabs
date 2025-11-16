# Start the web GUI server
Write-Host "=== Starting Raspberry Pi Manager Web GUI ===" -ForegroundColor Cyan
Write-Host ""

# Check if server is already running
$port = 3000
$existingConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($existingConnection) {
    Write-Host "⚠ Server is already running on port $port" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "The server should be accessible at:" -ForegroundColor Cyan
    Write-Host "  http://localhost:$port" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  http://127.0.0.1:$port" -ForegroundColor White
    Write-Host ""
    Write-Host "If you can't access it, try:" -ForegroundColor Yellow
    Write-Host "  1. Check if another process is using port $port" -ForegroundColor White
    Write-Host "  2. Try stopping and restarting the server" -ForegroundColor White
    Write-Host "  3. Check Windows Firewall settings" -ForegroundColor White
    Write-Host ""
    $response = Read-Host "Do you want to start a new server anyway? (y/n)"
    if ($response -ne 'y') {
        exit
    }
}

$serverPath = "web-gui\server.py"

if (Test-Path $serverPath) {
    Write-Host "Starting web server on http://localhost:$port" -ForegroundColor Green
    Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Once started, open your browser and navigate to:" -ForegroundColor Cyan
    Write-Host "  http://localhost:$port" -ForegroundColor White
    Write-Host "  or" -ForegroundColor White
    Write-Host "  http://127.0.0.1:$port" -ForegroundColor White
    Write-Host ""

    python $serverPath
} else {
    Write-Host "Error: Server file not found at: $serverPath" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
}
