# PowerShell script to run Playwright tests with sharding support
# This enables horizontal scaling across multiple machines/processes
#
# Usage:
#   .\run-tests-sharded.ps1 -ShardTotal 4
#   .\run-tests-sharded.ps1 -ShardTotal 4 -Shard 1
#   .\run-tests-sharded.ps1 -ShardTotal 4 -Shard 2 -Workers 4

param(
    [Parameter(Mandatory=$false)]
    [int]$ShardTotal = 1,
    
    [Parameter(Mandatory=$false)]
    [int]$Shard = 1,
    
    [Parameter(Mandatory=$false)]
    [int]$Workers = 0,  # 0 means use auto-detection
    
    [Parameter(Mandatory=$false)]
    [switch]$UI,
    
    [Parameter(Mandatory=$false)]
    [switch]$Headed,
    
    [Parameter(Mandatory=$false)]
    [switch]$Debug,
    
    [Parameter(Mandatory=$false)]
    [string]$Project = "",
    
    [Parameter(Mandatory=$false)]
    [string]$TestFile = ""
)

# Set environment variables for sharding
$env:SHARD = $Shard.ToString()
$env:SHARD_TOTAL = $ShardTotal.ToString()

if ($Workers -gt 0) {
    $env:PLAYWRIGHT_WORKERS = $Workers.ToString()
}

Write-Host "🚀 Running Playwright tests with horizontal scaling" -ForegroundColor Cyan
Write-Host "   Shard: $Shard of $ShardTotal" -ForegroundColor Yellow
if ($Workers -gt 0) {
    Write-Host "   Workers: $Workers" -ForegroundColor Yellow
} else {
    Write-Host "   Workers: Auto-detected" -ForegroundColor Yellow
}
Write-Host ""

# Build the command
$command = "npx playwright test"

if ($ShardTotal -gt 1) {
    $command += " --shard=$Shard/$ShardTotal"
}

if ($Workers -gt 0) {
    $command += " --workers=$Workers"
}

if ($UI) {
    $command += " --ui"
}

if ($Headed) {
    $command += " --headed"
}

if ($Debug) {
    $command += " --debug"
}

if ($Project -ne "") {
    $command += " --project=$Project"
}

if ($TestFile -ne "") {
    $command += " $TestFile"
}

Write-Host "Executing: $command" -ForegroundColor Gray
Write-Host ""

# Execute the command
Invoke-Expression $command

# Clean up environment variables
Remove-Item Env:\SHARD -ErrorAction SilentlyContinue
Remove-Item Env:\SHARD_TOTAL -ErrorAction SilentlyContinue
Remove-Item Env:\PLAYWRIGHT_WORKERS -ErrorAction SilentlyContinue

