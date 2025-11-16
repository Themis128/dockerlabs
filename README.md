# Raspberry Pi SSH and Telnet Connection Scripts

This project provides PowerShell scripts to easily connect to your Raspberry Pis via SSH and Telnet, using both Ethernet and WiFi connections.

## Raspberry Pi Configuration

### Ethernet Connections
1. **Pi 1 (Ethernet)**
   - IP: `192.168.0.48`
   - MAC: `B8-27-EB-74-83-19`
   - Name: `pi`

2. **Pi 2 (Ethernet)**
   - IP: `192.168.0.16`
   - MAC: `D8-3A-DD-AF-C9-2B`
   - Name: `pi`

### WiFi Connections
1. **Pi 1 (WiFi)**
   - IP: `192.168.0.17`
   - MAC: `D8-3A-DD-AF-C9-2C`
   - Name: `pi1`

2. **Pi 2 (WiFi)**
   - IP: `192.168.0.41`
   - MAC: `B8-27-EB-21-D6-4C`
   - Name: `pi2`

## Prerequisites

### SSH
- SSH should be enabled on your Raspberry Pis
- Default username is `pi` (can be changed via script parameter)
- SSH is typically enabled by default on modern Raspberry Pi OS
- **Important**: If you get "Permission denied (publickey)" errors, you need physical access to enable password authentication
  - See [SSH-SETUP.md](SSH-SETUP.md) for detailed instructions
  - See [PHYSICAL-ACCESS-SETUP.md](PHYSICAL-ACCESS-SETUP.md) for physical access methods
  - Quick reference: `.\quick-fix-pi.ps1`

### Telnet
- Telnet must be enabled on your Raspberry Pis (disabled by default for security)
- **Quick Setup**: Run the automated setup script:
  ```powershell
  .\setup-telnet.ps1
  ```
- **Manual Setup**: If automated setup doesn't work, SSH into each Pi and run:
  ```bash
  sudo apt-get update -y
  sudo apt-get install -y telnetd inetutils-inetd
  sudo systemctl enable inetd
  sudo systemctl start inetd
  ```
- Alternatively, copy `enable-telnet-on-pi.sh` to each Pi and run:
  ```bash
  bash enable-telnet-on-pi.sh
  ```

### Windows Telnet Client
If telnet is not available on Windows, enable it:
```powershell
# Run PowerShell as Administrator
Enable-WindowsOptionalFeature -Online -FeatureName TelnetClient
```

## Usage

### Test Connectivity
Test all Raspberry Pi connections (ping, SSH, telnet):
```powershell
.\test-connections.ps1
```

### Open Ports 22 and 23
Open ports 22 (SSH) and 23 (Telnet) on all Raspberry Pis:
```powershell
.\open-ports.ps1
```

### Enable Telnet on All Pis
Automatically enable telnet on all accessible Raspberry Pis:
```powershell
.\setup-telnet.ps1
```

### List All Raspberry Pis
```powershell
.\list-pis.ps1
```

### SSH Connections

**Primary Method (Ethernet First - Recommended):**
```powershell
# Automatically tries Ethernet first, falls back to WiFi if needed
.\connect-ssh.ps1 1              # Connect to Pi 1 (Ethernet preferred)
.\connect-ssh.ps1 2              # Connect to Pi 2 (Ethernet preferred)
.\connect-ssh.ps1 1 -Username "myuser"  # With custom username

# Force Ethernet connection
.\connect-ssh.ps1 1 -ConnectionType ethernet

# Force WiFi connection
.\connect-ssh.ps1 1 -ConnectionType wifi
```

**Legacy Methods (Specific Connection Type):**
```powershell
# Ethernet only
.\connect-ssh-ethernet.ps1 1
.\connect-ssh-ethernet.ps1 2

# WiFi only
.\connect-ssh-wifi.ps1 1
.\connect-ssh-wifi.ps1 2
```

### Telnet Connections

**Primary Method (Ethernet First - Recommended):**
```powershell
# Automatically tries Ethernet first, falls back to WiFi if needed
.\connect-telnet.ps1 1           # Connect to Pi 1 (Ethernet preferred)
.\connect-telnet.ps1 2           # Connect to Pi 2 (Ethernet preferred)
.\connect-telnet.ps1 1 -Port 2323  # With custom port

# Force Ethernet connection
.\connect-telnet.ps1 1 -ConnectionType ethernet

# Force WiFi connection
.\connect-telnet.ps1 1 -ConnectionType wifi
```

**Legacy Methods (Specific Connection Type):**
```powershell
# Ethernet only
.\connect-telnet-ethernet.ps1 1
.\connect-telnet-ethernet.ps1 2

# WiFi only
.\connect-telnet-wifi.ps1 1
.\connect-telnet-wifi.ps1 2
```

## Direct Connection Commands

If you prefer to connect directly without scripts:

### SSH
```powershell
# Ethernet Pi 1
ssh pi@192.168.0.48

# Ethernet Pi 2
ssh pi@192.168.0.16

# WiFi Pi 1
ssh pi@192.168.0.17

# WiFi Pi 2
ssh pi@192.168.0.41
```

### Telnet
```powershell
# Ethernet Pi 1
telnet 192.168.0.48 23

# Ethernet Pi 2
telnet 192.168.0.16 23

# WiFi Pi 1
telnet 192.168.0.17 23

# WiFi Pi 2
telnet 192.168.0.41 23
```

## Firewall Configuration

### Open Ports 22 and 23
To allow SSH (port 22) and Telnet (port 23) through the firewall:

**Automated (via SSH):**
```powershell
.\open-ports.ps1
```

**Manual (on each Pi):**
```bash
# Copy open-ports-manual.sh to the Pi and run:
bash open-ports-manual.sh

# Or manually:
sudo ufw allow 22/tcp
sudo ufw allow 23/tcp
sudo ufw enable
```

The script automatically detects and configures:
- UFW (Uncomplicated Firewall) - most common on Raspberry Pi OS
- firewalld - alternative firewall
- iptables - fallback option

## Troubleshooting

### Cannot Connect via SSH

**"Permission denied (publickey)" Error:**
- Your Pi is configured for SSH key authentication only
- **Quick Fix**: Set up SSH keys: `.\setup-ssh-keys.ps1`
- **Alternative**: Enable password authentication (see [SSH-SETUP.md](SSH-SETUP.md))

**Other SSH Issues:**
1. Verify the Raspberry Pi is powered on
2. Check network connectivity: `ping <pi-ip-address>`
3. Ensure SSH is enabled on the Pi: `sudo systemctl status ssh`
4. Verify you're on the same network
5. Check firewall settings on both devices
6. Remove old host keys: `ssh-keygen -R <pi-ip-address>`

### Cannot Connect via Telnet
1. Verify telnet is installed and running on the Raspberry Pi
2. Check if telnet service is active: `sudo systemctl status inetd`
3. Verify the port is open: `netstat -tuln | grep 23`
4. Check firewall rules on the Raspberry Pi

### Network Issues
- **Ethernet**: Ensure the cable is properly connected and the network interface is up
- **WiFi**: Verify WiFi is connected and signal strength is adequate
- Check IP addresses haven't changed (DHCP may assign new IPs)

## Security Notes

⚠️ **Warning**: Telnet transmits data in plain text and is not secure. Use SSH for production environments.

- SSH is encrypted and recommended for all connections
- Telnet should only be used for testing or in isolated networks
- Consider using SSH keys instead of passwords for better security

## Configuration File

The `pi-config.json` file contains all Raspberry Pi network information. You can modify this file to update IP addresses, add new Pis, or change connection details.
