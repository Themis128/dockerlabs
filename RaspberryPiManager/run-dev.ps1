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
    Write-Host "Press Ctrl+C to stop the application" -ForegroundColor Yellow
    Write-Host ""
    & $exePath
} else {
    Write-Host "Executable not found at: $exePath" -ForegroundColor Red
    Write-Host "Trying dotnet run instead..." -ForegroundColor Yellow
    dotnet run -f net9.0-windows10.0.19041.0 -c Debug --verbosity detailed
}
