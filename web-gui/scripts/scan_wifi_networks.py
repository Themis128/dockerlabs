#!/usr/bin/env python3
"""
Scan for available WiFi networks
Returns JSON list of discovered networks with SSID, signal strength, security type, etc.
"""
import json
import subprocess
import re


def scan_networks():
    """
    Scan for available WiFi networks using iwlist or nmcli
    Returns list of network dictionaries
    """
    networks = []

    try:
        # Try using iwlist (common on Raspberry Pi)
        result = subprocess.run(
            ['iwlist', 'scan'],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )

        if result.returncode == 0:
            networks = parse_iwlist_output(result.stdout)
        else:
            # Try nmcli as fallback
            result = subprocess.run(
                ['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY,FREQ', 'device', 'wifi', 'list'],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            if result.returncode == 0:
                networks = parse_nmcli_output(result.stdout)
    except FileNotFoundError:
        # Neither tool available
        pass
    except subprocess.TimeoutExpired:
        pass
    except (OSError, subprocess.SubprocessError):
        # Return empty list on error
        pass

    return networks


def parse_iwlist_output(output):
    """Parse iwlist scan output"""
    networks = []
    current_network = {}

    for line in output.split('\n'):
        line = line.strip()

        # SSID
        if 'ESSID:' in line:
            ssid_match = re.search(r'ESSID:"([^"]*)"', line)
            if ssid_match:
                current_network['ssid'] = ssid_match.group(1)

        # Signal strength
        elif 'Signal level=' in line:
            signal_match = re.search(r'Signal level=(-?\d+)', line)
            if signal_match:
                current_network['signal_strength'] = int(signal_match.group(1))

        # Security/Encryption
        elif 'Encryption key:' in line:
            if 'on' in line.lower():
                current_network['encrypted'] = True
            else:
                current_network['encrypted'] = False
        elif 'IEEE 802.11i/WPA2' in line:
            current_network['security'] = 'WPA2'
        elif 'WPA3' in line or 'SAE' in line:
            current_network['security'] = 'WPA3'
        elif 'WPA' in line:
            current_network['security'] = 'WPA'

        # Frequency
        elif 'Frequency:' in line:
            freq_match = re.search(r'Frequency:(\d+\.\d+)', line)
            if freq_match:
                freq = float(freq_match.group(1))
                if freq < 3.0:
                    current_network['band'] = '2.4GHz'
                else:
                    current_network['band'] = '5GHz'

        # End of network block
        if line == '' and current_network:
            if 'ssid' in current_network and current_network['ssid']:
                networks.append(current_network)
            current_network = {}

    # Add last network
    if current_network and 'ssid' in current_network and current_network['ssid']:
        networks.append(current_network)

    return networks


def parse_nmcli_output(output):
    """Parse nmcli output"""
    networks = []

    for line in output.split('\n'):
        if not line.strip():
            continue

        parts = line.split(':')
        if len(parts) >= 4:
            network = {
                'ssid': parts[0] if parts[0] else None,
                'signal_strength': int(parts[1]) if parts[1].isdigit() else None,
                'security': parts[2] if parts[2] else 'Open',
                'band': '5GHz' if float(parts[3]) > 5000 else '2.4GHz' if parts[3] else None
            }

            if network['ssid']:
                networks.append(network)

    return networks


def main():
    """Main entry point"""
    try:
        networks = scan_networks()
        print(json.dumps({
            'success': True,
            'networks': networks,
            'count': len(networks)
        }))
    except (OSError, subprocess.SubprocessError, json.JSONDecodeError) as e:
        print(json.dumps({
            'success': False,
            'error': str(e),
            'networks': []
        }))


if __name__ == '__main__':
    main()
