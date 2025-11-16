#!/usr/bin/env python3
"""
Test connectivity to all Raspberry Pis
Usage: python test_connections.py
"""

import json
import subprocess
import socket
import sys

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def test_ping(ip, count=2):
    """Test ping connectivity"""
    try:
        result = subprocess.run(
            ['ping', '-n' if sys.platform == 'win32' else '-c', str(count), ip],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False

def test_port(ip, port, timeout=2):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False

def test_pi(pi_name, ip, connection_type):
    """Test connectivity to a single Pi"""
    print(f"Testing: {pi_name} ({ip}) via {connection_type}")

    # Test ping
    print("  [Ping] ", end='', flush=True)
    if test_ping(ip):
        print("OK")
    else:
        print("FAILED")
        return

    # Test SSH
    print("  [SSH]  ", end='', flush=True)
    if test_port(ip, 22):
        print(f"Port 22 open")
    else:
        print("Port 22 closed/timeout")

    # Test Telnet
    print("  [Telnet] ", end='', flush=True)
    if test_port(ip, 23):
        print(f"Port 23 open")
    else:
        print("Port 23 closed (telnet not enabled)")

    print()

def main():
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    print("=" * 40)
    print("Testing Raspberry Pi Connectivity")
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

    # Test Ethernet Pis first (priority)
    print("ETHERNET CONNECTIONS:")
    print("-" * 20)
    for pi in ethernet_pis:
        test_pi(pi['name'], pi['ip'], pi['connection'])

    # Test WiFi Pis
    print("WIFI CONNECTIONS:")
    print("-" * 17)
    for pi in wifi_pis:
        test_pi(pi['name'], pi['ip'], pi['connection'])

    print("=" * 40)
    print("Test Complete!")
    print("=" * 40)

if __name__ == '__main__':
    main()
