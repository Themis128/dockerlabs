#!/usr/bin/env python3
"""
Utility functions for web-gui scripts
Common helper functions used across multiple scripts
"""
import os
import sys
import json
import subprocess
from typing import Optional, Dict, Any, Tuple


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """
    Load Raspberry Pi configuration from pi-config.json

    Args:
        config_path: Optional path to config file. If None, searches in project root.

    Returns:
        Configuration dictionary with 'raspberry_pis' key
    """
    if config_path is None:
        # Try to find config in project root (parent of web-gui)
        script_dir = os.path.dirname(os.path.abspath(__file__))
        project_root = os.path.dirname(script_dir)
        config_path = os.path.join(project_root, "pi-config.json")

    if not os.path.exists(config_path):
        return {"raspberry_pis": {}}

    try:
        with open(config_path, "r", encoding='utf-8') as f:
            return json.load(f)
    except (OSError, IOError, json.JSONDecodeError) as e:
        print(f"Error loading config: {e}", file=sys.stderr)
        return {"raspberry_pis": {}}


def get_pi_info(config: Dict[str, Any], pi_number: int, connection_type: str = "auto") -> Tuple[Optional[Dict[str, Any]], str]:
    """
    Get Pi information based on number and connection type

    Args:
        config: Configuration dictionary
        pi_number: Pi number (1-indexed)
        connection_type: Connection preference ("ethernet", "wifi", "auto")

    Returns:
        Tuple of (pi_info_dict, connection_method_string)
    """
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


def execute_ssh_command(ip: str, username: str, command: str,
                        password: Optional[str] = None,
                        key_path: Optional[str] = None,
                        timeout: int = 30) -> Dict[str, Any]:
    """
    Execute command via SSH

    Args:
        ip: Pi IP address
        username: SSH username
        command: Command to execute
        password: Optional password for authentication
        key_path: Optional path to SSH private key
        timeout: Command timeout in seconds

    Returns:
        Dictionary with 'success', 'output', 'error', 'exit_code' keys
    """
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
                    timeout=timeout,
                    check=False,
                )
            except FileNotFoundError:
                # sshpass not available, try without password (will use key or fail)
                result = subprocess.run(
                    ssh_cmd,
                    capture_output=True,
                    text=True,
                    timeout=timeout,
                    check=False,
                )
        else:
            result = subprocess.run(
                ssh_cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
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


def format_size(size_bytes: int) -> str:
    """
    Format size in bytes to human-readable string

    Args:
        size_bytes: Size in bytes

    Returns:
        Formatted string (e.g., "1.5 GB")
    """
    for unit in ['B', 'KB', 'MB', 'GB', 'TB']:
        if size_bytes < 1024.0:
            return f"{size_bytes:.2f} {unit}"
        size_bytes /= 1024.0
    return f"{size_bytes:.2f} PB"


def validate_ip_address(ip: str) -> bool:
    """
    Validate IP address format

    Args:
        ip: IP address string

    Returns:
        True if valid, False otherwise
    """
    try:
        parts = ip.split('.')
        if len(parts) != 4:
            return False
        for part in parts:
            num = int(part)
            if num < 0 or num > 255:
                return False
        return True
    except (ValueError, AttributeError):
        return False


def validate_mac_address(mac: str) -> bool:
    """
    Validate MAC address format

    Args:
        mac: MAC address string

    Returns:
        True if valid, False otherwise
    """
    try:
        parts = mac.split(':')
        if len(parts) != 6:
            # Try with dashes
            parts = mac.split('-')
            if len(parts) != 6:
                return False
        for part in parts:
            int(part, 16)
        return True
    except (ValueError, AttributeError):
        return False














