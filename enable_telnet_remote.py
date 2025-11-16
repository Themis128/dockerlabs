#!/usr/bin/env python3
"""
Enable Telnet on all Raspberry Pis via SSH
Usage: python enable_telnet_remote.py [username]
"""

import sys
import json
import subprocess
import socket
import argparse
import time

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def test_ping(ip):
    """Test ping connectivity"""
    try:
        result = subprocess.run(
            ['ping', '-n' if sys.platform == 'win32' else '-c', '2', ip],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False

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

def enable_telnet_on_pi(pi_name, ip, connection_type, username):
    """Enable telnet on a single Pi"""
    print(f"Processing: {pi_name} ({ip}) via {connection_type}")

    # Test connectivity
    if not test_ping(ip):
        print("  Cannot reach", ip, "- skipping")
        return False

    # Test SSH port
    if not test_port(ip, 22):
        print("  SSH port 22 not accessible - skipping")
        return False

    print("  SSH available, enabling telnet...")

    # Remove old host key
    try:
        subprocess.run(['ssh-keygen', '-R', ip], capture_output=True, timeout=5)
    except:
        pass

    # Setup command
    telnet_cmd = (
        "sudo apt-get update -y && "
        "sudo apt-get install -y telnetd inetutils-inetd && "
        "sudo systemctl enable inetd && "
        "sudo systemctl start inetd && "
        "sleep 2 && "
        "sudo systemctl status inetd --no-pager | head -5"
    )

    try:
        print("    Installing and configuring telnet...")
        result = subprocess.run(
            ['ssh', '-o', 'StrictHostKeyChecking=accept-new',
             '-o', 'ConnectTimeout=15', f'{username}@{ip}', telnet_cmd],
            capture_output=True,
            timeout=60
        )

        if result.returncode == 0:
            print("    Telnet setup completed")
        else:
            print("    WARNING: Setup may have issues")
            if result.stderr:
                print(f"    Error: {result.stderr.decode()[:200]}")

        # Wait for service to start
        time.sleep(3)

        # Verify telnet port
        if test_port(ip, 23):
            print("  Telnet enabled and running on port 23")
            return True
        else:
            print("  WARNING: Telnet port not open yet. Service may need a moment.")
            return False

    except subprocess.TimeoutExpired:
        print("  Connection timeout")
        return False
    except Exception as e:
        print(f"  Error: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description='Enable telnet on all Raspberry Pis')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')

    args = parser.parse_args()

    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    print("=" * 40)
    print("Enabling Telnet on All Raspberry Pis")
    print("=" * 40)
    print()

    all_pis = config['raspberry_pis']
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi['connection'] == 'Wired':
            ethernet_pis.append(pi)
        elif pi['connection'] == '2.4G':
            wifi_pis.append(pi)

    # Process Ethernet Pis first (priority)
    print("ETHERNET CONNECTIONS (Priority):")
    print("-" * 33)
    for pi in ethernet_pis:
        enable_telnet_on_pi(pi['name'], pi['ip'], pi['connection'], args.username)
        print()

    # Process WiFi Pis
    print("WIFI CONNECTIONS:")
    print("-" * 17)
    for pi in wifi_pis:
        enable_telnet_on_pi(pi['name'], pi['ip'], pi['connection'], args.username)
        print()

    print("=" * 40)
    print("Setup Complete!")
    print("=" * 40)
    print()
    print("Testing all connections...")
    print()

    # Run test script
    subprocess.run([sys.executable, 'test_connections.py'])

if __name__ == '__main__':
    main()
