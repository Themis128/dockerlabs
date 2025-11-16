# Quick test to see if application starts and shows console
Write-Host "Testing application startup..." -ForegroundColor Cyan

$exePath = "bin\Debug\net9.0-windows10.0.19041.0\win10-x64\RaspberryPiManager.exe"

if (-not (Test-Path $exePath)) {
    Write-Host "Executable not found. Building first..." -ForegroundColor Yellow
    dotnet build -f net9.0-windows10.0.19041.0 -c Debug
}

Write-Host "Starting application: $exePath" -ForegroundColor Green
Write-Host "Look for:" -ForegroundColor Yellow
Write-Host "  1. A console window with startup messages" -ForegroundColor White
Write-Host "  2. The main application window" -ForegroundColor White
Write-Host ""

# Start process and show info
$process = Start-Process -FilePath $exePath -PassThru

Start-Sleep -Seconds 2

if ($process.HasExited) {
    Write-Host "ERROR: Application exited immediately with code: $($process.ExitCode)" -ForegroundColor Red
    Write-Host "This suggests the application crashed on startup." -ForegroundColor Red
} else {
    Write-Host "Application is running (PID: $($process.Id))" -ForegroundColor Green
    Write-Host "Check for windows. The application should be visible." -ForegroundColor Green
    Write-Host ""
    Write-Host "Press Enter to check if process is still running..." -ForegroundColor Yellow
    Read-Host

    if (Get-Process -Id $process.Id -ErrorAction SilentlyContinue) {
        Write-Host "Application is still running." -ForegroundColor Green
    } else {
        Write-Host "Application has exited." -ForegroundColor Yellow
    }
}
