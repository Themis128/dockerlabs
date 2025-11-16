#!/usr/bin/env python3
"""
Generate one-line command to add SSH key to Raspberry Pi
Usage: python get_pi_command.py
"""

import os
import sys

def get_ssh_public_key():
    """Get SSH public key from user's .ssh directory"""
    home = os.path.expanduser("~")
    ssh_key_path = os.path.join(home, '.ssh', 'id_rsa.pub')

    if not os.path.exists(ssh_key_path):
        print("ERROR: SSH public key not found!")
        print(f"Expected at: {ssh_key_path}")
        print("\nGenerate one with:")
        print("  ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa")
        sys.exit(1)

    with open(ssh_key_path, 'r') as f:
        return f.read().strip()

def main():
    public_key = get_ssh_public_key()

    print("=" * 40)
    print("One-Line Command for Raspberry Pi")
    print("=" * 40)
    print()
    print("Copy and paste this ENTIRE command on the Pi:")
    print()

    # Escape single quotes for bash
    escaped_key = public_key.replace("'", "'\"'\"'")

    command = f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{escaped_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys && echo 'SSH key added successfully!'"

    print(command)
    print()
    print("=" * 40)
    print("Or use this shorter version:")
    print("=" * 40)
    print()

    short_command = f"mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '{escaped_key}' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
    print(short_command)
    print()
    print("=" * 40)
    print("After running on the Pi, test from Windows:")
    print("=" * 40)
    print("  python test_ssh_auth.py 1  # For 192.168.0.48")
    print("  python connect_ssh.py 1    # For 192.168.0.48")

if __name__ == '__main__':
    main()
