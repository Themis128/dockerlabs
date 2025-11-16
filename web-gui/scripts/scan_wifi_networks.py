#!/usr/bin/env python3
"""
Scan for available WiFi networks
Returns JSON list of discovered networks with SSID, signal strength, security type, etc.
"""
import json
import subprocess
import re
import platform
import sys


def scan_networks():
    """
    Scan for available WiFi networks
    Supports Windows (netsh), Linux (iwlist/nmcli)
    Returns list of network dictionaries
    """
    networks = []
    system = platform.system().lower()

    if system == 'windows':
        # Use netsh on Windows
        # Try mode=Bssid first (more detailed, but may require admin)
        # Fall back to basic mode if that fails
        try:
            result = subprocess.run(
                ['netsh', 'wlan', 'show', 'networks', 'mode=Bssid'],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.returncode == 0 and result.stdout.strip():
                try:
                    networks = parse_netsh_output(result.stdout)
                    # Return networks even if empty (no networks found is valid)
                    return networks
                except Exception as parse_error:
                    # If parsing fails, try basic mode as fallback
                    pass

            # Fallback to basic mode (doesn't require admin)
            result = subprocess.run(
                ['netsh', 'wlan', 'show', 'networks'],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )
            if result.returncode == 0:
                if result.stdout.strip():
                    try:
                        networks = parse_netsh_output(result.stdout)
                        return networks
                    except Exception as parse_error:
                        # Parsing failed, but command succeeded - return empty list
                        return []
                else:
                    # Empty output but successful - no networks found
                    return []
            elif result.returncode != 0:
                # netsh failed - might be no WiFi adapter or other issue
                error_msg = result.stderr.strip() if result.stderr else "WiFi scanning failed"
                if "There is no wireless interface" in error_msg or "No wireless interface" in error_msg:
                    raise Exception("No wireless network adapter found")
                elif "Access is denied" in error_msg or "denied" in error_msg.lower():
                    raise Exception("Access denied. Try running as administrator or use basic scan mode")
                else:
                    # Unknown error - include stderr in message
                    raise Exception(f"WiFi scan failed: {error_msg}")
        except FileNotFoundError:
            raise Exception("netsh command not found. WiFi scanning requires Windows netsh utility")
        except subprocess.TimeoutExpired:
            raise Exception("WiFi scan timed out after 30 seconds")
        except (OSError, subprocess.SubprocessError) as e:
            raise Exception(f"Error running netsh command: {str(e)}")
    else:
        # Linux/Unix: Try iwlist first, then nmcli
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
            raise Exception("WiFi scanning tools (iwlist/nmcli) not found. Install wireless-tools or NetworkManager")
        except subprocess.TimeoutExpired:
            raise Exception("WiFi scan timed out after 30 seconds")
        except (OSError, subprocess.SubprocessError) as e:
            raise Exception(f"Error running WiFi scan command: {str(e)}")

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


def parse_netsh_output(output):
    """Parse Windows netsh wlan show networks output"""
    networks = []
    current_network = {}
    seen_ssids = set()

    # Check for common error messages in output
    if not output or not output.strip():
        return networks

    # Check for error messages in output
    output_lower = output.lower()
    if "there is no wireless interface" in output_lower or "no wireless interface" in output_lower:
        raise Exception("No wireless network adapter found")
    if "access is denied" in output_lower or ("denied" in output_lower and "access" in output_lower):
        raise Exception("Access denied. Try running as administrator")

    for line in output.split('\n'):
        line = line.strip()

        # SSID line: "SSID 1 : NetworkName"
        if line.startswith('SSID'):
            # Extract SSID number and name
            ssid_match = re.search(r'SSID\s+\d+\s*:\s*(.+)', line)
            if ssid_match:
                ssid = ssid_match.group(1).strip()
                # If we have a previous network, save it
                if current_network and 'ssid' in current_network:
                    ssid_key = current_network['ssid']
                    if ssid_key not in seen_ssids:
                        networks.append(current_network)
                        seen_ssids.add(ssid_key)
                # Start new network
                current_network = {'ssid': ssid, 'encrypted': False}

        # Network type: "Network type            : Infrastructure"
        elif 'Network type' in line:
            # Skip, not needed
            pass

        # Authentication: "Authentication        : WPA2-Personal"
        elif 'Authentication' in line:
            auth_match = re.search(r'Authentication\s*:\s*(.+)', line)
            if auth_match:
                auth = auth_match.group(1).strip()
                if 'WPA3' in auth or 'SAE' in auth:
                    current_network['security'] = 'WPA3'
                elif 'WPA2' in auth:
                    current_network['security'] = 'WPA2'
                elif 'WPA' in auth:
                    current_network['security'] = 'WPA'
                elif 'Open' in auth or 'None' in auth:
                    current_network['security'] = 'Open'
                    current_network['encrypted'] = False
                else:
                    current_network['security'] = auth
                    current_network['encrypted'] = True

        # Encryption: "Encryption            : CCMP"
        elif 'Encryption' in line:
            current_network['encrypted'] = True

        # Signal: "Signal             : 85%"
        elif 'Signal' in line and '%' in line:
            signal_match = re.search(r'Signal\s*:\s*(\d+)%', line)
            if signal_match:
                # Convert percentage to approximate dBm
                # 100% = -30 dBm, 0% = -100 dBm (approximate)
                percentage = int(signal_match.group(1))
                signal_dbm = -100 + (percentage * 0.7)  # Rough conversion
                current_network['signal_strength'] = int(signal_dbm)

        # Radio type: "Radio type         : 802.11ac"
        elif 'Radio type' in line:
            radio_match = re.search(r'Radio type\s*:\s*(.+)', line)
            if radio_match:
                radio = radio_match.group(1).strip()
                if '802.11ac' in radio or '802.11ax' in radio or '802.11n' in radio:
                    # These typically use 5GHz, but can be 2.4GHz too
                    # We'll default to 5GHz for AC/AX
                    if '802.11ac' in radio or '802.11ax' in radio:
                        current_network['band'] = '5GHz'
                    else:
                        current_network['band'] = '2.4GHz'
                elif '802.11g' in radio or '802.11b' in radio:
                    current_network['band'] = '2.4GHz'

    # Add the last network
    if current_network and 'ssid' in current_network:
        ssid_key = current_network['ssid']
        if ssid_key not in seen_ssids:
            networks.append(current_network)
            seen_ssids.add(ssid_key)

    return networks


def main():
    """Main entry point"""
    try:
        networks = scan_networks()
        # Always output valid JSON
        result = {
            'success': True,
            'networks': networks,
            'count': len(networks)
        }
        print(json.dumps(result))
        sys.stdout.flush()  # Ensure output is flushed
    except Exception as e:
        # Catch all exceptions and return valid JSON
        error_msg = str(e)
        result = {
            'success': False,
            'error': error_msg,
            'networks': [],
            'count': 0
        }
        print(json.dumps(result))
        sys.stdout.flush()
        sys.exit(1)  # Exit with error code


if __name__ == '__main__':
    main()
