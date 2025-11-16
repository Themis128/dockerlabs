# Script to generate SSH keys and copy them to Raspberry Pis
# Usage: .\setup-ssh-keys.ps1 [username]

param(
    [Parameter(Mandatory=$false)]
    [string]$Username = "pi"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH Key Setup for Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check if SSH key already exists
$sshKeyPath = "$env:USERPROFILE\.ssh\id_rsa"
$sshPubKeyPath = "$env:USERPROFILE\.ssh\id_rsa.pub"

if (Test-Path $sshKeyPath) {
    Write-Host "SSH key already exists at: $sshKeyPath" -ForegroundColor Yellow
    $overwrite = Read-Host "Do you want to generate a new key? (y/N)"
    if ($overwrite -ne "y" -and $overwrite -ne "Y") {
        Write-Host "Using existing SSH key..." -ForegroundColor Green
    } else {
        Write-Host "Generating new SSH key..." -ForegroundColor Green
        ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "raspberry-pi-access"
    }
} else {
    Write-Host "Generating SSH key..." -ForegroundColor Green
    ssh-keygen -t rsa -b 4096 -f $sshKeyPath -N '""' -C "raspberry-pi-access"
}

if (-not (Test-Path $sshPubKeyPath)) {
    Write-Host "ERROR: Failed to generate SSH key" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "SSH public key:" -ForegroundColor Cyan
Get-Content $sshPubKeyPath
Write-Host ""

# Load configuration (from project root, two levels up)
$scriptDir = Split-Path -Parent $PSScriptRoot
$projectRoot = Split-Path -Parent $scriptDir
$configPath = Join-Path $projectRoot "pi-config.json"
$config = Get-Content -Path $configPath | ConvertFrom-Json

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Copying SSH key to Raspberry Pis" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You will need to enter the password for each Pi when prompted." -ForegroundColor Yellow
Write-Host ""

function Copy-SSHKeyToPi {
    param(
        [string]$PiName,
        [string]$IpAddress,
        [string]$ConnectionType,
        [string]$User
    )

    Write-Host "Copying key to: $PiName ($IpAddress) via $ConnectionType" -ForegroundColor Yellow

    # Test connectivity
    $pingResult = Test-Connection -ComputerName $IpAddress -Count 2 -Quiet
    if (-not $pingResult) {
        Write-Host "  ✗ Cannot reach $IpAddress - skipping" -ForegroundColor Red
        return $false
    }

    # Copy SSH key using ssh-copy-id (if available) or manual method
    try {
        # Try ssh-copy-id first (if available)
        $sshCopyId = Get-Command ssh-copy-id -ErrorAction SilentlyContinue
        if ($sshCopyId) {
            Write-Host "  Using ssh-copy-id..." -ForegroundColor Gray
            ssh-copy-id "${User}@${IpAddress}" 2>&1 | Out-Host
            if ($LASTEXITCODE -eq 0) {
                Write-Host "  ✓ SSH key copied successfully" -ForegroundColor Green
                return $true
            }
        }

        # Manual method: read public key and append to authorized_keys
        Write-Host "  Copying key manually..." -ForegroundColor Gray
        $publicKey = Get-Content $sshPubKeyPath

        # Create .ssh directory and authorized_keys file on remote
        $commands = @"
mkdir -p ~/.ssh
chmod 700 ~/.ssh
echo '$publicKey' >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
"@

        # Use ssh to run commands (will prompt for password)
        Write-Host "  Please enter password for ${User}@${IpAddress}:" -ForegroundColor Cyan
        ssh "${User}@${IpAddress}" $commands 2>&1 | Out-Host

        if ($LASTEXITCODE -eq 0) {
            Write-Host "  ✓ SSH key copied successfully" -ForegroundColor Green
            return $true
        } else {
            Write-Host "  ✗ Failed to copy SSH key" -ForegroundColor Red
            return $false
        }
    } catch {
        Write-Host "  ✗ Error: $_" -ForegroundColor Red
        return $false
    }
}

# Process Ethernet Pis first
Write-Host "ETHERNET CONNECTIONS:" -ForegroundColor Green
Write-Host "--------------------" -ForegroundColor Green
$ethernetPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "Wired" } | Select-Object -ExpandProperty Value
foreach ($pi in $ethernetPis) {
    Copy-SSHKeyToPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

# Process WiFi Pis
Write-Host "WIFI CONNECTIONS:" -ForegroundColor Green
Write-Host "----------------" -ForegroundColor Green
$wifiPis = $config.raspberry_pis.PSObject.Properties | Where-Object { $_.Value.connection -eq "2.4G" } | Select-Object -ExpandProperty Value
foreach ($pi in $wifiPis) {
    Copy-SSHKeyToPi -PiName $pi.name -IpAddress $pi.ip -ConnectionType $pi.connection -User $Username
    Write-Host ""
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "SSH Key Setup Complete!" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "You should now be able to connect without a password:" -ForegroundColor Green
Write-Host "  .\connect-ssh.ps1 1" -ForegroundColor Yellow
