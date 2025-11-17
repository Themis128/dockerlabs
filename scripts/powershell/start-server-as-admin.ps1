# Start the web GUI server as Administrator
# This is required for SD card formatting operations on Windows

Write-Host "=== Starting Raspberry Pi Manager Web GUI as Administrator ===" -ForegroundColor Cyan
Write-Host ""
Write-Host "⚠️  Administrator privileges are required for SD card formatting operations." -ForegroundColor Yellow
Write-Host ""

# Check if already running as admin
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script needs to be run as Administrator." -ForegroundColor Red
    Write-Host ""
    Write-Host "To run as Administrator:" -ForegroundColor Yellow
    Write-Host "  1. Right-click on this PowerShell window" -ForegroundColor White
    Write-Host "  2. Select 'Run as administrator'" -ForegroundColor White
    Write-Host "  3. Or, right-click this script file and select 'Run with PowerShell' as Administrator" -ForegroundColor White
    Write-Host ""
    Write-Host "Alternatively, you can start the server normally (without admin) but" -ForegroundColor Yellow
    Write-Host "SD card formatting will not work. Other features will still function." -ForegroundColor Yellow
    Write-Host ""
    pause
    exit 1
}

Write-Host "✓ Running with Administrator privileges" -ForegroundColor Green
Write-Host ""

# Check if server is already running
$port = 3000
$existingConnection = Get-NetTCPConnection -LocalPort $port -ErrorAction SilentlyContinue

if ($existingConnection) {
    Write-Host "⚠ Server is already running on port $port" -ForegroundColor Yellow
    Write-Host ""
    $response = Read-Host "Do you want to stop it and start a new one? (y/n)"
    if ($response -eq 'y') {
        $processIds = $existingConnection | Select-Object -ExpandProperty OwningProcess -Unique
        foreach ($processId in $processIds) {
            $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
            if ($process -and $process.ProcessName -eq "python") {
                Write-Host "Stopping existing server (PID: $processId)..." -ForegroundColor Yellow
                Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
            }
        }
        Start-Sleep -Seconds 2
        Write-Host "Server stopped." -ForegroundColor Green
        Write-Host ""
    } else {
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
    Write-Host "✓ SD card formatting will work with Administrator privileges" -ForegroundColor Green
    Write-Host ""

    python $serverPath
} else {
    Write-Host "Error: Server file not found at: $serverPath" -ForegroundColor Red
    Write-Host "Make sure you're in the project root directory." -ForegroundColor Yellow
}
