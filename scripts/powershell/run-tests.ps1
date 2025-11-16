# Run Playwright tests with error suppression
# This script suppresses the PowerShell profile permission error
# Usage: .\run-tests.ps1 [--ui|--headed|--debug]

param(
    [switch]$ui,
    [switch]$headed,
    [switch]$debug
)

# Suppress permission errors from PowerShell profile
$ErrorActionPreference = "SilentlyContinue"
$PSDefaultParameterValues['*:ErrorAction'] = 'SilentlyContinue'

# Redirect stderr to suppress permission errors
$Error.Clear()

# Build command arguments
$testFile = "tests/wpa.spec.ts"
$testArgs = @($testFile)

if ($ui) {
    $testArgs += "--ui"
    Write-Host "Running tests in UI mode (interactive)" -ForegroundColor Green
} elseif ($headed) {
    $testArgs += "--headed"
    Write-Host "Running tests in headed mode (visible browser)" -ForegroundColor Green
} elseif ($debug) {
    $testArgs += "--debug"
    Write-Host "Running tests in debug mode" -ForegroundColor Green
} else {
    $testArgs += "--reporter=list"
    Write-Host "Running tests in list mode" -ForegroundColor Green
}

# Run the tests, filtering out the permission error
if ($ui -or $headed -or $debug) {
    # For interactive modes, don't filter output
    npx playwright test @testArgs
} else {
    # For non-interactive, filter the permission error
    $output = npx playwright test @testArgs 2>&1 | Where-Object {
        $_ -notmatch "EPERM: operation not permitted" -and
        $_ -notmatch "ElevatedDiagnostics"
    }
    $output | Write-Host
}

# Exit with the test result code
exit $LASTEXITCODE
