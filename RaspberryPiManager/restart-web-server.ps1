# Restart the web server (from MAUI directory)
# Navigate to root and restart server
$rootDir = Split-Path -Parent $PSScriptRoot
Set-Location $rootDir

Write-Host "=== Restarting Web Server ===" -ForegroundColor Cyan
Write-Host ""

$port = 3000

# Find and stop any process using port 3000
$connection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connection) {
    $processId = $connection.OwningProcess
    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
    if ($process) {
        Write-Host "Stopping existing server (PID: $processId)..." -ForegroundColor Yellow
        Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 2
        Write-Host "Server stopped." -ForegroundColor Green
    }
}

Write-Host "Starting new server..." -ForegroundColor Green
Write-Host ""

# Start the server
$serverPath = "web-gui\server.py"
if (Test-Path $serverPath) {
    python $serverPath
} else {
    Write-Host "Error: Server file not found at: $serverPath" -ForegroundColor Red
    Write-Host "Current directory: $(Get-Location)" -ForegroundColor Yellow
}
