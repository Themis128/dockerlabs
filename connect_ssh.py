#!/usr/bin/env python3
"""
SSH Connection Script - Prioritizes Ethernet, falls back to WiFi
Usage: python connect_ssh.py [pi_number] [username] [connection_type]
"""

import sys
import json
import subprocess
import socket
import time
import argparse

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def test_connectivity(ip, count=2):
    """Test network connectivity to IP"""
    try:
        result = subprocess.run(
            ['ping', '-n' if sys.platform == 'win32' else '-c', str(count), ip],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError) as e:
        # Network/system errors are expected in connectivity tests
        return False
    except Exception as e:
        # Log unexpected errors but don't crash
        print(f"Warning: Unexpected error in connectivity test: {e}", file=sys.stderr)
        return False

def test_port(ip, port, timeout=3):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except (socket.error, OSError, ValueError) as e:
        # Network/socket errors are expected in port tests
        return False
    except Exception as e:
        # Log unexpected errors but don't crash
        print(f"Warning: Unexpected error in port test: {e}", file=sys.stderr)
        return False

def select_pi(config, pi_number, connection_type='auto'):
    """Select Raspberry Pi based on number and connection type"""
    all_pis = config['raspberry_pis']
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi['connection'] == 'Wired':
            ethernet_pis.append(pi)
        elif pi['connection'] == '2.4G':
            wifi_pis.append(pi)

    selected_pi = None
    connection_method = ""

    if connection_type == 'auto':
        # ALWAYS try Ethernet first (priority)
        if ethernet_pis:
            idx = pi_number - 1
            if 0 <= idx < len(ethernet_pis):
                selected_pi = ethernet_pis[idx]
                connection_method = "Ethernet"

        # Only fall back to WiFi if Ethernet Pi not found
        if not selected_pi and wifi_pis:
            idx = pi_number - 1
            if 0 <= idx < len(wifi_pis):
                selected_pi = wifi_pis[idx]
                connection_method = "WiFi"
                print(f"WARNING: Ethernet Pi #{pi_number} not found, using WiFi fallback")

    elif connection_type == 'ethernet':
        idx = pi_number - 1
        if 0 <= idx < len(ethernet_pis):
            selected_pi = ethernet_pis[idx]
            connection_method = "Ethernet"

    elif connection_type == 'wifi':
        idx = pi_number - 1
        if 0 <= idx < len(wifi_pis):
            selected_pi = wifi_pis[idx]
            connection_method = "WiFi"

    return selected_pi, connection_method

def main():
    parser = argparse.ArgumentParser(description='Connect to Raspberry Pi via SSH')
    parser.add_argument('pi_number', type=int, nargs='?', default=1, choices=[1, 2],
                       help='Pi number (1 or 2)')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')
    parser.add_argument('-c', '--connection', choices=['ethernet', 'wifi', 'auto'],
                       default='auto', help='Connection type (default: auto, prioritizes Ethernet)')

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    # Select Pi
    selected_pi, connection_method = select_pi(config, args.pi_number, args.connection)

    if not selected_pi:
        print(f"ERROR: Raspberry Pi #{args.pi_number} not found")
        sys.exit(1)

    # Display connection info
    print("=" * 40)
    print(f"Connecting to Raspberry Pi via {connection_method}")
    print("=" * 40)
    print(f"Name: {selected_pi['name']}")
    print(f"IP Address: {selected_pi['ip']}")
    print(f"MAC Address: {selected_pi['mac']}")
    print(f"Connection: {selected_pi['connection']}")
    print(f"Username: {args.username}")
    print("=" * 40)
    print()

    # Test connectivity
    print("Testing connectivity...", end=' ', flush=True)
    if not test_connectivity(selected_pi['ip']):
        print("FAILED")
        print(f"ERROR: Cannot reach {selected_pi['ip']}")
        if connection_method == "Ethernet":
            print("  Please check:")
            print("  1. The Raspberry Pi is powered on")
            print("  2. Ethernet cable is connected")
            print("  3. Both devices are on the same network")
        else:
            print("  Please check:")
            print("  1. The Raspberry Pi is powered on")
            print("  2. WiFi is connected and working")
            print("  3. Both devices are on the same network")
        sys.exit(1)
    print("OK")

    # Test SSH port
    print("Testing SSH port...", end=' ', flush=True)
    if not test_port(selected_pi['ip'], 22):
        print("FAILED")
        print("WARNING: SSH port 22 is not accessible")
        print("  The SSH service may not be running on the Pi")
        print("  On the Pi, run: sudo systemctl enable ssh && sudo systemctl start ssh")
        sys.exit(1)
    print("Port 22 is open")
    print()

    # Connect via SSH
    print("Connecting via SSH...")
    print()

    try:
        # Remove old host key to avoid warnings
        subprocess.run(['ssh-keygen', '-R', selected_pi['ip']],
                      capture_output=True, timeout=5)
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError, FileNotFoundError):
        # ssh-keygen may not be available or may fail - this is non-critical
        pass
    except Exception as e:
        # Log unexpected errors
        print(f"Warning: Could not remove host key: {e}", file=sys.stderr)

    # Connect
    try:
        subprocess.run(['ssh', '-o', 'StrictHostKeyChecking=accept-new',
                       '-o', 'ConnectTimeout=10',
                       f"{args.username}@{selected_pi['ip']}"])
    except KeyboardInterrupt:
        print("\nConnection interrupted")
    except Exception as e:
        print(f"\nConnection failed: {e}")
        print("\nCommon issues:")
        print("  1. Password authentication disabled (needs SSH key)")
        print("  2. Wrong username or password")
        print("  3. SSH key not added to authorized_keys")
        print("\nSolutions:")
        print("  - Add SSH key: python get_pi_command.py")
        print("  - Enable password auth: See FIX-AUTHENTICATION.md")
        sys.exit(1)

if __name__ == '__main__':
    main()
