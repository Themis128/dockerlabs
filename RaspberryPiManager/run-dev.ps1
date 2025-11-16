# Run MAUI dev server with verbose logging (from MAUI directory)
Write-Host "=== Starting MAUI Dev Server with Verbose Logging ===" -ForegroundColor Cyan
Write-Host "Project: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

# Build first to ensure we have the latest version
Write-Host "Building project..." -ForegroundColor Yellow
dotnet build -f net9.0-windows10.0.19041.0 -c Debug --verbosity minimal
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "Build successful. Starting application..." -ForegroundColor Green
Write-Host ""

# Run the application directly - this will show console output
$exePath = "bin\Debug\net9.0-windows10.0.19041.0\win10-x64\RaspberryPiManager.exe"
if (Test-Path $exePath) {
    Write-Host "Running: $exePath" -ForegroundColor Cyan
    Write-Host "The application should open in a separate window." -ForegroundColor Yellow
    Write-Host "A console window should also appear with debug output." -ForegroundColor Yellow
    Write-Host "Waiting for application to start..." -ForegroundColor Yellow
    Write-Host ""

    # Start the process and capture it
    $process = Start-Process -FilePath $exePath -PassThru -NoNewWindow

    Write-Host "Application started (PID: $($process.Id))" -ForegroundColor Green
    Write-Host "Process Name: $($process.ProcessName)" -ForegroundColor Green
    Write-Host ""
    Write-Host "The application is running. Check for:" -ForegroundColor Cyan
    Write-Host "  1. Main application window" -ForegroundColor White
    Write-Host "  2. Console window with debug output" -ForegroundColor White
    Write-Host ""
    Write-Host "Press Ctrl+C to stop monitoring (application will continue running)" -ForegroundColor Yellow
    Write-Host "Or close the application window to exit." -ForegroundColor Yellow
    Write-Host ""

    # Wait for the process to exit, but allow interruption
    try {
        $process.WaitForExit()
        Write-Host "Application has exited." -ForegroundColor Yellow
    } catch {
        Write-Host "Monitoring stopped. Application may still be running." -ForegroundColor Yellow
    }
} else {
    Write-Host "Executable not found at: $exePath" -ForegroundColor Red
    Write-Host "Trying dotnet run instead..." -ForegroundColor Yellow
    dotnet run -f net9.0-windows10.0.19041.0 -c Debug --verbosity detailed
}
