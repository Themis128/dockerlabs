#!/usr/bin/env python3
"""
Scan network for Raspberry Pi devices
Discovers devices by:
1. Reading ARP table (shows devices that have communicated recently)
2. Scanning common Raspberry Pi ports (22, 80, 443)
3. Checking MAC address OUI for Raspberry Pi Foundation
4. Pinging discovered IPs to verify they're online

Returns JSON with discovered devices and their status
"""

import json
import subprocess
import socket
import sys
import os
import re
import time
from typing import Dict, List, Optional, Tuple
import ipaddress


# Raspberry Pi Foundation MAC address prefixes (OUI)
RPI_MAC_PREFIXES = [
    'b8:27:eb',  # Raspberry Pi Foundation
    'dc:a6:32',  # Raspberry Pi Foundation
    'e4:5f:01',  # Raspberry Pi Foundation
    '28:cd:c1',  # Raspberry Pi Foundation
]

# Common Raspberry Pi ports to check
RPI_PORTS = [22, 80, 443, 5000, 8080]


def get_local_network() -> Optional[Tuple[str, str]]:
    """Get local network IP and subnet"""
    try:
        # Get default gateway interface
        if sys.platform == "win32":
            # Windows: Get default gateway
            result = subprocess.run(
                ["route", "print", "0.0.0.0"],
                capture_output=True,
                text=True,
                timeout=5
            )
            if result.returncode == 0:
                lines = result.stdout.split('\n')
                for line in lines:
                    if '0.0.0.0' in line and 'On-link' not in line:
                        parts = line.split()
                        if len(parts) >= 3:
                            gateway = parts[2]
                            # Get interface IP
                            result2 = subprocess.run(
                                ["ipconfig"],
                                capture_output=True,
                                text=True,
                                timeout=5
                            )
                            if result2.returncode == 0:
                                for line2 in result2.stdout.split('\n'):
                                    if 'IPv4' in line2 or 'IP Address' in line2:
                                        ip_match = re.search(r'(\d+\.\d+\.\d+\.\d+)', line2)
                                        if ip_match:
                                            ip = ip_match.group(1)
                                            # Assume /24 subnet
                                            return (ip, f"{'.'.join(ip.split('.')[:-1])}.0/24")
        else:
            # Linux/Mac: Use ip or ifconfig
            try:
                result = subprocess.run(
                    ["ip", "route", "get", "8.8.8.8"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    # Extract source IP
                    match = re.search(r'src\s+(\d+\.\d+\.\d+\.\d+)', result.stdout)
                    if match:
                        ip = match.group(1)
                        # Get subnet mask
                        result2 = subprocess.run(
                            ["ip", "addr", "show"],
                            capture_output=True,
                            text=True,
                            timeout=5
                        )
                        if result2.returncode == 0:
                            # Find interface with this IP
                            for line in result2.stdout.split('\n'):
                                if ip in line:
                                    # Look for subnet in next lines
                                    subnet_match = re.search(r'(\d+\.\d+\.\d+\.\d+/\d+)', line)
                                    if subnet_match:
                                        return (ip, subnet_match.group(1))
                            # Default to /24
                            return (ip, f"{'.'.join(ip.split('.')[:-1])}.0/24")
            except (subprocess.SubprocessError, FileNotFoundError):
                # Fallback to ifconfig
                result = subprocess.run(
                    ["ifconfig"],
                    capture_output=True,
                    text=True,
                    timeout=5
                )
                if result.returncode == 0:
                    # Find first non-loopback interface with IPv4
                    for line in result.stdout.split('\n'):
                        if 'inet ' in line and '127.0.0.1' not in line:
                            match = re.search(r'inet\s+(\d+\.\d+\.\d+\.\d+)', line)
                            if match:
                                ip = match.group(1)
                                return (ip, f"{'.'.join(ip.split('.')[:-1])}.0/24")
    except Exception as e:
        print(f"Warning: Could not determine local network: {e}", file=sys.stderr)

    return None


def get_arp_table() -> List[Dict[str, str]]:
    """Get ARP table entries"""
    devices = []

    try:
        if sys.platform == "win32":
            # Windows: arp -a
            result = subprocess.run(
                ["arp", "-a"],
                capture_output=True,
                text=True,
                timeout=10
            )
            if result.returncode == 0:
                # Parse ARP table output
                for line in result.stdout.split('\n'):
                    # Format: "  192.168.1.1          00-11-22-33-44-55     dynamic"
                    match = re.search(r'(\d+\.\d+\.\d+\.\d+)\s+([0-9a-fA-F-]{17})', line)
                    if match:
                        ip = match.group(1)
                        mac = match.group(2).replace('-', ':').lower()
                        devices.append({'ip': ip, 'mac': mac})
        else:
            # Linux/Mac: arp -a or ip neigh
            try:
                result = subprocess.run(
                    ["ip", "neigh", "show"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        # Format: "192.168.1.1 dev eth0 lladdr 00:11:22:33:44:55"
                        match = re.search(r'(\d+\.\d+\.\d+\.\d+).*?([0-9a-fA-F:]{17})', line)
                        if match:
                            ip = match.group(1)
                            mac = match.group(2).lower()
                            devices.append({'ip': ip, 'mac': mac})
            except (subprocess.SubprocessError, FileNotFoundError):
                # Fallback to arp -a
                result = subprocess.run(
                    ["arp", "-a"],
                    capture_output=True,
                    text=True,
                    timeout=10
                )
                if result.returncode == 0:
                    for line in result.stdout.split('\n'):
                        # Format: "hostname (192.168.1.1) at 00:11:22:33:44:55"
                        match = re.search(r'\((\d+\.\d+\.\d+\.\d+)\)\s+at\s+([0-9a-fA-F:]{17})', line)
                        if match:
                            ip = match.group(1)
                            mac = match.group(2).lower()
                            devices.append({'ip': ip, 'mac': mac})
    except Exception as e:
        print(f"Warning: Could not read ARP table: {e}", file=sys.stderr)

    return devices


def is_raspberry_pi_mac(mac: str) -> bool:
    """Check if MAC address belongs to Raspberry Pi Foundation"""
    if not mac:
        return False
    mac_lower = mac.lower().replace('-', ':')
    for prefix in RPI_MAC_PREFIXES:
        if mac_lower.startswith(prefix):
            return True
    return False


def test_ping(ip: str, count: int = 1, timeout: int = 2) -> Tuple[bool, Optional[float]]:
    """Test ping connectivity and return (success, response_time_ms)"""
    try:
        if sys.platform == "win32":
            result = subprocess.run(
                ["ping", "-n", str(count), "-w", str(timeout * 1000), ip],
                capture_output=True,
                text=True,
                timeout=timeout + 2
            )
            if result.returncode == 0:
                # Extract time from output: "time=5ms" or "time<1ms"
                time_match = re.search(r'time[<=](\d+)ms', result.stdout, re.IGNORECASE)
                if time_match:
                    return (True, float(time_match.group(1)))
                return (True, None)
        else:
            result = subprocess.run(
                ["ping", "-c", str(count), "-W", str(timeout), ip],
                capture_output=True,
                text=True,
                timeout=timeout + 2
            )
            if result.returncode == 0:
                # Extract time from output: "time=5.123 ms"
                time_match = re.search(r'time=([\d.]+)\s*ms', result.stdout)
                if time_match:
                    return (True, float(time_match.group(1)))
                return (True, None)
    except (subprocess.TimeoutExpired, subprocess.SubprocessError, OSError):
        pass
    except Exception as e:
        print(f"Warning: Ping test error for {ip}: {e}", file=sys.stderr)

    return (False, None)


def test_port(ip: str, port: int, timeout: float = 1.0) -> bool:
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except Exception:
        return False


def scan_ip_range(network: str, max_ips: int = 30) -> List[str]:
    """Scan IP range for responsive hosts (quick ping scan)

    Args:
        network: Network CIDR notation (e.g., "192.168.1.0/24")
        max_ips: Maximum number of IPs to scan (reduced for speed)
    """
    responsive_ips = []

    try:
        net = ipaddress.ip_network(network, strict=False)
        # Limit to /24 networks to avoid scanning too many IPs
        if net.num_addresses > 256:
            print(f"Warning: Network {network} is too large, limiting scan", file=sys.stderr)
            return []

        # Scan fewer IPs for speed (reduced from 50 to 30)
        hosts = list(net.hosts())[:max_ips]

        for ip in hosts:
            ip_str = str(ip)
            # Quick ping test with shorter timeout
            success, _ = test_ping(ip_str, count=1, timeout=0.5)  # Reduced from 1 to 0.5
            if success:
                responsive_ips.append(ip_str)
    except Exception as e:
        print(f"Warning: Could not scan network {network}: {e}", file=sys.stderr)

    return responsive_ips


def identify_device(ip: str, mac: Optional[str] = None, quick_mode: bool = False) -> Dict[str, any]:
    """Identify device type and gather information

    Args:
        ip: IP address to identify
        mac: Optional MAC address
        quick_mode: If True, skip port scanning and use faster timeouts
    """
    device = {
        'ip': ip,
        'mac': mac or 'Unknown',
        'name': f'Device {ip}',
        'is_raspberry_pi': False,
        'is_online': False,
        'ping_time': None,
        'open_ports': [],
        'connection_type': 'Unknown'
    }

    # Check if MAC indicates Raspberry Pi first (fast check)
    if mac and is_raspberry_pi_mac(mac):
        device['is_raspberry_pi'] = True
        device['name'] = f'Raspberry Pi ({ip})'

    # Test ping with shorter timeout in quick mode
    ping_timeout = 1 if quick_mode else 2
    ping_count = 1 if quick_mode else 2
    is_online, ping_time = test_ping(ip, count=ping_count, timeout=ping_timeout)
    device['is_online'] = is_online
    device['ping_time'] = ping_time

    if not is_online:
        return device

    # In quick mode, only check SSH port (most important for Pi detection)
    if quick_mode:
        if test_port(ip, 22, timeout=0.5):
            device['open_ports'].append(22)
            device['is_raspberry_pi'] = True
            if not device['name'].startswith('Raspberry Pi'):
                device['name'] = f'Raspberry Pi ({ip})'
    else:
        # Check for common Raspberry Pi ports
        for port in RPI_PORTS:
            if test_port(ip, port, timeout=0.5):  # Reduced from 1.0 to 0.5
                device['open_ports'].append(port)
                # If SSH (22) is open, likely a Raspberry Pi
                if port == 22:
                    device['is_raspberry_pi'] = True
                    if not device['name'].startswith('Raspberry Pi'):
                        device['name'] = f'Raspberry Pi ({ip})'

    # Determine connection type based on network
    if ip.startswith('192.168.') or ip.startswith('10.') or ip.startswith('172.'):
        # Could be ethernet or wifi, but we'll mark as detected
        device['connection_type'] = 'Detected'

    return device


def main():
    """Main scanning function with timeout protection"""
    discovered_devices = []
    scan_start_time = time.time()
    max_scan_time = 50  # Maximum time to spend scanning (seconds)

    # Method 1: Read ARP table (fastest, shows recently active devices)
    print("Scanning ARP table...", file=sys.stderr)
    arp_devices = get_arp_table()

    # Process ARP entries with timeout check
    for arp_entry in arp_devices:
        # Check if we're running out of time
        if time.time() - scan_start_time > max_scan_time:
            print("Warning: Scan timeout approaching, returning partial results", file=sys.stderr)
            break

        ip = arp_entry.get('ip')
        mac = arp_entry.get('mac')

        if not ip:
            continue

        # Skip localhost and broadcast
        if ip.startswith('127.') or ip.startswith('169.254.'):
            continue

        # Use quick mode for ARP entries to speed things up
        device = identify_device(ip, mac, quick_mode=True)
        if device['is_online']:
            discovered_devices.append(device)

    # Method 2: Scan local network (slower but more thorough)
    # Only do this if we have time and haven't found many devices
    elapsed_time = time.time() - scan_start_time
    if elapsed_time < max_scan_time - 10:  # Leave 10 seconds buffer
        print("Scanning local network...", file=sys.stderr)
        network_info = get_local_network()
        if network_info:
            _, network = network_info
            # Only scan if we haven't found many devices from ARP
            if len(discovered_devices) < 5:
                # Reduce max IPs to scan for speed
                responsive_ips = scan_ip_range(network, max_ips=20)
                for ip in responsive_ips:
                    # Check timeout before each device
                    if time.time() - scan_start_time > max_scan_time:
                        break
                    # Skip if already discovered
                    if any(d['ip'] == ip for d in discovered_devices):
                        continue

                    device = identify_device(ip, quick_mode=True)
                    if device['is_online']:
                        discovered_devices.append(device)

    # Filter and prioritize Raspberry Pi devices
    rpi_devices = [d for d in discovered_devices if d['is_raspberry_pi']]
    other_devices = [d for d in discovered_devices if not d['is_raspberry_pi']]

    # Combine: Raspberry Pis first, then others
    all_devices = rpi_devices + other_devices

    # Output JSON
    result = {
        'success': True,
        'devices': all_devices,
        'raspberry_pis': rpi_devices,
        'total_discovered': len(all_devices),
        'raspberry_pi_count': len(rpi_devices),
        'scan_timestamp': time.time(),
        'scan_duration': round(time.time() - scan_start_time, 2)
    }

    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
