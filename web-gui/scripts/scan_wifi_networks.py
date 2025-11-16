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
        # Linux/Unix: Try nmcli first (more reliable, doesn't need root), then iwlist
        networks = []
        error_messages = []

        # First, try nmcli (doesn't require root, more reliable)
        try:
            result = subprocess.run(
                ['nmcli', '-t', '-f', 'SSID,SIGNAL,SECURITY,FREQ', 'device', 'wifi', 'list'],
                capture_output=True,
                text=True,
                timeout=30,
                check=False,
            )

            if result.returncode == 0 and result.stdout.strip():
                networks = parse_nmcli_output(result.stdout)
                if networks:
                    return networks
            elif result.returncode != 0:
                error_messages.append(f"nmcli failed: {result.stderr.strip() if result.stderr else 'Unknown error'}")
        except FileNotFoundError:
            error_messages.append("nmcli not found")
        except subprocess.TimeoutExpired:
            error_messages.append("nmcli timed out")
        except (OSError, subprocess.SubprocessError) as e:
            error_messages.append(f"nmcli error: {str(e)}")

        # Fallback to iwlist (requires root or proper permissions)
        try:
            # Try to find wireless interface
            interface = None
            try:
                # Try common interface names
                for iface in ['wlan0', 'wlan1', 'wlp2s0', 'wlp3s0']:
                    check_result = subprocess.run(
                        ['iw', 'dev', iface, 'info'],
                        capture_output=True,
                        text=True,
                        timeout=5,
                        check=False,
                    )
                    if check_result.returncode == 0:
                        interface = iface
                        break
            except:
                pass

            # If no interface found, try iwlist scan without interface (may work)
            if interface:
                result = subprocess.run(
                    ['iwlist', interface, 'scan'],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )
            else:
                # Try without interface name (may work on some systems)
                result = subprocess.run(
                    ['iwlist', 'scanning'],
                    capture_output=True,
                    text=True,
                    timeout=30,
                    check=False,
                )

            if result.returncode == 0 and result.stdout.strip():
                networks = parse_iwlist_output(result.stdout)
                if networks:
                    return networks
            elif result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr else 'Unknown error'
                if 'Operation not permitted' in error_msg or 'Permission denied' in error_msg:
                    error_messages.append("iwlist requires root permissions. Try: sudo iwlist scan")
                else:
                    error_messages.append(f"iwlist failed: {error_msg}")
        except FileNotFoundError:
            error_messages.append("iwlist not found")
        except subprocess.TimeoutExpired:
            error_messages.append("iwlist timed out")
        except (OSError, subprocess.SubprocessError) as e:
            error_messages.append(f"iwlist error: {str(e)}")

        # If we got here, both methods failed
        if not networks:
            if error_messages:
                raise Exception(f"WiFi scan failed. {'; '.join(error_messages)}. Install NetworkManager (nmcli) or wireless-tools (iwlist).")
            else:
                raise Exception("WiFi scanning tools (iwlist/nmcli) not found. Install wireless-tools or NetworkManager")

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
            ssid = parts[0].strip() if parts[0] else None
            signal_str = parts[1].strip() if len(parts) > 1 else ''
            security = parts[2].strip() if len(parts) > 2 else 'Open'
            freq_str = parts[3].strip() if len(parts) > 3 else ''

            # Skip empty SSIDs
            if not ssid or ssid == '--':
                continue

            network = {
                'ssid': ssid,
                'security': security if security and security != '--' else 'Unknown',
            }

            # Parse signal strength (nmcli returns percentage 0-100)
            if signal_str and signal_str.isdigit():
                signal_val = int(signal_str)
                # nmcli already returns percentage, but we'll store as signal_strength
                network['signal_strength'] = signal_val
                # Also add signal for compatibility
                network['signal'] = signal_val

            # Parse frequency to determine band
            if freq_str:
                try:
                    freq = float(freq_str)
                    if freq > 5000:
                        network['band'] = '5GHz'
                    else:
                        network['band'] = '2.4GHz'
                except ValueError:
                    pass

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
