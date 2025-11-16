# Physical Access Setup Guide

Since SSH password authentication is disabled, you need physical access to the
Raspberry Pi to enable it or add your SSH key.

## Method 1: Enable Password Authentication (Easiest)

### Step 1: Connect to Pi Physically

1. Connect a keyboard and monitor (or use HDMI) to the Raspberry Pi
2. Power on the Pi and log in with username `pi` and your password

### Step 2: Enable Password Authentication

Run these commands on the Pi:

```bash
# Backup the SSH config
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Enable password authentication
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

# If the line doesn't exist, add it
if ! grep -q "^PasswordAuthentication" /etc/ssh/sshd_config; then
    echo "PasswordAuthentication yes" | sudo tee -a /etc/ssh/sshd_config
fi

# Restart SSH service
sudo systemctl restart ssh

# Verify it's running
sudo systemctl status ssh
```

### Step 3: Test from Windows

```powershell
.\connect-ssh.ps1 1
# You should now be prompted for a password
```

## Method 2: Add SSH Key Manually (More Secure)

### Step 1: Get Your Public Key

On your Windows machine, run:

```powershell
cat $env:USERPROFILE\.ssh\id_rsa.pub
```

Copy the entire output (it starts with `ssh-rsa` and ends with
`raspberry-pi-access`)

### Step 2: Add Key to Pi

On the Raspberry Pi (via physical access):

```bash
# Create .ssh directory if it doesn't exist
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Add your public key
nano ~/.ssh/authorized_keys
# Paste your public key, save and exit (Ctrl+X, Y, Enter)

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Test Connection

```powershell
.\connect-ssh.ps1 1
# Should connect without password prompt
```

## Method 3: Use USB Drive to Transfer Files

### Step 1: Create Setup Script on USB

1. Format a USB drive as FAT32
2. Copy `enable-password-auth.sh` to the USB drive
3. Also copy your public key file (`id_rsa.pub`) to the USB

### Step 2: On the Pi

1. Insert USB drive
2. Mount it (usually auto-mounted at `/media/pi/` or `/mnt/`)
3. Run:

```bash
# Find the USB drive
ls /media/pi/  # or ls /mnt/

# Copy and run the script
cp /media/pi/enable-password-auth.sh ~/
bash ~/enable-password-auth.sh

# Or manually add SSH key
mkdir -p ~/.ssh
chmod 700 ~/.ssh
cat /media/pi/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

## Method 4: Serial Console (If Available)

If your Pi has a serial console connection:

1. Connect via serial/USB-to-TTY adapter
2. Use PuTTY or similar to connect to the serial port
3. Follow Method 1 or 2 above

## Quick One-Liner for Password Auth

If you have physical access, this single command enables password
authentication:

```bash
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config && sudo systemctl restart ssh && echo "Password authentication enabled!"
```

## For Each Pi

You need to do this on **each Raspberry Pi**:

- 192.168.0.48 (Ethernet Pi 1) ✓ Can ping, needs password auth
- 192.168.0.16 (Ethernet Pi 2) - SSH not running
- 192.168.0.17 (WiFi Pi 1) - SSH not running
- 192.168.0.41 (WiFi Pi 2) ✓ Can ping, needs password auth

## After Enabling Password Auth

Once password authentication is enabled, you can:

1. **Connect with password:**

   ```powershell
   .\connect-ssh.ps1 1
   ```

2. **Set up SSH keys for passwordless access:**

   ```powershell
   .\setup-ssh-keys.ps1
   ```

3. **Open ports 22 and 23:**

   ```powershell
   .\open-ports.ps1
   ```

4. **Enable telnet:**
   ```powershell
   .\setup-telnet.ps1
   ```

## Troubleshooting

### "Connection refused" on some Pis

- SSH service may not be running
- On the Pi, run: `sudo systemctl enable ssh && sudo systemctl start ssh`

### Still getting "Permission denied"

- Make sure you saved the SSH config file
- Verify: `sudo grep PasswordAuthentication /etc/ssh/sshd_config`
- Should show: `PasswordAuthentication yes` (not commented out)
