# Script to help find and bring the application window to front
Write-Host "=== Finding Raspberry Pi Manager Window ===" -ForegroundColor Cyan
Write-Host ""

$processName = "RaspberryPiManager"
$processes = Get-Process -Name $processName -ErrorAction SilentlyContinue

if ($processes) {
    Write-Host "Found $($processes.Count) running instance(s):" -ForegroundColor Green
    foreach ($proc in $processes) {
        Write-Host "  PID: $($proc.Id) - Started: $($proc.StartTime)" -ForegroundColor Yellow
    }
    Write-Host ""
    Write-Host "The application window should be visible." -ForegroundColor Green
    Write-Host ""
    Write-Host "If you don't see it, try:" -ForegroundColor Yellow
    Write-Host "  1. Press Alt+Tab to cycle through windows" -ForegroundColor White
    Write-Host "  2. Check the taskbar for the application icon" -ForegroundColor White
    Write-Host "  3. Press Windows+Tab to see all windows" -ForegroundColor White
    Write-Host "  4. Look for a window titled 'Raspberry Pi Manager'" -ForegroundColor White
} else {
    Write-Host "Application is not running." -ForegroundColor Red
    Write-Host "Run: .\run-dev.ps1" -ForegroundColor Yellow
}
