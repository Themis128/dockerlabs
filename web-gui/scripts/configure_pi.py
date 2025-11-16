#!/usr/bin/env python3
"""
Configure Raspberry Pi settings via SSH
"""
import sys
import json
import argparse
import subprocess


def configure_ssh(ip, username, settings):
    """Configure SSH settings on Pi"""
    commands = []

    if "enable_ssh" in settings and settings["enable_ssh"]:
        # Enable SSH (create /boot/ssh file or enable service)
        commands.append("sudo systemctl enable ssh")
        commands.append("sudo systemctl start ssh")

    if "password_auth" in settings:
        # Configure password authentication
        if settings["password_auth"]:
            commands.append(
                "sudo sed -i 's/#PasswordAuthentication no/"
                "PasswordAuthentication yes/' /etc/ssh/sshd_config"
            )
            commands.append(
                "sudo sed -i 's/PasswordAuthentication no/"
                "PasswordAuthentication yes/' /etc/ssh/sshd_config"
            )
        else:
            commands.append(
                "sudo sed -i 's/PasswordAuthentication yes/"
                "PasswordAuthentication no/' /etc/ssh/sshd_config"
            )

    if "ssh_port" in settings and settings["ssh_port"] != 22:
        port = settings["ssh_port"]
        commands.append(f"sudo sed -i 's/#Port 22/Port {port}/' /etc/ssh/sshd_config")
        commands.append(f"sudo sed -i 's/^Port .*/Port {port}/' /etc/ssh/sshd_config")

    if commands:
        commands.append("sudo systemctl restart ssh")

    return commands


def configure_telnet(ip, username, settings):
    """Configure telnet settings on Pi"""
    commands = []

    if "enable_telnet" in settings and settings["enable_telnet"]:
        commands.append("sudo apt-get update -y")
        commands.append("sudo apt-get install -y telnetd inetutils-inetd")
        commands.append("sudo systemctl enable inetd")
        commands.append("sudo systemctl start inetd")
    else:
        commands.append("sudo systemctl stop inetd")
        commands.append("sudo systemctl disable inetd")

    return commands


def configure_network(ip, username, settings):
    """Configure network settings on Pi with WPA3 2025 support"""
    commands = []

    if "hostname" in settings and settings["hostname"]:
        hostname = settings["hostname"]
        commands.append(f"sudo hostnamectl set-hostname {hostname}")
        commands.append(f"echo '{hostname}' | sudo tee /etc/hostname")

    # Check if WiFi is enabled (support both field names for compatibility)
    wifi_enabled = settings.get("enable_wifi") or settings.get("wifi_enable")
    if wifi_enabled:
        wifi_ssid = settings.get("wifi_ssid") or settings.get("ssid")
        if wifi_ssid:
            # Generate wpa_supplicant.conf with WPA3 support
            import os
            script_dir = os.path.dirname(os.path.abspath(__file__))
            wpa_script = os.path.join(script_dir, "generate_wpa_supplicant.py")

            if os.path.exists(wpa_script):
                # Normalize settings to match what generate_wpa_supplicant expects
                # Ensure enable_wifi is set for the generator
                normalized_settings = settings.copy()
                if "wifi_enable" in normalized_settings and "enable_wifi" not in normalized_settings:
                    normalized_settings["enable_wifi"] = normalized_settings["wifi_enable"]

                # Generate wpa_supplicant.conf
                network_config = json.dumps({"network": normalized_settings})
                result = subprocess.run(
                    ["python3", wpa_script, "--settings", network_config],
                    capture_output=True,
                    text=True,
                    timeout=10,
                    check=False,
                )

                if result.returncode == 0:
                    wpa_config = result.stdout
                    # Write to /boot/wpa_supplicant.conf (for first boot)
                    # Or to /etc/wpa_supplicant/wpa_supplicant.conf (for existing system)
                    commands.append("sudo mkdir -p /boot")
                    commands.append(f"echo '{wpa_config}' | sudo tee /boot/wpa_supplicant.conf")
                    commands.append(
                        "sudo cp /boot/wpa_supplicant.conf "
                        "/etc/wpa_supplicant/wpa_supplicant.conf 2>/dev/null || true"
                    )
                    commands.append("sudo systemctl restart wpa_supplicant 2>/dev/null || true")
            else:
                # Fallback: basic wpa_supplicant config
                ssid = settings.get("wifi_ssid") or settings.get("ssid", "")
                password = settings.get("wifi_password") or settings.get("password", "")
                country = settings.get("wifi_country") or settings.get("country", "US")

                wpa_config = f"""ctrl_interface=DIR=/var/run/wpa_supplicant GROUP=netdev
update_config=1
country={country}

network={{
    ssid="{ssid}"
    psk="{password}"
    key_mgmt=WPA-PSK SAE
    proto=RSN
    pairwise=CCMP
    group=CCMP
    ieee80211w=2
}}"""
                commands.append("sudo mkdir -p /boot")
                commands.append(f"sudo tee /boot/wpa_supplicant.conf << 'EOF'\n{wpa_config}\nEOF")

    return commands


def execute_commands(ip, username, commands):
    """Execute commands on Pi via SSH"""
    if not commands:
        return True, "No commands to execute"

    # Combine commands
    command_string = " && ".join(commands)

    try:
        result = subprocess.run(
            [
                "ssh",
                "-o",
                "StrictHostKeyChecking=no",
                "-o",
                "ConnectTimeout=10",
                f"{username}@{ip}",
                command_string,
            ],
            capture_output=True,
            text=True,
            timeout=60,
            check=False,
        )

        if result.returncode == 0:
            return True, result.stdout
        return False, result.stderr
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        return False, str(e)


def main():
    parser = argparse.ArgumentParser(description="Configure Raspberry Pi settings")
    parser.add_argument("pi_number", type=int, choices=[1, 2], help="Pi number (1 or 2)")
    parser.add_argument(
        "--settings", type=str, help="JSON settings string (deprecated, use --settings-file)"
    )
    parser.add_argument("--settings-file", type=str, help="Path to JSON settings file (preferred)")
    parser.add_argument("-u", "--username", default="pi", help="SSH username")

    args = parser.parse_args()

    # Validate that at least one settings option is provided
    if not args.settings and not args.settings_file:
        print(
            json.dumps(
                {"success": False, "error": "Either --settings or --settings-file must be provided"}
            )
        )
        sys.exit(1)

    # Load config to get IP
    try:
        with open("pi-config.json", "r", encoding='utf-8') as f:
            config = json.load(f)
    except FileNotFoundError:
        print(json.dumps({"success": False, "error": "pi-config.json not found"}))
        sys.exit(1)

    # Get Pi IP (Ethernet preferred)
    all_pis = config["raspberry_pis"]
    ethernet_pis = [pi for key, pi in all_pis.items() if pi["connection"] == "Wired"]

    if args.pi_number > len(ethernet_pis):
        print(json.dumps({"success": False, "error": f"Pi {args.pi_number} not found"}))
        sys.exit(1)

    selected_pi = ethernet_pis[args.pi_number - 1]
    ip = selected_pi["ip"]

    # Parse settings - prefer file over string
    try:
        if args.settings_file:
            # Read from file (preferred method)
            with open(args.settings_file, "r", encoding='utf-8') as f:
                settings = json.load(f)
        else:
            # Fall back to string (for backward compatibility)
            settings = json.loads(args.settings)
    except (json.JSONDecodeError, FileNotFoundError, OSError) as e:
        print(json.dumps({"success": False, "error": f"Invalid settings: {str(e)}"}))
        sys.exit(1)

    # Build commands
    all_commands = []
    all_commands.extend(configure_ssh(ip, args.username, settings.get("ssh", {})))
    all_commands.extend(configure_telnet(ip, args.username, settings.get("telnet", {})))
    all_commands.extend(configure_network(ip, args.username, settings.get("network", {})))

    # Execute
    success, message = execute_commands(ip, args.username, all_commands)

    print(json.dumps({"success": success, "message": message, "pi": args.pi_number, "ip": ip}))


if __name__ == "__main__":
    main()
