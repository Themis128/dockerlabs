# Script to enable Telnet on all Raspberry Pis via SSH
# This script will SSH into each Pi and run the telnet setup

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi",

    [Parameter(Mandatory=$false)]
    [string]$Password = ""
)

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Enabling Telnet on All Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Function to enable telnet on a Pi
function Enable-TelnetOnPi {
    param(
        [string]$PiName,
        [string]$IpAddress,
        [string]$ConnectionType,
        [string]$User
    )

    Write-Host "Processing: $PiName ($IpAddress) via $ConnectionType" -ForegroundColor Yellow

    # Test connectivity
    $pingResult = Test-Connection -ComputerName $IpAddress -Count 2 -Quiet
    if (-not $pingResult) {
        Write-Host "  ✗ Cannot reach $IpAddress - skipping" -ForegroundColor Red
        return $false
    }

    Write-Host "  ✓ Connectivity OK" -ForegroundColor Green

    # Create temporary script file with commands
    $scriptContent = @"
#!/bin/bash
sudo apt-get update -y
sudo apt-get install -y telnetd inetutils-inetd
sudo systemctl enable inetd
sudo systemctl start inetd
sudo systemctl status inetd --no-pager | head -5
echo "Telnet setup complete for $PiName"
"@

    $tempScript = [System.IO.Path]::GetTempFileName() + ".sh"
    $scriptContent | Out-File -FilePath $tempScript -Encoding ASCII

    Write-Host "  Attempting to enable telnet..." -ForegroundColor Yellow

    try {
        # Use SSH to run the commands
        if ($Password) {
            # If password is provided, use sshpass (if available) or expect
            Write-Host "  Note: Password authentication requires sshpass or manual entry" -ForegroundColor Yellow
            Write-Host "  Please run manually: ssh $User@$IpAddress" -ForegroundColor Cyan
            Write-Host "  Then run the commands from enable-telnet-on-pi.sh" -ForegroundColor Cyan
        } else {
            # Try SSH with key-based authentication
            Write-Host "  Connecting via SSH (key-based auth)..." -ForegroundColor Yellow

            # Copy script to Pi
            $copyCommand = "scp `"$tempScript`" ${User}@${IpAddress}:/tmp/enable-telnet.sh"
            Write-Host "  Copying script..." -ForegroundColor Gray
            & pwsh -Command $copyCommand 2>&1 | Out-Null

            # Run script on Pi
            $runCommand = "ssh ${User}@${IpAddress} 'bash /tmp/enable-telnet.sh'"
            Write-Host "  Running setup script..." -ForegroundColor Gray
            $result = & pwsh -Command $runCommand 2>&1

            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ Telnet enabled successfully" -ForegroundColor Green
                return $true
            } else {
                Write-Host "  ⚠ Setup may have issues. Check output above." -ForegroundColor Yellow
                Write-Host $result -ForegroundColor Gray
                return $false
            }
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        Write-Host "  Please enable telnet manually on this Pi" -ForegroundColor Yellow
        return $false
    } finally {
        # Cleanup
        if (Test-Path $tempScript) {
            Remove-Item $tempScript -Force -ErrorAction SilentlyContinue
        }
    }
}

# Process Ethernet Pis
Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
foreach ($pi in $ethernetPis) {
    Enable-TelnetOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

# Process WiFi Pis
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
foreach ($pi in $wifiPis) {
    Enable-TelnetOnPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "If automatic setup failed, you can:" -ForegroundColor Yellow
Write-Host "1. SSH into each Pi manually" -ForegroundColor White
Write-Host "2. Copy enable-telnet-on-pi.sh to the Pi" -ForegroundColor White
Write-Host "3. Run: bash enable-telnet-on-pi.sh" -ForegroundColor White
Write-Host ""
Write-Host "Or run these commands on each Pi:" -ForegroundColor Yellow
Write-Host "  sudo apt-get update -y" -ForegroundColor Cyan
Write-Host "  sudo apt-get install -y telnetd inetutils-inetd" -ForegroundColor Cyan
Write-Host "  sudo systemctl enable inetd" -ForegroundColor Cyan
Write-Host "  sudo systemctl start inetd" -ForegroundColor Cyan
