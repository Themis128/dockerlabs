# Quick Setup Guide - Open Ports 22 and 23

## Option 1: Automated Setup (if SSH keys are configured)

```powershell
.\open-ports.ps1
```

## Option 2: Manual Setup on Each Raspberry Pi

### Step 1: Connect to the Pi
```powershell
# Connect via SSH (Ethernet preferred)
.\connect-ssh.ps1 1
```

### Step 2: Run the setup script on the Pi

Once connected to the Pi, run:
```bash
# Copy the manual script to the Pi first, or run commands directly:

# For UFW (most common):
sudo ufw allow 22/tcp
sudo ufw allow 23/tcp
sudo ufw enable
sudo systemctl enable ssh
sudo systemctl start ssh

# For iptables (if UFW not available):
sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
sudo iptables -A INPUT -p tcp --dport 23 -j ACCEPT
sudo iptables-save | sudo tee /etc/iptables/rules.v4
```

### Step 3: Enable Telnet (optional)
```bash
sudo apt-get update -y
sudo apt-get install -y telnetd inetutils-inetd
sudo systemctl enable inetd
sudo systemctl start inetd
```

## Option 3: Copy Script to Pi

1. Copy `open-ports-manual.sh` to the Pi:
   ```powershell
   scp .\open-ports-manual.sh pi@192.168.0.48:/tmp/
   ```

2. SSH into the Pi and run:
   ```bash
   ssh pi@192.168.0.48
   bash /tmp/open-ports-manual.sh
   ```

## Verify Ports Are Open

After configuration, test from your Windows machine:
```powershell
.\test-connections.ps1
```

You should see:
- ✓ Port 22 open (SSH)
- ✓ Port 23 open (Telnet) - if telnet is enabled

## Raspberry Pi IP Addresses

### Ethernet (Priority)
- Pi 1: `192.168.0.48`
- Pi 2: `192.168.0.16`

### WiFi
- Pi 1: `192.168.0.17`
- Pi 2: `192.168.0.41`

## Troubleshooting

### SSH Permission Denied
If you get "Permission denied (publickey)", you need to:
1. Use password authentication (if enabled)
2. Set up SSH keys
3. Or configure manually on the Pi directly

### Port Still Closed
1. Check firewall status: `sudo ufw status`
2. Verify service is running: `sudo systemctl status ssh`
3. Check if port is listening: `sudo netstat -tuln | grep -E '(22|23)'`
