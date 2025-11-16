# Fix Authentication Error - Step by Step

## The Problem
You're seeing: **"No supported authentication methods available (server sent: publickey)"**

This means:
- ✅ SSH is working on the Pi
- ❌ Your SSH key is NOT on the Pi yet
- ❌ Password authentication is disabled

## The Solution (Choose One Method)

---

## Method 1: Add SSH Key (Recommended - Most Secure)

### Step 1: Get the Command
On Windows, run:
```powershell
.\get-pi-command.ps1
```

This will show you a long command starting with `mkdir -p ~/.ssh...`

### Step 2: Run on Raspberry Pi
**You need physical access to the Pi (keyboard + monitor):**

1. Connect keyboard and monitor to Raspberry Pi (192.168.0.48)
2. Power on the Pi
3. Log in as user `pi` (enter your password)
4. **Copy the ENTIRE command** from Step 1
5. **Paste it into the Pi terminal** and press Enter
6. You should see: `SSH key added successfully!`

### Step 3: Test
On Windows:
```powershell
.\test-ssh-auth.ps1 1
```

You should see: `✓ SSH key authentication WORKS!`

### Step 4: Connect
Now you can connect:
```powershell
.\connect-ssh.ps1 1
```

Or use PuTTY (after converting key - see Method 3 below)

---

## Method 2: Enable Password Authentication (Easier, Less Secure)

### On Raspberry Pi (Physical Access Required):

1. Connect keyboard and monitor to the Pi
2. Log in as `pi` user
3. Run these commands:

```bash
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
echo "Password authentication enabled!"
```

### Test on Windows:
```powershell
.\test-ssh-auth.ps1 1
```

You should see: `✓ Password authentication is ENABLED`

### Connect:
```powershell
.\connect-ssh.ps1 1
# Will prompt for password
```

Or in PuTTY:
- Just enter username: `pi`
- Enter password when prompted
- No key file needed

---

## Method 3: Use USB Drive

### Step 1: Copy Key to USB
On Windows:
```powershell
.\copy-key-to-usb.ps1
```

Follow the prompts to select your USB drive.

### Step 2: On Raspberry Pi
1. Insert USB drive into Pi
2. Log in to Pi (physical access)
3. Run:

```bash
# Find USB drive (usually auto-mounted)
ls /media/pi/

# Run the setup script
bash /media/pi/*/setup-ssh-key.sh

# Or manually:
mkdir -p ~/.ssh && chmod 700 ~/.ssh
cat /media/pi/*/id_rsa.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Test
```powershell
.\test-ssh-auth.ps1 1
```

---

## For PuTTY Users

### After Adding SSH Key (Method 1):

1. **Convert Key to PuTTY Format:**
   - Open PuTTYgen (`C:\Program Files\PuTTY\puttygen.exe`)
   - Click "Load"
   - Navigate to: `C:\Users\baltz\.ssh\id_rsa`
     - Change file filter to "All Files (*.*)"
   - Click "Save private key" → Save as `id_rsa.ppk`

2. **Configure PuTTY:**
   - Open PuTTY
   - Host Name: `192.168.0.48`
   - Port: `22`
   - Connection type: `SSH`
   - Go to: **Connection → SSH → Auth**
   - Browse and select your `id_rsa.ppk` file
   - Go back to **Session**
   - Enter name: "Raspberry Pi 1"
   - Click **Save**

3. **Connect:**
   - Double-click "Raspberry Pi 1"
   - Should connect without password!

---

## Quick Checklist

- [ ] Get SSH key command: `.\get-pi-command.ps1`
- [ ] Connect to Pi physically (keyboard/monitor)
- [ ] Run the command on the Pi
- [ ] Test: `.\test-ssh-auth.ps1 1`
- [ ] Connect: `.\connect-ssh.ps1 1`
- [ ] Enable telnet: `.\enable-telnet-remote.ps1`

---

## Troubleshooting

### "Permission denied" after adding key
- Make sure you copied the ENTIRE command (it's very long)
- Check permissions on Pi: `ls -la ~/.ssh/authorized_keys`
- Should show: `-rw-------` (600 permissions)

### "Connection refused"
- SSH service may not be running
- On Pi: `sudo systemctl enable ssh && sudo systemctl start ssh`

### PuTTY still shows error
- Make sure you converted the key to `.ppk` format
- Make sure you selected the `.ppk` file in PuTTY (not the `.ssh` folder)
- Try removing old host key: `.\fix-ssh-connection.ps1`

---

## After Authentication Works

Once you can connect:

```powershell
# Enable telnet on all Pis
.\enable-telnet-remote.ps1

# Test telnet
.\connect-telnet.ps1 1
```

---

## Summary

**The main issue:** Your SSH key needs to be on the Pi.

**The solution:** Physical access to Pi + run one command.

**The command:** Get it with `.\get-pi-command.ps1` and run it on the Pi.

That's it! Once the key is added, everything will work.

