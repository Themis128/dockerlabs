# Start web server in verbose mode with debugging - Network Access Enabled
$env:VERBOSE = "true"
$env:PYTHONUNBUFFERED = "1"
$env:HOST = "0.0.0.0"  # Bind to all network interfaces

Write-Host "=== Raspberry Pi Manager Web Server (Network Mode) ===" -ForegroundColor Cyan
Write-Host "Starting server with verbose logging and network broadcasting..." -ForegroundColor Green
Write-Host ""

# Get network IP addresses
Write-Host "Detecting network IP addresses..." -ForegroundColor Yellow
try {
    $networkIPs = Get-NetIPAddress -AddressFamily IPv4 | Where-Object {
        $_.IPAddress -notlike '127.*' -and
        $_.IPAddress -notlike '169.254.*' -and
        $_.IPAddress -notlike '0.0.0.0'
    } | Select-Object -ExpandProperty IPAddress

    if ($networkIPs) {
        Write-Host "`nServer will be accessible at:" -ForegroundColor Green
        Write-Host "  Local:    http://localhost:3000" -ForegroundColor White
        Write-Host "  Local:    http://127.0.0.1:3000" -ForegroundColor White
        foreach ($ip in $networkIPs) {
            Write-Host "  Network:  http://$ip:3000" -ForegroundColor Cyan
        }
    } else {
        Write-Host "  Local:    http://localhost:3000" -ForegroundColor White
        Write-Host "  (Network IP detection failed - server still accessible on network)" -ForegroundColor Yellow
    }
} catch {
    Write-Host "  Local:    http://localhost:3000" -ForegroundColor White
    Write-Host "  (Network IP detection failed - server still accessible on network)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Server is binding to 0.0.0.0 (all network interfaces)" -ForegroundColor Green
Write-Host "This allows access from other devices on your network" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host ""

# Get current directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptDir

# Start the server
python web-gui/server.py
