#!/usr/bin/env python3
"""
Execute remote commands on Raspberry Pi via SSH or Telnet
Returns command output in JSON format
"""
import sys
import json
import subprocess
import socket
import argparse
import os


def load_config():
    """Load Raspberry Pi configuration"""
    config_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "pi-config.json")
    if os.path.exists(config_path):
        with open(config_path, "r", encoding='utf-8') as f:
            return json.load(f)
    return {"raspberry_pis": {}}


def get_pi_info(config, pi_number, connection_type="auto"):
    """Get Pi information based on number and connection type"""
    all_pis = config.get("raspberry_pis", {})
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi.get("connection") == "Wired":
            ethernet_pis.append(pi)
        elif pi.get("connection") == "2.4G":
            wifi_pis.append(pi)

    selected_pi = None
    connection_method = ""

    if connection_type == "auto" or connection_type == "ethernet":
        if ethernet_pis:
            idx = int(pi_number) - 1
            if 0 <= idx < len(ethernet_pis):
                selected_pi = ethernet_pis[idx]
                connection_method = "Ethernet"
    elif connection_type == "wifi":
        if wifi_pis:
            idx = int(pi_number) - 1
            if 0 <= idx < len(wifi_pis):
                selected_pi = wifi_pis[idx]
                connection_method = "WiFi"

    if not selected_pi and connection_type == "auto":
        # Fallback to WiFi
        if wifi_pis:
            idx = int(pi_number) - 1
            if 0 <= idx < len(wifi_pis):
                selected_pi = wifi_pis[idx]
                connection_method = "WiFi"

    return selected_pi, connection_method


def execute_ssh_command(ip, username, command, password=None, key_path=None):
    """Execute command via SSH"""
    try:
        ssh_cmd = [
            "ssh",
            "-o", "StrictHostKeyChecking=no",
            "-o", "ConnectTimeout=10",
            "-o", "BatchMode=yes" if not password else "BatchMode=no",
        ]

        if key_path and os.path.exists(key_path):
            ssh_cmd.extend(["-i", key_path])

        ssh_cmd.append(f"{username}@{ip}")
        ssh_cmd.append(command)

        if password:
            # Use sshpass if available
            try:
                result = subprocess.run(
                    ["sshpass", "-p", password] + ssh_cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
            except FileNotFoundError:
                # sshpass not available, try without password (will use key or fail)
                result = subprocess.run(
                    ssh_cmd,
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
        else:
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

        return {
            "success": result.returncode == 0,
            "output": result.stdout,
            "error": result.stderr,
            "exit_code": result.returncode,
        }
    except subprocess.TimeoutExpired:
        return {
            "success": False,
            "output": "",
            "error": "Command execution timed out",
            "exit_code": -1,
        }
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        return {
            "success": False,
            "output": "",
            "error": str(e),
            "exit_code": -1,
        }


def execute_telnet_command(ip, port, username, password, command):
    """Execute command via Telnet"""
    try:
        import telnetlib

        tn = telnetlib.Telnet(ip, port, timeout=10)

        # Wait for login prompt
        tn.read_until(b"login: ", timeout=5)
        tn.write(username.encode("ascii") + b"\n")

        # Wait for password prompt
        tn.read_until(b"Password: ", timeout=5)
        tn.write(password.encode("ascii") + b"\n")

        # Wait for shell prompt
        tn.read_until(b"$ ", timeout=5)
        tn.read_until(b"# ", timeout=5)

        # Execute command
        tn.write(command.encode("ascii") + b"\n")

        # Read output
        output = tn.read_until(b"$ ", timeout=30)
        output = output.decode("ascii", errors="ignore")

        tn.close()

        return {
            "success": True,
            "output": output,
            "error": "",
            "exit_code": 0,
        }
    except (OSError, subprocess.SubprocessError, ValueError) as e:
        return {
            "success": False,
            "output": "",
            "error": str(e),
            "exit_code": -1,
        }


def main():
    parser = argparse.ArgumentParser(description="Execute remote command on Raspberry Pi")
    parser.add_argument("pi_number", help="Pi number (1, 2, etc.)")
    parser.add_argument("command", help="Command to execute")
    parser.add_argument("-u", "--username", default="pi", help="SSH/Telnet username")
    parser.add_argument("-p", "--password", help="SSH/Telnet password")
    parser.add_argument("-k", "--key", help="SSH private key path")
    parser.add_argument(
        "-t",
        "--type",
        choices=["ssh", "telnet", "auto"],
        default="auto",
        help="Connection type",
    )
    parser.add_argument(
        "-c",
        "--connection",
        choices=["ethernet", "wifi", "auto"],
        default="auto",
        help="Network connection preference",
    )

    args = parser.parse_args()

    try:
        config = load_config()
        pi_info, connection_method = get_pi_info(
            config, args.pi_number, args.connection
        )

        if not pi_info:
            print(
                json.dumps(
                    {
                        "success": False,
                        "error": f"Pi {args.pi_number} not found",
                        "output": "",
                    }
                )
            )
            sys.exit(1)

        ip = pi_info.get("ip")
        if not ip:
            print(
                json.dumps(
                    {
                        "success": False,
                        "error": f"No IP address found for Pi {args.pi_number}",
                        "output": "",
                    }
                )
            )
            sys.exit(1)

        # Determine connection type
        connection_type = args.type
        if connection_type == "auto":
            # Try SSH first, fallback to telnet
            connection_type = "ssh"

        if connection_type == "ssh":
            result = execute_ssh_command(
                ip, args.username, args.command, args.password, args.key
            )
        elif connection_type == "telnet":
            telnet_port = 23
            result = execute_telnet_command(
                ip, telnet_port, args.username, args.password or "", args.command
            )
        else:
            result = {
                "success": False,
                "error": f"Unknown connection type: {connection_type}",
                "output": "",
            }

        result["pi_info"] = {
            "number": args.pi_number,
            "ip": ip,
            "connection_method": connection_method,
        }

        print(json.dumps(result))
        if not result["success"]:
            sys.exit(1)

    except Exception as e:
        print(json.dumps({"success": False, "error": str(e), "output": ""}))
        sys.exit(1)


if __name__ == "__main__":
    main()
