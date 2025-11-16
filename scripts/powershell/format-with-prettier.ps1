# PowerShell script to format files with Prettier on Windows
# This script finds files and passes them to Prettier to avoid glob expansion issues

param(
    [switch]$Check
)

$ErrorActionPreference = "Stop"

# Find all files that should be formatted
$files = @()

# Web GUI files
if (Test-Path "web-gui") {
    $files += Get-ChildItem -Path "web-gui" -Recurse -Include *.js,*.ts,*.json,*.html,*.css -File | ForEach-Object { $_.FullName }
}

# Test files
if (Test-Path "tests") {
    $files += Get-ChildItem -Path "tests" -Recurse -Include *.js,*.ts -File | ForEach-Object { $_.FullName }
}

# Root level files
$files += Get-ChildItem -Path "." -Include *.ts,*.js,*.json,*.md -File | ForEach-Object { $_.FullName }

# Docs files
if (Test-Path "docs") {
    $files += Get-ChildItem -Path "docs" -Recurse -Include *.md -File | ForEach-Object { $_.FullName }
}

# Filter out ignored files
$ignorePatterns = @(
    "node_modules",
    "bin",
    "obj",
    "__pycache__",
    ".git",
    "playwright-report",
    "test-results",
    "package-lock.json"
)

$filteredFiles = $files | Where-Object {
    $file = $_
    $shouldInclude = $true
    foreach ($pattern in $ignorePatterns) {
        if ($file -like "*\$pattern\*" -or $file -like "*\$pattern") {
            $shouldInclude = $false
            break
        }
    }
    $shouldInclude
}

if ($filteredFiles.Count -eq 0) {
    Write-Host "No files found to format"
    exit 0
}

# Run prettier
$action = if ($Check) { "--check" } else { "--write" }
$fileList = $filteredFiles -join " "

try {
    if ($Check) {
        npx prettier --check $filteredFiles
    } else {
        npx prettier --write $filteredFiles
    }
    exit $LASTEXITCODE
} catch {
    Write-Error $_.Exception.Message
    exit 1
}
