# Build MAUI project
# Get the script directory and find the MAUI project
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = if (Test-Path (Join-Path $scriptDir "RaspberryPiManager\RaspberryPiManager.csproj")) {
    Join-Path $scriptDir "RaspberryPiManager"
} elseif (Test-Path "RaspberryPiManager.csproj") {
    $PWD
} else {
    "D:\Nuxt Projects\dockerlabs\RaspberryPiManager"
}

Set-Location $projectRoot

Write-Host "=== Building MAUI Project ===" -ForegroundColor Cyan
Write-Host "Project: $projectRoot" -ForegroundColor Yellow
Write-Host ""

dotnet build -f net9.0-windows10.0.19041.0 -c Debug --verbosity detailed
