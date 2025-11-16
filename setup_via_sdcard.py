#!/usr/bin/env python3
"""
Create files for SD card setup (when you can access SD card)
Usage: python setup_via_sdcard.py
"""

import os
import sys


def get_ssh_public_key():
    """Get SSH public key"""
    home = os.path.expanduser("~")
    ssh_key_path = os.path.join(home, ".ssh", "id_rsa.pub")

    if not os.path.exists(ssh_key_path):
        print("ERROR: SSH public key not found!")
        print(f"Expected at: {ssh_key_path}")
        print("\nGenerate one with:")
        print("  ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa")
        return None

    with open(ssh_key_path, "r") as f:
        return f.read().strip()


def main():
    print("=" * 60)
    print("SD Card Setup Instructions")
    print("=" * 60)
    print()

    public_key = get_ssh_public_key()

    if not public_key:
        sys.exit(1)

    print("Step 1: Enable SSH")
    print("-" * 60)
    print("On the SD card boot partition, create an empty file named 'ssh'")
    print("(No extension, just 'ssh')")
    print()
    print("Or add to config.txt:")
    print("  enable_uart=1")
    print()

    print("Step 2: Enable Password Authentication")
    print("-" * 60)
    print("Mount the root partition and edit:")
    print("  /etc/ssh/sshd_config")
    print()
    print("Change or add:")
    print("  PasswordAuthentication yes")
    print()
    print("Or create a script to run on first boot:")
    print()

    # Create setup script
    setup_script = """#!/bin/bash
# Run this script on the Pi after first boot
# Or add to /etc/rc.local

# Enable password authentication
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Restart SSH
systemctl restart ssh

echo "Password authentication enabled"
"""

    print(setup_script)
    print()

    print("Step 3: Add SSH Key")
    print("-" * 60)
    print("On the SD card root partition, create:")
    print("  /home/pi/.ssh/authorized_keys")
    print()
    print("Add your public key:")
    print()
    print(public_key)
    print()
    print("Or create a script to add it on first boot:")
    print()

    key_script = f"""#!/bin/bash
# Add SSH key on first boot

mkdir -p /home/pi/.ssh
chmod 700 /home/pi/.ssh
echo '{public_key}' >> /home/pi/.ssh/authorized_keys
chmod 600 /home/pi/.ssh/authorized_keys
chown -R pi:pi /home/pi/.ssh

echo "SSH key added"
"""

    print(key_script)
    print()

    print("=" * 60)
    print("Complete Setup Script (for first boot)")
    print("=" * 60)
    print()

    complete_script = f"""#!/bin/bash
# Complete setup script - add to /etc/rc.local or run manually

# Enable password authentication
sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config
sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config

# Add SSH key
mkdir -p /home/pi/.ssh
chmod 700 /home/pi/.ssh
echo '{public_key}' >> /home/pi/.ssh/authorized_keys
chmod 600 /home/pi/.ssh/authorized_keys
chown -R pi:pi /home/pi/.ssh

# Restart SSH
systemctl restart ssh

# Open ports
ufw allow 22/tcp
ufw allow 23/tcp
ufw --force enable

# Install and enable telnet
apt-get update -y
apt-get install -y telnetd inetutils-inetd
systemctl enable inetd
systemctl start inetd

echo "Setup complete!"
"""

    print(complete_script)
    print()

    print("=" * 60)
    print("Files to Create on SD Card")
    print("=" * 60)
    print()
    print("1. Boot partition: Create empty file 'ssh'")
    print("2. Root partition: /home/pi/.ssh/authorized_keys")
    print("   Content:", public_key[:50] + "...")
    print("3. Root partition: /etc/ssh/sshd_config")
    print("   Add: PasswordAuthentication yes")
    print()
    print("Or use the complete script above in /etc/rc.local")
    print()


if __name__ == "__main__":
    main()
