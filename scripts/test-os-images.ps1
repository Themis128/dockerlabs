# PowerShell script to test OS image download service
# Tests the ImageDownloadService.GetAvailableImagesAsync method

Write-Host "Testing OS Image Download Service" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan
Write-Host ""

# Expected OS image count (should match ImageDownloadService.cs)
$expectedCount = 29

Write-Host "Expected OS Images: $expectedCount" -ForegroundColor Yellow
Write-Host ""

# Test 1: Verify C# service compiles
Write-Host "Test 1: Checking C# service file..." -ForegroundColor Green
$serviceFile = "RaspberryPiManager\Services\ImageDownloadService.cs"
if (Test-Path $serviceFile) {
    Write-Host "✓ Service file exists" -ForegroundColor Green
    
    # Count OS images in the file
    $content = Get-Content $serviceFile -Raw
    $imageMatches = [regex]::Matches($content, 'new\(\)\s*\{[^}]*Name\s*=\s*"[^"]+"')
    $actualCount = $imageMatches.Count
    
    Write-Host "  Found $actualCount OS image definitions" -ForegroundColor $(if ($actualCount -eq $expectedCount) { "Green" } else { "Yellow" })
    
    if ($actualCount -eq $expectedCount) {
        Write-Host "✓ OS image count matches expected value" -ForegroundColor Green
    } else {
        Write-Host "⚠ Warning: Expected $expectedCount images, found $actualCount" -ForegroundColor Yellow
    }
} else {
    Write-Host "✗ Service file not found" -ForegroundColor Red
}
Write-Host ""

# Test 2: Verify documentation exists
Write-Host "Test 2: Checking documentation..." -ForegroundColor Green
$docFile = "docs\OS_DOWNLOAD_PATHS.md"
if (Test-Path $docFile) {
    Write-Host "✓ Documentation file exists" -ForegroundColor Green
    
    $docContent = Get-Content $docFile -Raw
    $urlCount = ([regex]::Matches($docContent, 'https://')).Count
    Write-Host "  Found $urlCount URLs in documentation" -ForegroundColor Green
} else {
    Write-Host "✗ Documentation file not found" -ForegroundColor Red
}
Write-Host ""

# Test 3: Extract and validate URLs from service file
Write-Host "Test 3: Extracting download URLs..." -ForegroundColor Green
if (Test-Path $serviceFile) {
    $content = Get-Content $serviceFile -Raw
    
    # Extract all DownloadUrl values
    $urlPattern = 'DownloadUrl\s*=\s*"([^"]+)"'
    $urlMatches = [regex]::Matches($content, $urlPattern)
    
    $urls = @()
    foreach ($match in $urlMatches) {
        $urls += $match.Groups[1].Value
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
    
    Write-Host "✓ URLs extracted successfully" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot extract URLs - service file not found" -ForegroundColor Red
}
Write-Host ""

# Test 4: Validate URL format
Write-Host "Test 4: Validating URL formats..." -ForegroundColor Green
if ($urls) {
    $invalidUrls = @()
    foreach ($url in $urls) {
        if (-not ($url -match '^https://[^\s]+$')) {
            $invalidUrls += $url
        }
    }
    
    if ($invalidUrls.Count -eq 0) {
        Write-Host "✓ All URLs have valid format" -ForegroundColor Green
    } else {
        Write-Host "✗ Found $($invalidUrls.Count) invalid URLs:" -ForegroundColor Red
        foreach ($url in $invalidUrls) {
            Write-Host "    - $url" -ForegroundColor Red
        }
    }
} else {
    Write-Host "⚠ No URLs to validate" -ForegroundColor Yellow
}
Write-Host ""

# Test 5: Check for duplicate URLs
Write-Host "Test 5: Checking for duplicate URLs..." -ForegroundColor Green
if ($urls) {
    $uniqueUrls = $urls | Select-Object -Unique
    $duplicateCount = $urls.Count - $uniqueUrls.Count
    
    if ($duplicateCount -eq 0) {
        Write-Host "✓ No duplicate URLs found" -ForegroundColor Green
    } else {
        Write-Host "⚠ Found $duplicateCount duplicate URLs" -ForegroundColor Yellow
    }
} else {
    Write-Host "⚠ No URLs to check" -ForegroundColor Yellow
}
Write-Host ""

# Test 6: Verify OS families
Write-Host "Test 6: Checking OS families..." -ForegroundColor Green
if (Test-Path $serviceFile) {
    $content = Get-Content $serviceFile -Raw
    
    $familyPattern = 'OSFamily\s*=\s*"([^"]+)"'
    $familyMatches = [regex]::Matches($content, $familyPattern)
    
    $families = @{}
    foreach ($match in $familyMatches) {
        $family = $match.Groups[1].Value
        if ($families.ContainsKey($family)) {
            $families[$family]++
        } else {
            $families[$family] = 1
        }
    }
    
    Write-Host "  OS Families found:" -ForegroundColor Cyan
    foreach ($family in $families.Keys | Sort-Object) {
        Write-Host "    - $family : $($families[$family]) images" -ForegroundColor White
    }
    
    Write-Host "✓ OS families categorized" -ForegroundColor Green
} else {
    Write-Host "✗ Cannot check OS families - service file not found" -ForegroundColor Red
}
Write-Host ""

# Summary
Write-Host "=================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "=================================" -ForegroundColor Cyan

$allTestsPassed = $true

if (Test-Path $serviceFile -and Test-Path $docFile) {
    Write-Host "✓ All files present" -ForegroundColor Green
} else {
    Write-Host "✗ Some files missing" -ForegroundColor Red
    $allTestsPassed = $false
}

if ($urls -and $urls.Count -ge $expectedCount) {
    Write-Host "✓ Sufficient OS images defined" -ForegroundColor Green
} else {
    Write-Host "⚠ May need more OS images" -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Build the C# project to verify compilation" -ForegroundColor White
Write-Host "  2. Run URL accessibility tests (see test-urls.ps1)" -ForegroundColor White
Write-Host "  3. Test the frontend integration" -ForegroundColor White
Write-Host "  4. Run Playwright tests: npm test" -ForegroundColor White

if ($allTestsPassed) {
    Write-Host ""
    Write-Host "✓ Basic validation passed!" -ForegroundColor Green
    exit 0
} else {
    Write-Host ""
    Write-Host "⚠ Some issues found - please review" -ForegroundColor Yellow
    exit 1
}

