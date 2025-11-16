#!/usr/bin/env python3
"""
Test SSH Authentication Methods
Usage: python test_ssh_auth.py [pi_number]
"""

import sys
import json
import subprocess
import socket
import argparse

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def test_port(ip, port, timeout=3):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False

def test_ssh_key_auth(ip, username):
    """Test SSH key authentication"""
    try:
        result = subprocess.run(
            ['ssh', '-o', 'ConnectTimeout=5', '-o', 'StrictHostKeyChecking=no',
             '-o', 'BatchMode=yes', f'{username}@{ip}', 'echo test'],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False

def main():
    parser = argparse.ArgumentParser(description='Test SSH authentication')
    parser.add_argument('pi_number', type=int, nargs='?', default=1, choices=[1, 2],
                       help='Pi number (1 or 2)')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')

    args = parser.parse_args()

    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    # Get Ethernet Pi (priority)
    all_pis = config['raspberry_pis']
    ethernet_pis = []

    for key, pi in all_pis.items():
        if pi['connection'] == 'Wired':
            ethernet_pis.append(pi)

    if args.pi_number > len(ethernet_pis):
        print(f"ERROR: Ethernet Pi #{args.pi_number} not found")
        sys.exit(1)

    selected_pi = ethernet_pis[args.pi_number - 1]

    print("=" * 40)
    print("Testing SSH Authentication")
    print("=" * 40)
    print(f"Pi: {selected_pi['name']} ({selected_pi['ip']})")
    print()

    # Test 1: SSH Key Authentication
    print("Test 1: SSH Key Authentication")
    print("-" * 30)
    if test_ssh_key_auth(selected_pi['ip'], args.username):
        print("SSH key authentication WORKS!")
        print(f"  You can connect with: python connect_ssh.py {args.pi_number}")
        sys.exit(0)
    else:
        print("SSH key authentication FAILED")
        print("  Your SSH key is not added to this Pi")

    print()
    print("=" * 40)
    print("Solutions")
    print("=" * 40)
    print()
    print("Option A: Add SSH Key (Recommended)")
    print("  1. Run: python get_pi_command.py")
    print("  2. Connect to Pi physically (keyboard/monitor)")
    print("  3. Run the command shown on the Pi")
    print("  4. Test again: python test_ssh_auth.py", args.pi_number)
    print()
    print("Option B: Enable Password Authentication")
    print("  On the Pi (physical access), run:")
    print("    sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/; s/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config")
    print("    sudo systemctl restart ssh")
    print("  Then test: python test_ssh_auth.py", args.pi_number)
    print()

if __name__ == '__main__':
    main()
