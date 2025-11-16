#!/usr/bin/env python3
"""
Remote Setup Options for Raspberry Pis (No Physical Access)
Usage: python remote_setup_options.py
"""

import json
import sys
import subprocess
import socket


def load_config():
    """Load Raspberry Pi configuration"""
    with open("pi-config.json", "r") as f:
        return json.load(f)


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


def main():
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    print("=" * 60)
    print("Remote Setup Options (No Physical Access Required)")
    print("=" * 60)
    print()

    all_pis = config["raspberry_pis"]
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi["connection"] == "Wired":
            ethernet_pis.append(pi)
        elif pi["connection"] == "2.4G":
            wifi_pis.append(pi)

    print("Current Status:")
    print("-" * 60)
    for pi in ethernet_pis + wifi_pis:
        ssh_open = test_port(pi["ip"], 22)
        telnet_open = test_port(pi["ip"], 23)
        print(f"{pi['name']} ({pi['ip']}):")
        print(f"  SSH (22): {'OPEN' if ssh_open else 'CLOSED'}")
        print(f"  Telnet (23): {'OPEN' if telnet_open else 'CLOSED'}")
        print()

    print("=" * 60)
    print("Option 1: Test Password Authentication")
    print("=" * 60)
    print()
    print("Try connecting with password (may already be enabled):")
    print("  python test_password_auth.py 1")
    print("  python connect_ssh.py 1")
    print()
    print("If password works, you can then:")
    print("  - Add SSH keys remotely")
    print("  - Enable telnet remotely")
    print()

    print("=" * 60)
    print("Option 2: Access from Another Machine")
    print("=" * 60)
    print()
    print("If you have SSH access from another computer/network:")
    print("  1. SSH into that machine")
    print("  2. From there, SSH to the Pi")
    print("  3. Add your SSH key or enable password auth")
    print()
    print("Example:")
    print("  # On another machine that can access the Pi:")
    print("  ssh pi@192.168.0.48")
    print("  # Then run the command from: python get_pi_command.py")
    print()

    print("=" * 60)
    print("Option 3: Serial Console Access")
    print("=" * 60)
    print()
    print("If the Pi has serial/USB console:")
    print("  1. Connect via serial port (USB-to-TTL adapter)")
    print("  2. Access console without network")
    print("  3. Configure SSH/telnet from console")
    print()
    print("Tools needed:")
    print("  - USB-to-TTL serial adapter")
    print("  - Serial terminal software (PuTTY, minicom, etc.)")
    print()

    print("=" * 60)
    print("Option 4: Network-Based Solutions")
    print("=" * 60)
    print()
    print("A. Router/Network Management:")
    print("  - Some routers provide device management")
    print("  - May allow console access to connected devices")
    print()
    print("B. Wake-on-LAN / Network Boot:")
    print("  - If Pi supports network boot")
    print("  - Can configure via PXE/TFTP")
    print()
    print("C. SD Card Access:")
    print("  - Remove SD card from Pi")
    print("  - Mount on another computer")
    print("  - Edit SSH config files directly")
    print("  - Reinsert SD card")
    print()

    print("=" * 60)
    print("Option 5: SD Card Configuration (Recommended)")
    print("=" * 60)
    print()
    print("If you can access the SD card:")
    print()
    print("1. Remove SD card from Pi")
    print("2. Insert into your computer (use adapter if needed)")
    print("3. Navigate to boot partition")
    print("4. Enable SSH (create empty file):")
    print("   - Create file: 'ssh' (no extension)")
    print("   - Or edit: config.txt")
    print()
    print("5. Enable password authentication:")
    print("   - Mount root partition")
    print("   - Edit: /etc/ssh/sshd_config")
    print("   - Change: PasswordAuthentication yes")
    print()
    print("6. Add SSH key:")
    print("   - Create: ~/.ssh/authorized_keys")
    print("   - Add your public key (from: python get_pi_command.py)")
    print()
    print("7. Eject SD card safely")
    print("8. Reinsert into Pi and boot")
    print()

    print("=" * 60)
    print("Option 6: Get Help from Someone with Access")
    print("=" * 60)
    print()
    print("Provide them with:")
    print("  1. Run: python get_pi_command.py")
    print("  2. Give them the command shown")
    print("  3. They run it on the Pi")
    print("  4. You can then connect remotely")
    print()

    print("=" * 60)
    print("Quick Test Commands")
    print("=" * 60)
    print()
    print("Test if password auth works:")
    print("  python test_password_auth.py 1")
    print()
    print("Try connecting (will prompt for password if enabled):")
    print("  python connect_ssh.py 1")
    print()
    print("Get SSH key command (to give to someone with access):")
    print("  python get_pi_command.py")
    print()


if __name__ == "__main__":
    main()
