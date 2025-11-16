# PuTTY Setup Guide for Raspberry Pis

## Error: "No supported authentication methods available"

This error means:

- ✅ SSH is working on the Pi
- ❌ Your SSH key is not added to the Pi
- ❌ Password authentication is disabled

## Solution: Add Your SSH Key

### Step 1: Convert Your SSH Key for PuTTY

PuTTY uses `.ppk` format instead of OpenSSH format. Convert your key:

1. **Open PuTTYgen** (comes with PuTTY installation)
2. **Click "Load"**
3. **Navigate to:** `C:\Users\<YourUsername>\.ssh\id_rsa`
   - Change file type filter to "All Files (_._)" to see the private key
4. **Click "Save private key"** and save as `id_rsa.ppk`
5. **Close PuTTYgen**

### Step 2: Add SSH Key to Raspberry Pi

You need **physical access** to the Pi to add your key.

**On the Raspberry Pi (192.168.0.48):**

1. Connect keyboard and monitor
2. Log in as `pi` user
3. Run this command (get it from Windows first):

```powershell
# On Windows, get the command:
.\get-pi-command.ps1
```

4. Copy the entire command shown
5. Paste it on the Pi terminal
6. You should see: `SSH key added successfully!`

### Step 3: Configure PuTTY

1. **Open PuTTY**
2. **Enter connection details:**
   - Host Name: `192.168.0.48` (or other Pi IP)
   - Port: `22`
   - Connection type: `SSH`

3. **Configure SSH Key:**
   - Go to: **Connection → SSH → Auth**
   - Click **"Browse"** under "Private key file for authentication"
   - Select your `id_rsa.ppk` file
   - Go back to **Session**
   - Enter a name (e.g., "Raspberry Pi 1") and click **"Save"**

4. **Connect:**
   - Double-click your saved session
   - You should connect without password prompt!

## Alternative: Enable Password Authentication

If you prefer password authentication:

**On the Pi (physical access):**

```bash
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Then in PuTTY:

- Just enter username: `pi`
- Enter password when prompted
- No key file needed

## Raspberry Pi IP Addresses

### Ethernet (Priority)

- **Pi 1:** 192.168.0.48
- **Pi 2:** 192.168.0.16

### WiFi (Fallback)

- **Pi 1:** 192.168.0.17
- **Pi 2:** 192.168.0.41

## Quick Setup Script

You can also use the PowerShell scripts we created:

```powershell
# Get the SSH key command to run on Pi
.\get-pi-command.ps1

# Test authentication
.\test-ssh-auth.ps1 1

# Connect via PowerShell (after key is added)
.\connect-ssh.ps1 1
```

## Troubleshooting

### "Server refused our key"

- Key not added to Pi yet - use `.\get-pi-command.ps1` to get the command
- Wrong key file selected in PuTTY - make sure you're using the converted `.ppk`
  file

### "Connection refused"

- SSH service not running on Pi
- On Pi: `sudo systemctl enable ssh && sudo systemctl start ssh`

### "Network error: Connection timed out"

- Pi is not reachable
- Check network connection
- Verify IP address: `.\test-connections.ps1`

## After SSH Works

Once you can connect via PuTTY or PowerShell:

```powershell
# Enable telnet on all Pis
.\enable-telnet-remote.ps1

# Test telnet (use PuTTY with connection type: Telnet, port 23)
```
