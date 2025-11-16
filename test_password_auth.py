#!/usr/bin/env python3
"""
Test if password authentication is enabled on Raspberry Pis
Usage: python test_password_auth.py [pi_number]
"""

import sys
import json
import subprocess
import socket
import argparse
import getpass

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

def test_password_auth(ip, username, password):
    """Test password authentication using sshpass or expect"""
    # Try sshpass first (if available)
    try:
        result = subprocess.run(
            ['sshpass', '-p', password, 'ssh', '-o', 'StrictHostKeyChecking=no',
             '-o', 'ConnectTimeout=5', f'{username}@{ip}', 'echo test'],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except FileNotFoundError:
        # sshpass not available, try interactive
        return None
    except:
        return False

def main():
    parser = argparse.ArgumentParser(description='Test password authentication')
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
    print("Testing Password Authentication")
    print("=" * 40)
    print(f"Pi: {selected_pi['name']} ({selected_pi['ip']})")
    print()

    # Test SSH port
    if not test_port(selected_pi['ip'], 22):
        print("ERROR: SSH port 22 is not accessible")
        sys.exit(1)

    print("SSH port 22 is open")
    print()
    print("Testing password authentication...")
    print("(This will attempt to connect - you may see password prompts)")
    print()

    # Try interactive connection
    print("Attempting interactive SSH connection...")
    print("If password authentication is enabled, you'll be prompted for password.")
    print("If you see 'Permission denied', password auth is disabled.")
    print()

    try:
        # Try to connect interactively
        result = subprocess.run(
            ['ssh', '-o', 'StrictHostKeyChecking=accept-new',
             '-o', 'ConnectTimeout=10', f'{args.username}@{selected_pi["ip"]}'],
            timeout=30
        )

        if result.returncode == 0:
            print("\nSUCCESS: Password authentication works!")
            print(f"You can connect with: python connect_ssh.py {args.pi_number}")
        else:
            print("\nPassword authentication failed or is disabled")
            print("You need to enable password auth or add SSH key")

    except subprocess.TimeoutExpired:
        print("\nConnection attempt timed out")
    except KeyboardInterrupt:
        print("\nConnection interrupted")
    except Exception as e:
        print(f"\nError: {e}")

    print()
    print("=" * 40)
    print("Alternative Solutions (No Physical Access)")
    print("=" * 40)
    print()
    print("Option 1: Check if you have access from another machine")
    print("  - If you can SSH from another computer, you can:")
    print("    1. Add your SSH key from that machine")
    print("    2. Enable password auth from that machine")
    print()
    print("Option 2: Use serial console (if available)")
    print("  - If Pi has serial/USB console access")
    print("  - Connect via serial port and configure")
    print()
    print("Option 3: Check router/network management")
    print("  - Some routers allow remote management")
    print("  - May provide console access to devices")
    print()
    print("Option 4: Contact someone with physical access")
    print("  - Provide them the command from: python get_pi_command.py")
    print("  - They can run it on the Pi for you")

if __name__ == '__main__':
    main()
