# Python Scripts for Raspberry Pi Connection

All scripts are now in Python! These scripts prioritize Ethernet connections
over WiFi.

## Quick Start

### List All Raspberry Pis

```bash
python list_pis.py
```

### Test All Connections

```bash
python test_connections.py
```

### Get SSH Key Command

```bash
python get_pi_command.py
```

Then run the command on the Pi (physical access required).

### Test SSH Authentication

```bash
python test_ssh_auth.py 1  # Test Pi 1
python test_ssh_auth.py 2  # Test Pi 2
```

### Connect via SSH (Ethernet First)

```bash
python connect_ssh.py 1    # Pi 1 via Ethernet
python connect_ssh.py 2    # Pi 2 via Ethernet

# Force connection type
python connect_ssh.py 1 -c ethernet  # Force Ethernet
python connect_ssh.py 1 -c wifi      # Force WiFi
```

### Connect via Telnet (Ethernet First)

```bash
python connect_telnet.py 1    # Pi 1 via Ethernet
python connect_telnet.py 2    # Pi 2 via Ethernet
```

### Enable Telnet on All Pis

```bash
python enable_telnet_remote.py
```

(Requires SSH authentication to be working first)

## Available Scripts

| Script                    | Description                                      |
| ------------------------- | ------------------------------------------------ |
| `list_pis.py`             | List all configured Raspberry Pis                |
| `test_connections.py`     | Test connectivity to all Pis (ping, SSH, telnet) |
| `test_ssh_auth.py`        | Test SSH authentication methods                  |
| `get_pi_command.py`       | Get command to add SSH key to Pi                 |
| `connect_ssh.py`          | Connect to Pi via SSH (Ethernet prioritized)     |
| `connect_telnet.py`       | Connect to Pi via Telnet (Ethernet prioritized)  |
| `enable_telnet_remote.py` | Enable telnet on all Pis via SSH                 |

## Requirements

- Python 3.6+
- SSH client installed (for SSH connections)
- Telnet client (optional, for telnet connections)

## Raspberry Pi IP Addresses

### Ethernet (Priority)

- **Pi 1:** 192.168.0.48
- **Pi 2:** 192.168.0.16

### WiFi (Fallback)

- **Pi 1:** 192.168.0.17
- **Pi 2:** 192.168.0.41

## Setup Steps

1. **Add SSH Key to Pi** (physical access required):

   ```bash
   python get_pi_command.py
   # Copy command and run on Pi
   ```

2. **Test Authentication**:

   ```bash
   python test_ssh_auth.py 1
   ```

3. **Connect**:

   ```bash
   python connect_ssh.py 1
   ```

4. **Enable Telnet**:

   ```bash
   python enable_telnet_remote.py
   ```

5. **Test Telnet**:
   ```bash
   python connect_telnet.py 1
   ```

## Command Line Options

### connect_ssh.py

```bash
python connect_ssh.py [pi_number] [-u USERNAME] [-c CONNECTION_TYPE]

Options:
  pi_number        Pi number (1 or 2), default: 1
  -u, --username   SSH username, default: pi
  -c, --connection Connection type: ethernet, wifi, or auto (default: auto)
```

### connect_telnet.py

```bash
python connect_telnet.py [pi_number] [-p PORT] [-c CONNECTION_TYPE]

Options:
  pi_number        Pi number (1 or 2), default: 1
  -p, --port       Telnet port, default: 23
  -c, --connection Connection type: ethernet, wifi, or auto (default: auto)
```

## Notes

- All scripts prioritize **Ethernet connections** over WiFi
- If Ethernet Pi is not found, scripts automatically fall back to WiFi
- SSH key must be added to Pi before connecting (see `get_pi_command.py`)
- Telnet must be enabled on Pi before connecting (see `enable_telnet_remote.py`)
