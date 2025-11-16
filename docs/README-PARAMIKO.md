# Paramiko SSH Connection Scripts

These scripts use Paramiko (Python SSH library) for better password authentication support.

## Installation

```bash
pip install paramiko
```

## Usage

### Test Authentication

Test which authentication methods work:

```bash
python test_auth_paramiko.py 1
```

This will test:
- SSH key authentication
- Password authentication

### Connect via SSH

**Interactive session (prompts for password):**
```bash
python connect_ssh_paramiko.py 1
```

**With password:**
```bash
python connect_ssh_paramiko.py 1 -p your_password
```

**With SSH key:**
```bash
python connect_ssh_paramiko.py 1 -k ~/.ssh/id_rsa
```

**Execute single command:**
```bash
python connect_ssh_paramiko.py 1 --command "ls -la"
python connect_ssh_paramiko.py 1 -p your_password --command "sudo apt-get update"
```

## Features

- ✅ Supports password authentication (better than subprocess)
- ✅ Supports SSH key authentication
- ✅ Interactive shell session
- ✅ Execute single commands
- ✅ Ethernet prioritized (auto mode)
- ✅ Better error handling

## Examples

### Connect and run commands interactively:
```bash
python connect_ssh_paramiko.py 1
# Will prompt for password if not provided
# Then you can type commands like:
# $ ls -la
# $ sudo apt-get update
# $ exit
```

### Enable telnet remotely:
```bash
python connect_ssh_paramiko.py 1 -p your_password --command "sudo apt-get install -y telnetd inetutils-inetd && sudo systemctl enable inetd && sudo systemctl start inetd"
```

### Add SSH key remotely:
```bash
# First get your public key
python get_pi_command.py

# Then add it via Paramiko
python connect_ssh_paramiko.py 1 -p your_password --command "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo 'YOUR_PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

## Advantages over subprocess SSH

- Better password handling
- More reliable authentication
- Can execute commands programmatically
- Better error messages
- Works better on Windows

## Troubleshooting

### "paramiko not installed"
```bash
pip install paramiko
```

### "Authentication failed"
- Check password is correct
- Verify password authentication is enabled on Pi
- Make sure SSH service is restarted after enabling password auth

### "Connection timeout"
- Check Pi is reachable: `python test_connections.py`
- Verify SSH port 22 is open
