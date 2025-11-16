# Stop and restart the web server
Write-Host "=== Restarting Web Server ===" -ForegroundColor Cyan
Write-Host ""

$port = 3000

# Find and stop any process using port 3000
$connections = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue
if ($connections) {
    $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
    foreach ($processId in $processIds) {
        $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
        if ($process -and $process.ProcessName -eq "python") {
            Write-Host "Stopping existing server (PID: $processId)..." -ForegroundColor Yellow
            Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
        }
    }
    if ($processIds) {
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
}
