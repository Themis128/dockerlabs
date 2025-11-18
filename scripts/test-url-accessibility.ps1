# PowerShell script to test URL accessibility for OS image downloads
# Tests if the download URLs are accessible (HEAD requests)

param(
    [switch]$Quick,  # Only test a few URLs
    [switch]$Verbose
)

Write-Host "Testing OS Image Download URL Accessibility" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host ""

# Sample URLs to test (representative of each category)
$testUrls = @(
    # Raspberry Pi OS (directory listings)
    @{
        Name = "Raspberry Pi OS Lite (64-bit)"
        Url = "https://downloads.raspberrypi.org/raspios_lite_arm64/images/raspios_lite_arm64-latest/"
        Type = "Directory"
    },
    @{
        Name = "Raspberry Pi OS Desktop (32-bit)"
        Url = "https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-latest/"
        Type = "Directory"
    },
    # Ubuntu (direct files)
    @{
        Name = "Ubuntu Server 24.04 LTS"
        Url = "https://cdimage.ubuntu.com/releases/24.04/release/ubuntu-24.04-preinstalled-server-arm64+raspi.img.xz"
        Type = "Direct File"
    },
    @{
        Name = "Ubuntu Desktop 22.04 LTS"
        Url = "https://cdimage.ubuntu.com/releases/22.04/release/ubuntu-22.04-preinstalled-desktop-arm64+raspi.img.xz"
        Type = "Direct File"
    },
    # Debian
    @{
        Name = "Debian 12 Bookworm"
        Url = "https://raspi.debian.net/tested-images/current/arm64/images/debian-12.7.0-arm64-netinst.img.xz"
        Type = "Direct File"
    },
    # LibreELEC
    @{
        Name = "LibreELEC Pi 4"
        Url = "https://releases.libreelec.tv/LibreELEC-RPi4.arm-12.0.0.img.gz"
        Type = "Direct File"
    },
    # GitHub releases
    @{
        Name = "Home Assistant OS Pi 4"
        Url = "https://github.com/home-assistant/operating-system/releases/download/12.0/haos_rpi4-64-12.0.img.xz"
        Type = "GitHub Release"
    },
    @{
        Name = "RetroPie 4.9"
        Url = "https://github.com/RetroPie/RetroPie-Setup/releases/download/4.9/retropie-buster-4.9-rpi4_400.img.gz"
        Type = "GitHub Release"
    }
)

if ($Quick) {
    Write-Host "Quick mode: Testing 4 representative URLs..." -ForegroundColor Yellow
    $testUrls = $testUrls[0..3]
}

$results = @()
$successCount = 0
$failCount = 0

foreach ($test in $testUrls) {
    Write-Host "Testing: $($test.Name)" -ForegroundColor Cyan
    Write-Host "  URL: $($test.Url)" -ForegroundColor Gray
    Write-Host "  Type: $($test.Type)" -ForegroundColor Gray

    try {
        # Use HEAD request to check accessibility without downloading
        $response = Invoke-WebRequest -Uri $test.Url -Method Head -TimeoutSec 10 -UseBasicParsing -ErrorAction Stop

        $status = $response.StatusCode
        $contentLength = if ($response.Headers.'Content-Length') {
            [math]::Round($response.Headers.'Content-Length' / 1GB, 2).ToString() + " GB"
        } else {
            "Unknown"
        }

        if ($status -eq 200 -or $status -eq 301 -or $status -eq 302) {
            Write-Host "  ✓ Accessible (Status: $status, Size: $contentLength)" -ForegroundColor Green
            $successCount++
            $results += @{
                Name = $test.Name
                Status = "Success"
                StatusCode = $status
                Size = $contentLength
            }
        } else {
            Write-Host "  ⚠ Unexpected status: $status" -ForegroundColor Yellow
            $results += @{
                Name = $test.Name
                Status = "Warning"
                StatusCode = $status
                Size = "N/A"
            }
        }
    }
    catch {
        $errorMsg = $_.Exception.Message
        if ($errorMsg -like "*404*") {
            Write-Host "  ✗ Not found (404)" -ForegroundColor Red
            $failCount++
        }
        elseif ($errorMsg -like "*timeout*" -or $errorMsg -like "*timed out*") {
            Write-Host "  ⚠ Timeout (may still be valid)" -ForegroundColor Yellow
        }
        elseif ($errorMsg -like "*403*") {
            Write-Host "  ⚠ Forbidden (403) - may require different method" -ForegroundColor Yellow
        }
        else {
            Write-Host "  ⚠ Error: $errorMsg" -ForegroundColor Yellow
        }

        $results += @{
            Name = $test.Name
            Status = "Error"
            StatusCode = "N/A"
            Size = "N/A"
            Error = $errorMsg
        }
    }

    Write-Host ""
    Start-Sleep -Milliseconds 500  # Be nice to servers
}

# Summary
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Test Summary" -ForegroundColor Cyan
Write-Host "===========================================" -ForegroundColor Cyan
Write-Host "Total URLs tested: $($testUrls.Count)" -ForegroundColor White
Write-Host "Successful: $successCount" -ForegroundColor Green
Write-Host "Failed/Errors: $failCount" -ForegroundColor $(if ($failCount -eq 0) { "Green" } else { "Red" })
Write-Host ""

# Detailed results
if ($Verbose) {
    Write-Host "Detailed Results:" -ForegroundColor Cyan
    foreach ($result in $results) {
        $color = switch ($result.Status) {
            "Success" { "Green" }
            "Warning" { "Yellow" }
            default { "Red" }
        }
        Write-Host "  $($result.Name): $($result.Status) (Code: $($result.StatusCode))" -ForegroundColor $color
    }
    Write-Host ""
}

# Notes
Write-Host "Notes:" -ForegroundColor Yellow
Write-Host "  - Directory listings (Raspberry Pi OS) may return 200 or 403" -ForegroundColor White
Write-Host "  - GitHub releases may require authentication for private repos" -ForegroundColor White
Write-Host "  - Some URLs may be rate-limited or require specific headers" -ForegroundColor White
Write-Host "  - Timeouts don't necessarily mean URLs are invalid" -ForegroundColor White
Write-Host ""

if ($failCount -eq 0) {
    Write-Host "✓ All tested URLs are accessible!" -ForegroundColor Green
    exit 0
} else {
    Write-Host "⚠ Some URLs had issues - review above" -ForegroundColor Yellow
    exit 1
}
