# Build MAUI project (from MAUI directory)
Write-Host "=== Building MAUI Project ===" -ForegroundColor Cyan
Write-Host "Project: $(Get-Location)" -ForegroundColor Yellow
Write-Host ""

dotnet build -f net9.0-windows10.0.19041.0 -c Debug --verbosity detailed
