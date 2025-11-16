# Code Review Script
# Runs comprehensive code quality checks
# Usage: .\run-review.ps1 [--quick|--full]

param(
    [switch]$quick,
    [switch]$full
)

$ErrorActionPreference = "Continue"
$script:exitCode = 0

Write-Host ""
Write-Host "=== Code Review Started ===" -ForegroundColor Cyan
Write-Host ""

# Function to run a check and track exit code
function Run-Check {
    param(
        [string]$Name,
        [string]$Command
    )

    Write-Host "Running: $Name" -ForegroundColor Yellow
    try {
        Invoke-Expression $Command | Out-Null
        if ($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne $null) {
            $script:exitCode = $LASTEXITCODE
            Write-Host "  [FAILED]" -ForegroundColor Red
            return $false
        } else {
            Write-Host "  [PASSED]" -ForegroundColor Green
            return $true
        }
    } catch {
        Write-Host "  [ERROR]: $_" -ForegroundColor Red
        $script:exitCode = 1
        return $false
    }
    Write-Host ""
}

# Quick review (format check + type check)
if ($quick) {
    Write-Host "Running Quick Review..." -ForegroundColor Cyan
    Write-Host ""

    Run-Check "Format Check" "npm run format:check"
    Run-Check "TypeScript Type Check" "npx vue-tsc --noEmit"

    Write-Host ""
    Write-Host "=== Quick Review Complete ===" -ForegroundColor Cyan
    exit $script:exitCode
}

# Full review
Write-Host "Running Full Review..." -ForegroundColor Cyan
Write-Host ""

# 1. Format check
Run-Check "Format Check" "npm run format:check"

# 2. TypeScript type check
Run-Check "TypeScript Type Check" "npx vue-tsc --noEmit"

# 3. HTML linting (if HTML files exist)
if (Test-Path "web-gui/public") {
    Run-Check "HTML Linting" "npm run lint:html"
}

# 4. Build check (verify project builds)
Run-Check "Build Check" "npm run build"

Write-Host ""
Write-Host "=== Review Complete ===" -ForegroundColor Cyan
if ($script:exitCode -eq 0) {
    Write-Host "All checks passed!" -ForegroundColor Green
} else {
    Write-Host "Some checks failed. Please review the output above." -ForegroundColor Red
}

exit $script:exitCode
