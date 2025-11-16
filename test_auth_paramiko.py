#!/usr/bin/env python3
"""
Test SSH authentication methods using Paramiko
Usage: python test_auth_paramiko.py [pi_number]
"""

import sys
import json
import socket
import argparse
import getpass

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko not installed")
    print("Install it with: pip install paramiko")
    sys.exit(1)

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

def test_key_auth(ip, username, key_file=None):
    """Test SSH key authentication"""
    import os
    if not key_file:
        key_file = os.path.join(os.path.expanduser('~'), '.ssh', 'id_rsa')

    if not os.path.exists(key_file):
        return False, "Key file not found"

    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        key = paramiko.RSAKey.from_private_key_file(key_file)
        client.connect(ip, username=username, pkey=key, timeout=5)
        client.close()
        return True, "Key authentication works!"
    except paramiko.AuthenticationException:
        return False, "Key not authorized on server"
    except Exception as e:
        return False, str(e)

def test_password_auth(ip, username, password=None):
    """Test password authentication"""
    try:
        client = paramiko.SSHClient()
        client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

        if not password:
            password = getpass.getpass(f"Enter password for {username}@{ip}: ")

        client.connect(ip, username=username, password=password, timeout=5)
        client.close()
        return True, "Password authentication works!"
    except paramiko.AuthenticationException:
        return False, "Wrong password or password auth disabled"
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description='Test SSH authentication with Paramiko')
    parser.add_argument('pi_number', type=int, nargs='?', default=1, choices=[1, 2],
                       help='Pi number (1 or 2)')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')
    parser.add_argument('-p', '--password', help='SSH password (will prompt if not provided)')

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

    print("=" * 60)
    print("Testing SSH Authentication with Paramiko")
    print("=" * 60)
    print(f"Pi: {selected_pi['name']} ({selected_pi['ip']})")
    print()

    # Test SSH port
    if not test_port(selected_pi['ip'], 22):
        print("ERROR: SSH port 22 is not accessible")
        sys.exit(1)

    print("SSH port 22: OPEN")
    print()

    # Test key authentication
    print("Test 1: SSH Key Authentication")
    print("-" * 60)
    import os
    key_file = os.path.join(os.path.expanduser('~'), '.ssh', 'id_rsa')
    if os.path.exists(key_file):
        success, message = test_key_auth(selected_pi['ip'], args.username, key_file)
        if success:
            print(f"SUCCESS: {message}")
            print(f"You can connect with: python connect_ssh_paramiko.py {args.pi_number} -k {key_file}")
        else:
            print(f"FAILED: {message}")
    else:
        print("SKIPPED: SSH key file not found")
    print()

    # Test password authentication
    print("Test 2: Password Authentication")
    print("-" * 60)
    success, message = test_password_auth(selected_pi['ip'], args.username, args.password)
    if success:
        print(f"SUCCESS: {message}")
        print(f"You can connect with: python connect_ssh_paramiko.py {args.pi_number}")
    else:
        print(f"FAILED: {message}")
    print()

    print("=" * 60)
    print("Connection Commands")
    print("=" * 60)
    print()
    print("If password auth works:")
    print(f"  python connect_ssh_paramiko.py {args.pi_number}")
    print()
    print("If key auth works:")
    print(f"  python connect_ssh_paramiko.py {args.pi_number} -k ~/.ssh/id_rsa")
    print()
    print("Execute single command:")
    print(f"  python connect_ssh_paramiko.py {args.pi_number} --command 'ls -la'")

if __name__ == '__main__':
    main()
