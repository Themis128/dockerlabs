#!/usr/bin/env python3
"""
Get detailed status information from Raspberry Pi
"""
import sys
import json
import argparse
import os

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from utils import load_config, get_pi_info, execute_ssh_command
    from constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT
except ImportError:
    from .utils import load_config, get_pi_info, execute_ssh_command
    from .constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT


def get_pi_status(pi_number: int, username: str = DEFAULT_SSH_USERNAME,
                  connection_type: str = "auto", timeout: int = DEFAULT_TIMEOUT):
    """
    Get detailed status from a Raspberry Pi

    Args:
        pi_number: Pi number (1-indexed)
        username: SSH username
        connection_type: Connection preference
        timeout: Command timeout

    Returns:
        Dictionary with Pi status information
    """
    config = load_config()
    pi_info, connection_method = get_pi_info(config, pi_number, connection_type)

    if not pi_info:
        return {
            "success": False,
            "error": f"Pi {pi_number} not found in configuration",
        }

    ip = pi_info.get("ip")
    if not ip:
        return {
            "success": False,
            "error": f"No IP address found for Pi {pi_number}",
        }

    status = {
        "pi": pi_number,
        "ip": ip,
        "connection": connection_method,
        "mac": pi_info.get("mac"),
        "name": pi_info.get("name"),
    }

    # Collect various status information
    commands = {
        "hostname": "hostname",
        "uptime": "uptime",
        "cpu_temp": "vcgencmd measure_temp 2>/dev/null || echo 'N/A'",
        "cpu_info": "cat /proc/cpuinfo | grep 'Model' | head -1",
        "memory": "free -h",
        "disk_usage": "df -h /",
        "network_interfaces": "ip -br addr show 2>/dev/null || ifconfig",
        "os_version": "cat /etc/os-release | grep PRETTY_NAME",
        "kernel_version": "uname -r",
    }

    status_data = {}
    for key, command in commands.items():
        result = execute_ssh_command(ip, username, command, timeout=timeout)
        if result["success"]:
            status_data[key] = result["output"].strip()
        else:
            status_data[key] = f"Error: {result.get('error', 'Unknown error')}"

    status["status_data"] = status_data
    status["success"] = True

    return status


def main():
    parser = argparse.ArgumentParser(description="Get Raspberry Pi status")
    parser.add_argument("pi_number", type=int, help="Pi number (1, 2, etc.)")
    parser.add_argument("-u", "--username", default=DEFAULT_SSH_USERNAME, help="SSH username")
    parser.add_argument(
        "-c",
        "--connection",
        choices=["ethernet", "wifi", "auto"],
        default="auto",
        help="Network connection preference",
    )
    parser.add_argument("-t", "--timeout", type=int, default=DEFAULT_TIMEOUT, help="Timeout in seconds")

    args = parser.parse_args()

    try:
        result = get_pi_status(
            args.pi_number,
            args.username,
            args.connection,
            args.timeout,
        )
        print(json.dumps(result, indent=2))
        if not result.get("success"):
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
