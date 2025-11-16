#!/usr/bin/env python3
"""
Reboot Raspberry Pi device
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


def reboot_pi(pi_number: int, username: str = DEFAULT_SSH_USERNAME,
              connection_type: str = "auto", timeout: int = DEFAULT_TIMEOUT):
    """
    Reboot a Raspberry Pi

    Args:
        pi_number: Pi number (1-indexed)
        username: SSH username
        connection_type: Connection preference
        timeout: Command timeout

    Returns:
        Dictionary with success status and message
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

    # Execute reboot command
    result = execute_ssh_command(
        ip, username, "sudo reboot", timeout=timeout
    )

    # Note: Reboot command may disconnect before returning, so we check for success
    # or connection reset
    if result["success"] or "Connection reset" in result.get("error", ""):
        return {
            "success": True,
            "message": f"Reboot command sent to Pi {pi_number} ({ip})",
            "pi": pi_number,
            "ip": ip,
            "connection": connection_method,
        }
    else:
        return {
            "success": False,
            "error": result.get("error", "Failed to reboot Pi"),
            "pi": pi_number,
            "ip": ip,
        }


def main():
    parser = argparse.ArgumentParser(description="Reboot Raspberry Pi")
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
        result = reboot_pi(
            args.pi_number,
            args.username,
            args.connection,
            args.timeout,
        )
        print(json.dumps(result))
        if not result.get("success"):
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()
