#!/usr/bin/env python3
"""
Telnet Connection Script - Prioritizes Ethernet, falls back to WiFi
Usage: python connect_telnet.py [pi_number] [port] [connection_type]
"""

import sys
import json
import subprocess
import socket
import argparse
import os


def load_config():
    """Load Raspberry Pi configuration"""
    # Get project root (two levels up from scripts/python/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    config_path = os.path.join(project_root, "pi-config.json")
    with open(config_path, "r", encoding='utf-8') as f:
        return json.load(f)


def test_connectivity(ip, count=2):
    """Test network connectivity to IP"""
    try:
        result = subprocess.run(
            ["ping", "-n" if sys.platform == "win32" else "-c", str(count), ip],
            capture_output=True,
            timeout=10,
            check=False,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
        return False


def test_port(ip, port, timeout=3):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except (socket.error, OSError, ValueError):
        return False


def select_pi(config, pi_number, connection_type="auto"):
    """Select Raspberry Pi based on number and connection type"""
    all_pis = config["raspberry_pis"]
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi["connection"] == "Wired":
            ethernet_pis.append(pi)
        elif pi["connection"] == "2.4G":
            wifi_pis.append(pi)

    selected_pi = None
    connection_method = ""

    if connection_type == "auto":
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

    elif connection_type == "ethernet":
        idx = pi_number - 1
        if 0 <= idx < len(ethernet_pis):
            selected_pi = ethernet_pis[idx]
            connection_method = "Ethernet"

    elif connection_type == "wifi":
        idx = pi_number - 1
        if 0 <= idx < len(wifi_pis):
            selected_pi = wifi_pis[idx]
            connection_method = "WiFi"

    return selected_pi, connection_method


def main():
    parser = argparse.ArgumentParser(description="Connect to Raspberry Pi via Telnet")
    parser.add_argument(
        "pi_number", type=int, nargs="?", default=1, choices=[1, 2], help="Pi number (1 or 2)"
    )
    parser.add_argument("-p", "--port", type=int, default=23, help="Telnet port")
    parser.add_argument(
        "-c",
        "--connection",
        choices=["ethernet", "wifi", "auto"],
        default="auto",
        help="Connection type (default: auto, prioritizes Ethernet)",
    )

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found in project root")
        sys.exit(1)

    # Select Pi
    selected_pi, connection_method = select_pi(config, args.pi_number, args.connection)

    if not selected_pi:
        print(f"ERROR: Raspberry Pi #{args.pi_number} not found")
        sys.exit(1)

    # Display connection info
    print("=" * 40)
    print(f"Connecting to Raspberry Pi via Telnet ({connection_method})")
    print("=" * 40)
    print(f"Name: {selected_pi['name']}")
    print(f"IP Address: {selected_pi['ip']}")
    print(f"MAC Address: {selected_pi['mac']}")
    print(f"Connection: {selected_pi['connection']}")
    print(f"Port: {args.port}")
    print("=" * 40)
    print()

    # Test connectivity
    print("Testing connectivity...", end=" ", flush=True)
    if not test_connectivity(selected_pi["ip"]):
        print("FAILED")
        print(f"ERROR: Cannot reach {selected_pi['ip']}")
        sys.exit(1)
    print("OK")

    # Test Telnet port
    print(f"Testing Telnet port {args.port}...", end=" ", flush=True)
    telnet_open = test_port(selected_pi["ip"], args.port)

    if telnet_open:
        print("Port is open")
    else:
        print("Port is not accessible")
        print("  Telnet service may not be enabled on the Pi")
        print("  On the Pi, run:")
        print("    sudo apt-get install -y telnetd inetutils-inetd")
        print("    sudo systemctl enable inetd && sudo systemctl start inetd")
        print()
        print("Telnet port is not open. Please enable telnet on the Pi first.")
        print("See FIX-AUTHENTICATION.md for instructions.")
        sys.exit(1)

    print()
    print("Starting telnet connection...")
    print()

    # Try to use telnet command
    try:
        subprocess.run(["telnet", selected_pi["ip"], str(args.port)])
    except FileNotFoundError:
        print("Telnet client not found.")
        print()
        print("Windows: Enable telnet client:")
        print("  Run PowerShell as Administrator:")
        print("  Enable-WindowsOptionalFeature -Online -FeatureName TelnetClient")
        print()
        print("Or use Python telnetlib:")
        import telnetlib

        try:
            tn = telnetlib.Telnet(selected_pi["ip"], args.port)
            print("Connected! Type commands (Ctrl+] to exit)")
            tn.interact()
        except Exception as e:
            print(f"Connection failed: {e}")
            sys.exit(1)
    except KeyboardInterrupt:
        print("\nConnection interrupted")


if __name__ == "__main__":
    main()
