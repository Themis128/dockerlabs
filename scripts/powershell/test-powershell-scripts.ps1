# Test PowerShell scripts for syntax errors
# Usage: .\test-powershell-scripts.ps1

$scripts = @(
    "run-tests.ps1",
    "start-server-verbose.ps1",
    "start-web-gui.ps1"
)

$allPassed = $true

foreach ($script in $scripts) {
    Write-Host "Testing $script..." -ForegroundColor Cyan

    if (-not (Test-Path $script)) {
        Write-Host "  ERROR: File not found: $script" -ForegroundColor Red
        $allPassed = $false
        continue
    }

    $errors = @()
    try {
        $null = [System.Management.Automation.PSParser]::Tokenize((Get-Content $script -Raw), [ref]$errors)

        if ($errors.Count -eq 0) {
            Write-Host "  OK: No syntax errors found" -ForegroundColor Green
        } else {
            Write-Host "  ERROR: Found $($errors.Count) error(s):" -ForegroundColor Red
            foreach ($error in $errors) {
                Write-Host "    Line $($error.Token.StartLine): $($error.Message)" -ForegroundColor Yellow
            }
            $allPassed = $false
        }
    } catch {
        $errorMsg = $_.Exception.Message
        Write-Host "  ERROR: Parse error: $errorMsg" -ForegroundColor Red
        $allPassed = $false
    }

    Write-Host ""
}

if ($allPassed) {
    Write-Host "All scripts passed syntax validation!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "Some scripts have errors. Please fix them." -ForegroundColor Red
    exit 1
}
