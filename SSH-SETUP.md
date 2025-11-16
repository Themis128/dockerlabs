# SSH Authentication Setup Guide

Your Raspberry Pis are currently configured to only accept SSH key authentication. You have two options:

## Option 1: Set Up SSH Keys (Recommended - More Secure)

This allows passwordless SSH connections.

### Step 1: Generate and Copy SSH Keys

```powershell
.\setup-ssh-keys.ps1
```

This script will:
1. Generate an SSH key pair (if you don't have one)
2. Copy your public key to each Raspberry Pi
3. You'll be prompted for the password once per Pi

### Step 2: Test Connection

After setup, you should be able to connect without a password:
```powershell
.\connect-ssh.ps1 1
```

## Option 2: Enable Password Authentication

If you prefer to use passwords instead of keys, you need to enable password authentication on each Pi.

### Method A: If you have physical access to the Pi

1. Connect a keyboard and monitor to the Pi
2. Log in and run:
   ```bash
   sudo nano /etc/ssh/sshd_config
   ```
3. Find and change:
   ```
   PasswordAuthentication yes
   ```
4. Restart SSH:
   ```bash
   sudo systemctl restart ssh
   ```

### Method B: If you can access via another method

1. Copy `enable-password-auth.sh` to the Pi using any method available
2. Run it on the Pi:
   ```bash
   bash enable-password-auth.sh
   ```

### Method C: Manual SSH Config Edit (if you have temporary access)

If you can temporarily access the Pi (maybe via another network or method), SSH in and run:

```bash
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

## Option 3: Use Existing SSH Key

If you already have an SSH key set up:

1. Check if you have a key:
   ```powershell
   cat $env:USERPROFILE\.ssh\id_rsa.pub
   ```

2. Copy it to the Pi manually:
   ```powershell
   # Copy the public key content, then SSH to the Pi and run:
   # mkdir -p ~/.ssh
   # echo "YOUR_PUBLIC_KEY_HERE" >> ~/.ssh/authorized_keys
   # chmod 700 ~/.ssh
   # chmod 600 ~/.ssh/authorized_keys
   ```

## Quick Fix: Enable Password Auth on Pi 192.168.0.48

Since you can't SSH in yet, you'll need physical access or another method. Here's what to do on the Pi:

```bash
# On the Raspberry Pi (via physical access or console):
sudo nano /etc/ssh/sshd_config

# Find the line (around line 56):
# PasswordAuthentication no

# Change it to:
PasswordAuthentication yes

# Save (Ctrl+X, Y, Enter)

# Restart SSH:
sudo systemctl restart ssh
```

## Verify SSH Configuration

After enabling password authentication, test from Windows:
```powershell
.\connect-ssh.ps1 1
# You should now be prompted for a password instead of getting "Permission denied"
```

## Security Notes

- **SSH Keys** are more secure and convenient (no password needed)
- **Password Authentication** is easier to set up but less secure
- You can enable both methods simultaneously for flexibility

## Troubleshooting

### "Permission denied (publickey)" Error
- SSH is configured for key-only authentication
- Either set up SSH keys (Option 1) or enable password auth (Option 2)

### "Connection refused" Error
- SSH service may not be running on the Pi
- Check: `sudo systemctl status ssh` on the Pi

### "Host key verification failed"
- Remove old host key: `ssh-keygen -R 192.168.0.48`
- Or accept the new key when prompted
