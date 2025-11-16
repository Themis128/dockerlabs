#!/usr/bin/env python3
"""
Test connectivity to all Raspberry Pis
Usage: python test_connections.py
"""

import json
import subprocess
import socket
import sys
import os
import re


def load_config():
    """Load Raspberry Pi configuration"""
    # Get project root (two levels up from scripts/python/)
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.dirname(os.path.dirname(script_dir))
    config_path = os.path.join(project_root, "pi-config.json")
    with open(config_path, "r", encoding='utf-8') as f:
        return json.load(f)


def test_ping(ip, count=2):
    """Test ping connectivity"""
    try:
        result = subprocess.run(
            ["ping", "-n" if sys.platform == "win32" else "-c", str(count), ip],
            capture_output=True,
            timeout=10,
            check=False,
        )
        return result.returncode == 0
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
        # Network/system errors are expected in connectivity tests
        return False
    except Exception as e:
        # Log unexpected errors but don't crash
        print(f"Warning: Unexpected error in ping test: {e}", file=sys.stderr)
        return False


def test_port(ip, port, timeout=2):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except (socket.error, OSError, ValueError):
        # Network/socket errors are expected in port tests
        return False
    except Exception as e:
        # Log unexpected errors but don't crash
        print(f"Warning: Unexpected error in port test: {e}", file=sys.stderr)
        return False


def test_pi(pi_name, ip, connection_type):
    """Test connectivity to a single Pi and return results as dict"""
    result = {
        'name': pi_name,
        'ip': ip,
        'connection_type': connection_type,
        'ping': False,
        'ping_time': None,
        'ssh_open': False,
        'telnet_open': False,
        'online': False
    }

    # Test ping with timing
    ping_success = test_ping(ip, count=2)
    result['ping'] = ping_success
    result['online'] = ping_success

    # Try to get ping time (approximate)
    if ping_success:
        # Quick ping to get time
        try:
            if sys.platform == "win32":
                ping_result = subprocess.run(
                    ["ping", "-n", "1", "-w", "2000", ip],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if ping_result.returncode == 0:
                    time_match = re.search(r'time[<=](\d+)ms', ping_result.stdout, re.IGNORECASE)
                    if time_match:
                        result['ping_time'] = int(time_match.group(1))
            else:
                ping_result = subprocess.run(
                    ["ping", "-c", "1", "-W", "2", ip],
                    capture_output=True,
                    text=True,
                    timeout=3
                )
                if ping_result.returncode == 0:
                    time_match = re.search(r'time=([\d.]+)\s*ms', ping_result.stdout)
                    if time_match:
                        result['ping_time'] = float(time_match.group(1))
        except Exception:
            pass

    # Test SSH
    result['ssh_open'] = test_port(ip, 22, timeout=2)

    # Test Telnet
    result['telnet_open'] = test_port(ip, 23, timeout=2)

    return result


def main():
    try:
        config = load_config()
    except FileNotFoundError:
        error_result = {
            "success": False,
            "error": "pi-config.json not found in project root",
            "results": []
        }
        print(json.dumps(error_result))
        sys.exit(1)

    all_pis = config["raspberry_pis"]
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi["connection"] == "Wired":
            ethernet_pis.append(pi)
        elif pi["connection"] == "2.4G":
            wifi_pis.append(pi)

    results = []

    # Test Ethernet Pis first (priority)
    for pi in ethernet_pis:
        result = test_pi(pi["name"], pi["ip"], pi["connection"])
        results.append(result)

    # Test WiFi Pis
    for pi in wifi_pis:
        result = test_pi(pi["name"], pi["ip"], pi["connection"])
        results.append(result)

    # Output JSON result
    output = {
        "success": True,
        "results": results,
        "total_tested": len(results),
        "online_count": sum(1 for r in results if r["online"]),
        "offline_count": sum(1 for r in results if not r["online"])
    }

    print(json.dumps(output))


if __name__ == "__main__":
    main()
