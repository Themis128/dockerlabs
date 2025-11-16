# Quick Start: SSH Access Setup

## Current Status
- ✅ All 4 Raspberry Pis are reachable (ping OK)
- ✅ SSH port 22 is open on all Pis
- ⚠️ SSH authentication needs to be configured (keys or password)
- ⚠️ Telnet port 23 is not enabled yet

## Your SSH Public Key
```
ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDSbHoqjC7lIXx7wrSYGT/wmJb4YjteWNFqPcOgnMFlfcF7bnVoveTKxilsCCDpNV6Oy72cVZwGmPhquVNRQmTC86zd7V9aI31c5T2tdWxuP3/qgTmKEoBqRC2gd0EXdc7V+Joo0SSjA0ANkklcWibaJiDWfso2BofiICI00g0eytE7aOySZ0BUOCIPKMNa2Hgz/H3/IKOcvOlBolN4JFym9n+FAW0I8WE1xjCre5PhD/b1xuTCDefFlQvV23GARgHXpC2V6kuaV7LqLQCW7TSbgP4V/fN8S7p1HalOFNoLcP+o/H5x5quqRFpte1nnjGMfSbhnz982sUi7zwtjc6Lh+3Q4HAKHMJL8++IK+PdzGDurkC5mJPLnxJ3t7SnSVMcokTGoEIFIdHCPtaRQyyLdjaREeGFfxslmvkpWaDnN6f9pR6LeW18rMDBj2ZJ/1GpVKTIVvuKfIYQOCtzSgvagp4YIne0I6DwVIgEH0qkHMpkFULxn/R7Vazxwvua325WZKE0QiK73PRG2v43jj9Cr7r77Rn+vk1pDWBZ9/KdTmnVfTVwT7aUQfDvcA9ZLDaPTUgZRg3T6EeNgR2bZdfSJjbA98V8WG+a+4rC1E6PVpKT99FBHe5AT1sUMymhs03RkNgaI7UkJb3qcs+HDWU7VYNHkjgX8+GpAPNUL4MQiUQ== raspberry-pi-access
```

## Method 1: Add SSH Key via Physical Access (Recommended)

### For Each Pi (192.168.0.48, 192.168.0.16, 192.168.0.17, 192.168.0.41):

1. **Connect keyboard and monitor to the Pi**
2. **Log in as `pi` user**
3. **Copy and paste this entire command:**

```bash
mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQDSbHoqjC7lIXx7wrSYGT/wmJb4YjteWNFqPcOgnMFlfcF7bnVoveTKxilsCCDpNV6Oy72cVZwGmPhquVNRQmTC86zd7V9aI31c5T2tdWxuP3/qgTmKEoBqRC2gd0EXdc7V+Joo0SSjA0ANkklcWibaJiDWfso2BofiICI00g0eytE7aOySZ0BUOCIPKMNa2Hgz/H3/IKOcvOlBolN4JFym9n+FAW0I8WE1xjCre5PhD/b1xuTCDefFlQvV23GARgHXpC2V6kuaV7LqLQCW7TSbgP4V/fN8S7p1HalOFNoLcP+o/H5x5quqRFpte1nnjGMfSbhnz982sUi7zwtjc6Lh+3Q4HAKHMJL8++IK+PdzGDurkC5mJPLnxJ3t7SnSVMcokTGoEIFIdHCPtaRQyyLdjaREeGFfxslmvkpWaDnN6f9pR6LeW18rMDBj2ZJ/1GpVKTIVvuKfIYQOCtzSgvagp4YIne0I6DwVIgEH0qkHMpkFULxn/R7Vazxwvua325WZKE0QiK73PRG2v43jj9Cr7r77Rn+vk1pDWBZ9/KdTmnVfTVwT7aUQfDvcA9ZLDaPTUgZRg3T6EeNgR2bZdfSJjbA98V8WG+a+4rC1E6PVpKT99FBHe5AT1sUMymhs03RkNgaI7UkJb3qcs+HDWU7VYNHkjgX8+GpAPNUL4MQiUQ== raspberry-pi-access' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key added successfully!'
```

4. **You should see:** `SSH key added successfully!`

## Method 2: Enable Password Authentication (Alternative)

If you prefer password authentication:

**On each Pi (via physical access):**

```bash
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo systemctl restart ssh
```

Then you can connect with password:
```powershell
.\connect-ssh.ps1 1  # Will prompt for password
```

## Method 3: USB Drive Transfer

1. **Insert a USB drive**
2. **Run from Windows:**
   ```powershell
   .\copy-key-to-usb.ps1
   ```
3. **Insert USB into Pi**
4. **On the Pi, run:**
   ```bash
   bash /media/pi/*/setup-ssh-key.sh
   # or find the mount point manually
   ```

## After SSH is Working

### Test Connection
```powershell
.\connect-ssh.ps1 1  # Pi 1 via Ethernet (192.168.0.48)
.\connect-ssh.ps1 2  # Pi 2 via Ethernet (192.168.0.16)
```

### Enable Telnet on All Pis
```powershell
.\enable-telnet-remote.ps1
```

This will automatically:
- Install telnetd on each Pi
- Enable and start the telnet service
- Open port 23 in the firewall

### Test Telnet Connection
```powershell
.\connect-telnet.ps1 1  # Pi 1 via Ethernet
.\connect-telnet.ps1 2  # Pi 2 via Ethernet
```

## Raspberry Pi IP Addresses

### Ethernet (Priority)
- **Pi 1:** 192.168.0.48
- **Pi 2:** 192.168.0.16

### WiFi (Fallback)
- **Pi 1:** 192.168.0.17
- **Pi 2:** 192.168.0.41

## Quick Commands Reference

```powershell
# Setup and testing
.\setup-ssh-access.ps1      # Comprehensive SSH setup guide
.\get-pi-command.ps1        # Show SSH key command
.\test-connections.ps1       # Test all connections
.\fix-ssh-connection.ps1    # Fix known_hosts issues

# Connections (Ethernet prioritized)
.\connect-ssh.ps1 1         # SSH to Pi 1 via Ethernet
.\connect-ssh.ps1 2         # SSH to Pi 2 via Ethernet
.\connect-telnet.ps1 1      # Telnet to Pi 1 via Ethernet
.\connect-telnet.ps1 2      # Telnet to Pi 2 via Ethernet

# Configuration
.\enable-telnet-remote.ps1  # Enable telnet on all Pis
.\open-ports.ps1            # Open ports 22 and 23
.\setup-all-pis.ps1         # Complete setup guide
```

## Troubleshooting

### "Permission denied (publickey)"
- SSH key not added yet - use Method 1 or 2 above

### "Connection refused"
- SSH service may not be running
- On Pi: `sudo systemctl enable ssh && sudo systemctl start ssh`

### "Host key verification failed"
- Run: `.\fix-ssh-connection.ps1` to clean known_hosts

### Telnet not working
- Run: `.\enable-telnet-remote.ps1` after SSH is working
- Or manually on Pi: `sudo apt-get install -y telnetd inetutils-inetd && sudo systemctl enable inetd && sudo systemctl start inetd`
