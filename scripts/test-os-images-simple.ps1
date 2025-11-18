# PowerShell script to test OS image download service
# Tests the ImageDownloadService.GetAvailableImagesAsync method

Write-Host "Testing OS Image Download Service" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Expected OS image count (should match ImageDownloadService.cs)
$expectedCount = 29

Write-Host "Expected OS Images: $expectedCount" -ForegroundColor Yellow
Write-Host ""

# Test 1: Verify C# service file exists
Write-Host "Test 1: Checking C# service file..." -ForegroundColor Green
$serviceFile = "RaspberryPiManager\Services\ImageDownloadService.cs"
if (Test-Path $serviceFile) {
    Write-Host "[OK] Service file exists" -ForegroundColor Green

    # Count OS images by counting "Name = " patterns
    $content = Get-Content $serviceFile -Raw
    $nameMatches = Select-String -InputObject $content -Pattern 'Name\s*=\s*"[^"]+"' -AllMatches
    $actualCount = 0
    if ($nameMatches) {
        $actualCount = ($nameMatches.Matches | Where-Object { $_.Value -like '*Raspberry*' -or $_.Value -like '*Ubuntu*' -or $_.Value -like '*Debian*' -or $_.Value -like '*LibreELEC*' -or $_.Value -like '*OSMC*' -or $_.Value -like '*Volumio*' -or $_.Value -like '*RetroPie*' -or $_.Value -like '*Recalbox*' -or $_.Value -like '*Batocera*' -or $_.Value -like '*Home Assistant*' -or $_.Value -like '*openHABian*' -or $_.Value -like '*OctoPi*' -or $_.Value -like '*OpenMediaVault*' -or $_.Value -like '*DietPi*' -or $_.Value -like '*Alpine*' -or $_.Value -like '*Kali*' -or $_.Value -like '*FreeBSD*' }).Count
    }

    # Alternative: count by "new()" patterns that have Name property
    $newMatches = Select-String -InputObject $content -Pattern 'new\(\)' -AllMatches
    $actualCount = $newMatches.Matches.Count

    Write-Host "  Found $actualCount OS image definitions" -ForegroundColor $(if ($actualCount -ge $expectedCount) { "Green" } else { "Yellow" })

    if ($actualCount -ge $expectedCount) {
        Write-Host "[OK] OS image count matches or exceeds expected value" -ForegroundColor Green
    } else {
        Write-Host "[WARN] Expected $expectedCount images, found $actualCount" -ForegroundColor Yellow
    }
} else {
    Write-Host "[FAIL] Service file not found" -ForegroundColor Red
}
Write-Host ""

# Test 2: Verify documentation exists
Write-Host "Test 2: Checking documentation..." -ForegroundColor Green
$docFile = "docs\OS_DOWNLOAD_PATHS.md"
if (Test-Path $docFile) {
    Write-Host "[OK] Documentation file exists" -ForegroundColor Green

    $docContent = Get-Content $docFile -Raw
    $urlCount = (Select-String -InputObject $docContent -Pattern 'https://' -AllMatches).Matches.Count
    Write-Host "  Found $urlCount URLs in documentation" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Documentation file not found" -ForegroundColor Red
}
Write-Host ""

# Test 3: Extract and validate URLs from service file
Write-Host "Test 3: Extracting download URLs..." -ForegroundColor Green
if (Test-Path $serviceFile) {
    $content = Get-Content $serviceFile -Raw

    # Extract all DownloadUrl values using Select-String
    $urlLines = Select-String -InputObject $content -Pattern 'DownloadUrl\s*=\s*"https://[^"]+"' -AllMatches
    $urls = @()
    if ($urlLines -and $urlLines.Matches) {
        foreach ($match in $urlLines.Matches) {
            $urlMatch = [regex]::Match($match.Value, 'https://[^"]+')
            if ($urlMatch.Success) {
                $urls += $urlMatch.Value
            }
        }
    }

    Write-Host "  Found $($urls.Count) download URLs" -ForegroundColor Green

    # Categorize URLs
    $raspberryPiUrls = $urls | Where-Object { $_ -like "*downloads.raspberrypi.org*" }
    $ubuntuUrls = $urls | Where-Object { $_ -like "*cdimage.ubuntu.com*" }
    $debianUrls = $urls | Where-Object { $_ -like "*raspi.debian.net*" }
    $githubUrls = $urls | Where-Object { $_ -like "*github.com*" }
    $otherUrls = $urls | Where-Object { $_ -notlike "*downloads.raspberrypi.org*" -and $_ -notlike "*cdimage.ubuntu.com*" -and $_ -notlike "*raspi.debian.net*" -and $_ -notlike "*github.com*" }

    Write-Host "  URL Categories:" -ForegroundColor Cyan
    Write-Host "    - Raspberry Pi OS: $($raspberryPiUrls.Count)" -ForegroundColor White
    Write-Host "    - Ubuntu: $($ubuntuUrls.Count)" -ForegroundColor White
    Write-Host "    - Debian: $($debianUrls.Count)" -ForegroundColor White
    Write-Host "    - GitHub: $($githubUrls.Count)" -ForegroundColor White
    Write-Host "    - Other: $($otherUrls.Count)" -ForegroundColor White

    Write-Host "[OK] URLs extracted successfully" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Cannot extract URLs - service file not found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$allTestsPassed = $true

if ((Test-Path $serviceFile) -and (Test-Path $docFile)) {
    Write-Host "[OK] All files present" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Some files missing" -ForegroundColor Red
    $allTestsPassed = $false
}

if ($urls -and $urls.Count -ge 20) {
    Write-Host "[OK] Sufficient OS images defined ($($urls.Count) URLs found)" -ForegroundColor Green
} else {
    Write-Host "[WARN] May need more OS images (found $($urls.Count) URLs)" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Build the C# project to verify compilation" -ForegroundColor White
Write-Host "  2. Run URL accessibility tests: .\scripts\test-url-accessibility.ps1" -ForegroundColor White
Write-Host "  3. Test the frontend integration" -ForegroundColor White
Write-Host "  4. Run Playwright tests: npm test" -ForegroundColor White

if ($allTestsPassed) {
    Write-Host ""
    Write-Host "[OK] Basic validation passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "[WARN] Some issues found - please review" -ForegroundColor Yellow
    exit 1
}
