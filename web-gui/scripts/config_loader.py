#!/usr/bin/env python3
"""
Configuration loader for web-gui scripts
Handles loading and validation of configuration files
"""
import os
import sys
import json
from typing import Dict, Any, Optional, List, Tuple

# Add scripts directory to path for imports
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

try:
    from utils import load_config, get_pi_info
except ImportError:
    from .utils import load_config, get_pi_info


def validate_pi_config(config: Dict[str, Any]) -> Tuple[bool, List[str]]:
    """
    Validate Pi configuration structure

    Args:
        config: Configuration dictionary

    Returns:
        Tuple of (is_valid, list_of_errors)
    """
    errors = []

    if not isinstance(config, dict):
        errors.append("Configuration must be a dictionary")
        return False, errors

    if "raspberry_pis" not in config:
        errors.append("Missing 'raspberry_pis' key in configuration")
        return False, errors

    if not isinstance(config["raspberry_pis"], dict):
        errors.append("'raspberry_pis' must be a dictionary")
        return False, errors

    if not config["raspberry_pis"]:
        errors.append("No Raspberry Pi devices configured")
        return False, errors

    # Validate each Pi entry
    for pi_key, pi_data in config["raspberry_pis"].items():
        if not isinstance(pi_data, dict):
            errors.append(f"Pi {pi_key}: Configuration must be a dictionary")
            continue

        # Check required fields
        required_fields = ["ip", "mac", "connection"]
        for field in required_fields:
            if field not in pi_data:
                errors.append(f"Pi {pi_key}: Missing required field '{field}'")

        # Validate IP address
        if "ip" in pi_data:
            from .utils import validate_ip_address
            if not validate_ip_address(pi_data["ip"]):
                errors.append(f"Pi {pi_key}: Invalid IP address '{pi_data['ip']}'")

        # Validate MAC address
        if "mac" in pi_data:
            from .utils import validate_mac_address
            if not validate_mac_address(pi_data["mac"]):
                errors.append(f"Pi {pi_key}: Invalid MAC address '{pi_data['mac']}'")

        # Validate connection type
        if "connection" in pi_data:
            valid_connections = ["Wired", "2.4G", "5G"]
            if pi_data["connection"] not in valid_connections:
                errors.append(
                    f"Pi {pi_key}: Invalid connection type '{pi_data['connection']}'. "
                    f"Must be one of: {', '.join(valid_connections)}"
                )

    return len(errors) == 0, errors


def get_pi_by_number(pi_number: int, connection_type: str = "auto") -> Tuple[Optional[Dict[str, Any]], Optional[str]]:
    """
    Get Pi configuration by number

    Args:
        pi_number: Pi number (1-indexed)
        connection_type: Connection preference ("ethernet", "wifi", "auto")

    Returns:
        Tuple of (pi_info_dict, connection_method_string) or (None, None) if not found
    """
    config = load_config()
    if not config.get("raspberry_pis"):
        return None, None

    return get_pi_info(config, pi_number, connection_type)


def get_all_pis(connection_type: Optional[str] = None) -> List[Dict[str, Any]]:
    """
    Get all Pi configurations, optionally filtered by connection type

    Args:
        connection_type: Optional filter ("ethernet", "wifi", None for all)

    Returns:
        List of Pi configuration dictionaries
    """
    config = load_config()
    all_pis = config.get("raspberry_pis", {})

    if connection_type is None:
        return list(all_pis.values())

    filtered = []
    for pi in all_pis.values():
        if connection_type == "ethernet" and pi.get("connection") == "Wired":
            filtered.append(pi)
        elif connection_type == "wifi" and pi.get("connection") in ["2.4G", "5G"]:
            filtered.append(pi)

    return filtered
