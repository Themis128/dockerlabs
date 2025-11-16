#!/usr/bin/env python3
"""
SSH Connection using Paramiko - Supports password and key authentication
Usage: python connect_ssh_paramiko.py [pi_number] [username] [password]
"""

import sys
import json
import socket
import argparse
import getpass

try:
    import paramiko
except ImportError:
    print("ERROR: paramiko not installed")
    print("Install it with: pip install paramiko")
    sys.exit(1)

def load_config():
    """Load Raspberry Pi configuration"""
    with open('pi-config.json', 'r') as f:
        return json.load(f)

def test_connectivity(ip, count=2):
    """Test network connectivity to IP"""
    try:
        import subprocess
        result = subprocess.run(
            ['ping', '-n' if sys.platform == 'win32' else '-c', str(count), ip],
            capture_output=True,
            timeout=10
        )
        return result.returncode == 0
    except:
        return False

def test_port(ip, port, timeout=3):
    """Test if a port is open"""
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(timeout)
        result = sock.connect_ex((ip, port))
        sock.close()
        return result == 0
    except:
        return False

def select_pi(config, pi_number, connection_type='auto'):
    """Select Raspberry Pi based on number and connection type"""
    all_pis = config['raspberry_pis']
    ethernet_pis = []
    wifi_pis = []

    for key, pi in all_pis.items():
        if pi['connection'] == 'Wired':
            ethernet_pis.append(pi)
        elif pi['connection'] == '2.4G':
            wifi_pis.append(pi)

    selected_pi = None
    connection_method = ""

    if connection_type == 'auto':
        # ALWAYS try Ethernet first (priority)
        if ethernet_pis:
            idx = pi_number - 1
            if 0 <= idx < len(ethernet_pis):
                selected_pi = ethernet_pis[idx]
                connection_method = "Ethernet"

        # Only fall back to WiFi if Ethernet Pi not found
        if not selected_pi and wifi_pis:
            idx = pi_number - 1
            if 0 <= idx < len(wifi_pis):
                selected_pi = wifi_pis[idx]
                connection_method = "WiFi"
                print(f"WARNING: Ethernet Pi #{pi_number} not found, using WiFi fallback")

    elif connection_type == 'ethernet':
        idx = pi_number - 1
        if 0 <= idx < len(ethernet_pis):
            selected_pi = ethernet_pis[idx]
            connection_method = "Ethernet"

    elif connection_type == 'wifi':
        idx = pi_number - 1
        if 0 <= idx < len(wifi_pis):
            selected_pi = wifi_pis[idx]
            connection_method = "WiFi"

    return selected_pi, connection_method

def connect_with_paramiko(ip, username, password=None, key_file=None):
    """Connect to Pi using Paramiko"""
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        # Try key-based authentication first if key file provided
        if key_file:
            try:
                key = paramiko.RSAKey.from_private_key_file(key_file)
                client.connect(ip, username=username, pkey=key, timeout=10)
                print("Connected using SSH key!")
                return client
            except Exception as e:
                print(f"Key authentication failed: {e}")
                print("Trying password authentication...")

        # Try password authentication
        if password:
            client.connect(ip, username=username, password=password, timeout=10)
            print("Connected using password!")
            return client
        else:
            # Prompt for password
            password = getpass.getpass(f"Enter password for {username}@{ip}: ")
            client.connect(ip, username=username, password=password, timeout=10)
            print("Connected using password!")
            return client

    except paramiko.AuthenticationException:
        print("ERROR: Authentication failed")
        print("  - Wrong password, or")
        print("  - Password authentication disabled, or")
        print("  - SSH key not found/incorrect")
        return None
    except paramiko.SSHException as e:
        print(f"ERROR: SSH connection failed: {e}")
        return None
    except Exception as e:
        print(f"ERROR: Connection failed: {e}")
        return None

def interactive_shell(client):
    """Start interactive shell session"""
    try:
        print("\n" + "=" * 40)
        print("SSH Session Started")
        print("Type commands (or 'exit' to disconnect)")
        print("=" * 40 + "\n")

        while True:
            try:
                command = input("$ ")
                if command.lower() in ['exit', 'quit', 'logout']:
                    break

                if not command.strip():
                    continue

                stdin, stdout, stderr = client.exec_command(command)
                output = stdout.read().decode('utf-8', errors='ignore')
                error = stderr.read().decode('utf-8', errors='ignore')

                if output:
                    print(output, end='')
                if error:
                    print(error, end='', file=sys.stderr)

            except KeyboardInterrupt:
                print("\n\nType 'exit' to disconnect")
            except EOFError:
                break

        print("\nDisconnecting...")

    except KeyboardInterrupt:
        print("\n\nConnection interrupted")
    except Exception as e:
        print(f"\nError in session: {e}")
    finally:
        client.close()

def execute_command(client, command):
    """Execute a single command and return output"""
    try:
        stdin, stdout, stderr = client.exec_command(command)
        output = stdout.read().decode('utf-8')
        error = stderr.read().decode('utf-8')
        return output, error, stdout.channel.recv_exit_status()
    except Exception as e:
        return "", str(e), -1

def main():
    parser = argparse.ArgumentParser(description='Connect to Raspberry Pi via SSH using Paramiko')
    parser.add_argument('pi_number', type=int, nargs='?', default=1, choices=[1, 2],
                       help='Pi number (1 or 2)')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')
    parser.add_argument('-p', '--password', help='SSH password (will prompt if not provided)')
    parser.add_argument('-k', '--key', help='Path to SSH private key file')
    parser.add_argument('-c', '--connection', choices=['ethernet', 'wifi', 'auto'],
                       default='auto', help='Connection type (default: auto, prioritizes Ethernet)')
    parser.add_argument('--command', help='Execute single command and exit (non-interactive)')

    args = parser.parse_args()

    # Load configuration
    try:
        config = load_config()
    except FileNotFoundError:
        print("ERROR: pi-config.json not found")
        sys.exit(1)

    # Select Pi
    selected_pi, connection_method = select_pi(config, args.pi_number, args.connection)

    if not selected_pi:
        print(f"ERROR: Raspberry Pi #{args.pi_number} not found")
        sys.exit(1)

    # Display connection info
    print("=" * 40)
    print(f"Connecting to Raspberry Pi via {connection_method}")
    print("=" * 40)
    print(f"Name: {selected_pi['name']}")
    print(f"IP Address: {selected_pi['ip']}")
    print(f"MAC Address: {selected_pi['mac']}")
    print(f"Connection: {selected_pi['connection']}")
    print(f"Username: {args.username}")
    print("=" * 40)
    print()

    # Test connectivity
    print("Testing connectivity...", end=' ', flush=True)
    if not test_connectivity(selected_pi['ip']):
        print("FAILED")
        print(f"ERROR: Cannot reach {selected_pi['ip']}")
        sys.exit(1)
    print("OK")

    # Test SSH port
    print("Testing SSH port...", end=' ', flush=True)
    if not test_port(selected_pi['ip'], 22):
        print("FAILED")
        print("ERROR: SSH port 22 is not accessible")
        sys.exit(1)
    print("Port 22 is open")
    print()

    # Connect using Paramiko
    print("Connecting via SSH (Paramiko)...")
    print()

    client = connect_with_paramiko(
        selected_pi['ip'],
        args.username,
        args.password,
        args.key
    )

    if not client:
        print("\nConnection failed. Please check:")
        print("  1. Password is correct")
        print("  2. Password authentication is enabled")
        print("  3. SSH key is correct (if using key)")
        sys.exit(1)

    # Execute command or start interactive session
    if args.command:
        print(f"Executing command: {args.command}")
        print()
        output, error, exit_code = execute_command(client, args.command)
        if output:
            print(output)
        if error:
            print(error, file=sys.stderr)
        client.close()
        sys.exit(exit_code)
    else:
        # Interactive session
        interactive_shell(client)

if __name__ == '__main__':
    main()
