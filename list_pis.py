#!/usr/bin/env python3
"""
List all Raspberry Pis with their connection information
Usage: python list_pis.py
"""

import json
import sys

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def main():
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    print("=" * 40)
    print("Raspberry Pi Network Configuration")
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

    # Display Ethernet connections
    print("ETHERNET CONNECTIONS:")
    print("-" * 20)
    for i, pi in enumerate(ethernet_pis, 1):
        print(f"  [{i}] {pi['name']}")
        print(f"      IP: {pi['ip']}")
        print(f"      MAC: {pi['mac']}")
        print(f"      Description: {pi['description']}")
        print()

    # Display WiFi connections
    print("WIFI CONNECTIONS:")
    print("-" * 17)
    for i, pi in enumerate(wifi_pis, 1):
        print(f"  [{i}] {pi['name']}")
        print(f"      IP: {pi['ip']}")
        print(f"      MAC: {pi['mac']}")
        print(f"      Description: {pi['description']}")
        print()

    print("=" * 40)
    print()
    print("Quick Connect Commands (Ethernet First):")
    print("  SSH Pi 1 (Ethernet preferred):  python connect_ssh.py 1")
    print("  SSH Pi 2 (Ethernet preferred):  python connect_ssh.py 2")
    print("  Telnet Pi 1 (Ethernet preferred): python connect_telnet.py 1")
    print("  Telnet Pi 2 (Ethernet preferred): python connect_telnet.py 2")
    print()
    print("Force Connection Type:")
    print("  SSH Ethernet:  python connect_ssh.py 1 -c ethernet")
    print("  SSH WiFi:      python connect_ssh.py 1 -c wifi")
    print("  Telnet Ethernet: python connect_telnet.py 1 -c ethernet")
    print("  Telnet WiFi:     python connect_telnet.py 1 -c wifi")

if __name__ == '__main__':
    main()
