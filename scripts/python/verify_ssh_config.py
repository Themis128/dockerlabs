#!/usr/bin/env python3
"""
Verify and help configure SSH on Raspberry Pi
Usage: python verify_ssh_config.py [pi_number]
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
    with open(config_path, "r") as f:
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


def main():
    parser = argparse.ArgumentParser(description="Verify SSH configuration")
    parser.add_argument(
        "pi_number", type=int, nargs="?", default=1, choices=[1, 2], help="Pi number (1 or 2)"
    )
    parser.add_argument("-u", "--username", default="pi", help="SSH username")

    args = parser.parse_args()

    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found in project root")
        sys.exit(1)

    # Get Ethernet Pi (priority)
    all_pis = config["raspberry_pis"]
    ethernet_pis = []

    for key, pi in all_pis.items():
        if pi["connection"] == "Wired":
            ethernet_pis.append(pi)

    if args.pi_number > len(ethernet_pis):
        print(f"ERROR: Ethernet Pi #{args.pi_number} not found")
        sys.exit(1)

    selected_pi = ethernet_pis[args.pi_number - 1]

    print("=" * 60)
    print("SSH Configuration Verification")
    print("=" * 60)
    print(f"Pi: {selected_pi['name']} ({selected_pi['ip']})")
    print()

    # Test SSH port
    if not test_port(selected_pi["ip"], 22):
        print("ERROR: SSH port 22 is not accessible")
        sys.exit(1)

    print("SSH port 22: OPEN")
    print()

    print("Testing authentication methods...")
    print()

    # Test SSH key auth
    print("1. SSH Key Authentication:", end=" ", flush=True)
    try:
        result = subprocess.run(
            [
                "ssh",
                "-o",
                "ConnectTimeout=5",
                "-o",
                "StrictHostKeyChecking=no",
                "-o",
                "BatchMode=yes",
                f'{args.username}@{selected_pi["ip"]}',
                "echo test",
            ],
            capture_output=True,
            timeout=10,
        )
        if result.returncode == 0:
            print("WORKS")
        else:
            print("FAILED (key not added)")
    except:
        print("FAILED")

    # Test password auth
    print("2. Password Authentication:", end=" ", flush=True)
    try:
        # Try with PreferredAuthentications=password
        result = subprocess.run(
            [
                "ssh",
                "-o",
                "ConnectTimeout=5",
                "-o",
                "StrictHostKeyChecking=no",
                "-o",
                "PreferredAuthentications=password",
                "-o",
                "PubkeyAuthentication=no",
                f'{args.username}@{selected_pi["ip"]}',
                "echo test",
            ],
            capture_output=True,
            timeout=10,
        )
        output = result.stderr.decode() if result.stderr else ""
        if "password" in output.lower() or result.returncode == 0:
            print("ENABLED (will prompt for password)")
        elif "permission denied" in output.lower() and "publickey" in output.lower():
            print("DISABLED (only publickey allowed)")
        else:
            print("UNKNOWN (may be disabled)")
    except:
        print("UNKNOWN")

    print()
    print("=" * 60)
    print("If Password Auth is Enabled but Not Working")
    print("=" * 60)
    print()
    print("The SSH service may need to be restarted on the Pi.")
    print("On the Pi, run:")
    print("  sudo systemctl restart ssh")
    print()
    print("Or verify the configuration:")
    print("  sudo grep PasswordAuthentication /etc/ssh/sshd_config")
    print("  # Should show: PasswordAuthentication yes")
    print()
    print("=" * 60)
    print("Try Connecting Now")
    print("=" * 60)
    print()
    print("If password auth is enabled, try:")
    print(f"  python connect_ssh.py {args.pi_number}")
    print()
    print("You should be prompted for a password.")
    print("If you still see 'Permission denied', the SSH service")
    print("may need to be restarted on the Pi.")


if __name__ == "__main__":
    main()
