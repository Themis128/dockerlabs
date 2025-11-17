#!/usr/bin/env python3
"""
Restore Raspberry Pi configuration from backup
"""
import sys
import json
import argparse
import os
import subprocess

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from utils import load_config, get_pi_info, execute_ssh_command
    from constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT
except ImportError:
    from .utils import load_config, get_pi_info, execute_ssh_command
    from .constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT


def restore_pi_config(backup_file: str, pi_number: int = None):
    """
    Restore Pi configuration from backup file

    Args:
        backup_file: Path to backup JSON file
        pi_number: Optional Pi number to restore to (if None, uses backup file)

    Returns:
        Dictionary with restore information
    """
    if not os.path.exists(backup_file):
        return {
            "success": False,
            "error": f"Backup file not found: {backup_file}",
        }

    try:
        with open(backup_file, "r", encoding='utf-8') as f:
            backup_data = json.load(f)

        # Get Pi number from backup or argument
        restore_pi_number = pi_number or backup_data.get("pi_number")
        if not restore_pi_number:
            return {
                "success": False,
                "error": "Pi number not specified and not found in backup file",
            }

        # Load current config
        config = load_config()

        # Update or add Pi configuration
        if "raspberry_pis" not in config:
            config["raspberry_pis"] = {}

        pi_info = backup_data.get("pi_info", {})

        # Find existing Pi entry or create new one
        pi_key = None
        for key, pi in config["raspberry_pis"].items():
            if pi.get("ip") == pi_info.get("ip"):
                pi_key = key
                break

        if not pi_key:
            # Create new entry
            pi_key = str(restore_pi_number)

        config["raspberry_pis"][pi_key] = pi_info

        # Save updated config
        config_path = os.path.join(
            os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
            "pi-config.json"
        )

        with open(config_path, "w", encoding='utf-8') as f:
            json.dump(config, f, indent=2)

        return {
            "success": True,
            "message": f"Configuration restored for Pi {restore_pi_number}",
            "pi": restore_pi_number,
            "backup_file": backup_file,
        }
    except (OSError, IOError, json.JSONDecodeError, KeyError) as e:
        return {
            "success": False,
            "error": f"Failed to restore configuration: {str(e)}",
        }


def restore_pi_remote(backup_file: str, pi_number: int,
                      username: str = DEFAULT_SSH_USERNAME,
                      remote_path: str = "/home/pi"):
    """
    Restore files to remote Pi from backup archive

    Args:
        backup_file: Path to backup tar.gz file
        pi_number: Pi number (1-indexed)
        username: SSH username
        remote_path: Remote path to restore to

    Returns:
        Dictionary with restore information
    """
    if not os.path.exists(backup_file):
        return {
            "success": False,
            "error": f"Backup file not found: {backup_file}",
        }

    config = load_config()
    pi_info, connection_method = get_pi_info(config, pi_number, "auto")

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

    # Upload backup file to Pi
    remote_backup = f"/tmp/pi_restore_{os.path.basename(backup_file)}"

    try:
        scp_cmd = [
            "scp",
            "-o", "StrictHostKeyChecking=no",
            backup_file,
            f"{username}@{ip}:{remote_backup}",
        ]

        scp_result = subprocess.run(
            scp_cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )

        if scp_result.returncode != 0:
            return {
                "success": False,
                "error": f"Failed to upload backup: {scp_result.stderr}",
            }

        # Extract archive on Pi
        extract_cmd = f"tar -xzf {remote_backup} -C {remote_path} 2>/dev/null && rm {remote_backup}"

        result = execute_ssh_command(ip, username, extract_cmd, timeout=300)

        if result["success"]:
            return {
                "success": True,
                "message": f"Remote files restored to Pi {pi_number}",
                "pi": pi_number,
                "backup_file": backup_file,
            }
        else:
            return {
                "success": False,
                "error": f"Failed to extract backup: {result.get('error')}",
            }
    except (OSError, subprocess.SubprocessError) as e:
        return {
            "success": False,
            "error": f"Failed to restore remote files: {str(e)}",
        }


def main():
    parser = argparse.ArgumentParser(description="Restore Raspberry Pi from backup")
    parser.add_argument("backup_file", help="Path to backup file")
    parser.add_argument(
        "--type",
        choices=["config", "remote", "both"],
        default="config",
        help="Type of restore to perform",
    )
    parser.add_argument(
        "--pi-number",
        type=int,
        help="Pi number to restore to (if not specified, uses backup file)",
    )
    parser.add_argument(
        "--remote-path",
        default="/home/pi",
        help="Remote path to restore to (for remote restore type)",
    )
    parser.add_argument("-u", "--username", default=DEFAULT_SSH_USERNAME, help="SSH username")

    args = parser.parse_args()

    try:
        results = []

        if args.type in ["config", "both"]:
            result = restore_pi_config(args.backup_file, args.pi_number)
            results.append(result)

        if args.type in ["remote", "both"]:
            if not args.pi_number:
                print(json.dumps({
                    "success": False,
                    "error": "Pi number required for remote restore",
                }))
                sys.exit(1)

            result = restore_pi_remote(
                args.backup_file,
                args.pi_number,
                args.username,
                args.remote_path,
            )
            results.append(result)

        # Combine results
        all_success = all(r.get("success", False) for r in results)
        combined_result = {
            "success": all_success,
            "results": results,
        }

        print(json.dumps(combined_result, indent=2))
        if not all_success:
            sys.exit(1)
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}))
        sys.exit(1)


if __name__ == "__main__":
    main()













