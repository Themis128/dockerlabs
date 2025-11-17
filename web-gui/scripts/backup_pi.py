#!/usr/bin/env python3
"""
Backup Raspberry Pi configuration and data
"""
import sys
import json
import argparse
import os
import subprocess
from datetime import datetime

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from utils import load_config, get_pi_info, execute_ssh_command
    from constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT
except ImportError:
    from .utils import load_config, get_pi_info, execute_ssh_command
    from .constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT


def backup_pi_config(pi_number: int, backup_dir: str = "backups"):
    """
    Backup Pi configuration files

    Args:
        pi_number: Pi number (1-indexed)
        backup_dir: Directory to store backups

    Returns:
        Dictionary with backup information
    """
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

    # Create backup directory
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"pi{pi_number}_config_{timestamp}.json")

    # Save Pi configuration
    backup_data = {
        "pi_number": pi_number,
        "backup_timestamp": timestamp,
        "pi_info": pi_info,
        "connection_method": connection_method,
    }

    try:
        with open(backup_file, "w", encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2)

        return {
            "success": True,
            "message": f"Configuration backed up to {backup_file}",
            "backup_file": backup_file,
            "pi": pi_number,
        }
    except (OSError, IOError) as e:
        return {
            "success": False,
            "error": f"Failed to create backup file: {str(e)}",
        }


def backup_pi_remote(pi_number: int, username: str = DEFAULT_SSH_USERNAME,
                     backup_dir: str = "backups", remote_path: str = "/home/pi"):
    """
    Backup files from remote Pi

    Args:
        pi_number: Pi number (1-indexed)
        username: SSH username
        backup_dir: Local directory to store backups
        remote_path: Remote path to backup

    Returns:
        Dictionary with backup information
    """
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

    # Create backup directory
    os.makedirs(backup_dir, exist_ok=True)

    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    backup_file = os.path.join(backup_dir, f"pi{pi_number}_remote_{timestamp}.tar.gz")

    # Use rsync or scp to backup files
    # For now, create a tar archive on the Pi and download it
    remote_backup = f"/tmp/pi_backup_{timestamp}.tar.gz"
    archive_cmd = f"tar -czf {remote_backup} {remote_path} 2>/dev/null"

    result = execute_ssh_command(ip, username, archive_cmd, timeout=300)

    if not result["success"]:
        return {
            "success": False,
            "error": f"Failed to create remote archive: {result.get('error')}",
        }

    # Download the archive using scp
    try:
        scp_cmd = [
            "scp",
            "-o", "StrictHostKeyChecking=no",
            f"{username}@{ip}:{remote_backup}",
            backup_file,
        ]

        scp_result = subprocess.run(
            scp_cmd,
            capture_output=True,
            text=True,
            timeout=600,
            check=False,
        )

        # Clean up remote archive
        execute_ssh_command(ip, username, f"rm {remote_backup}", timeout=10)

        if scp_result.returncode == 0:
            return {
                "success": True,
                "message": f"Remote files backed up to {backup_file}",
                "backup_file": backup_file,
                "pi": pi_number,
            }
        else:
            return {
                "success": False,
                "error": f"Failed to download backup: {scp_result.stderr}",
            }
    except (OSError, subprocess.SubprocessError) as e:
        return {
            "success": False,
            "error": f"Failed to download backup: {str(e)}",
        }


def main():
    parser = argparse.ArgumentParser(description="Backup Raspberry Pi")
    parser.add_argument("pi_number", type=int, help="Pi number (1, 2, etc.)")
    parser.add_argument(
        "--type",
        choices=["config", "remote", "both"],
        default="config",
        help="Type of backup to perform",
    )
    parser.add_argument(
        "--backup-dir",
        default="backups",
        help="Directory to store backups",
    )
    parser.add_argument(
        "--remote-path",
        default="/home/pi",
        help="Remote path to backup (for remote backup type)",
    )
    parser.add_argument("-u", "--username", default=DEFAULT_SSH_USERNAME, help="SSH username")

    args = parser.parse_args()

    try:
        results = []

        if args.type in ["config", "both"]:
            result = backup_pi_config(args.pi_number, args.backup_dir)
            results.append(result)

        if args.type in ["remote", "both"]:
            result = backup_pi_remote(
                args.pi_number,
                args.username,
                args.backup_dir,
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













