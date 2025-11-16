#!/usr/bin/env python3
"""
Configure Raspberry Pi settings via SSH
"""
import sys
import json
import argparse
import subprocess

def configure_ssh(ip, username, settings):
    """Configure SSH settings on Pi"""
    commands = []
    
    if 'enable_ssh' in settings and settings['enable_ssh']:
        # Enable SSH (create /boot/ssh file or enable service)
        commands.append('sudo systemctl enable ssh')
        commands.append('sudo systemctl start ssh')
    
    if 'password_auth' in settings:
        # Configure password authentication
        if settings['password_auth']:
            commands.append("sudo sed -i 's/#PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config")
            commands.append("sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config")
        else:
            commands.append("sudo sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config")
    
    if 'ssh_port' in settings and settings['ssh_port'] != 22:
        port = settings['ssh_port']
        commands.append(f"sudo sed -i 's/#Port 22/Port {port}/' /etc/ssh/sshd_config")
        commands.append(f"sudo sed -i 's/^Port .*/Port {port}/' /etc/ssh/sshd_config")
    
    if commands:
        commands.append('sudo systemctl restart ssh')
    
    return commands

def configure_telnet(ip, username, settings):
    """Configure telnet settings on Pi"""
    commands = []
    
    if 'enable_telnet' in settings and settings['enable_telnet']:
        commands.append('sudo apt-get update -y')
        commands.append('sudo apt-get install -y telnetd inetutils-inetd')
        commands.append('sudo systemctl enable inetd')
        commands.append('sudo systemctl start inetd')
    else:
        commands.append('sudo systemctl stop inetd')
        commands.append('sudo systemctl disable inetd')
    
    return commands

def configure_network(ip, username, settings):
    """Configure network settings on Pi"""
    commands = []
    
    if 'hostname' in settings and settings['hostname']:
        hostname = settings['hostname']
        commands.append(f"sudo hostnamectl set-hostname {hostname}")
        commands.append(f"echo '{hostname}' | sudo tee /etc/hostname")
    
    if 'wifi_enable' in settings and settings['wifi_enable']:
        if 'wifi_ssid' in settings and 'wifi_password' in settings:
            # Configure WiFi (simplified - would need wpa_supplicant config)
            commands.append('# WiFi configuration would be added here')
    
    return commands

def execute_commands(ip, username, commands):
    """Execute commands on Pi via SSH"""
    if not commands:
        return True, "No commands to execute"
    
    # Combine commands
    command_string = ' && '.join(commands)
    
    try:
        result = subprocess.run(
            ['ssh', '-o', 'StrictHostKeyChecking=no', '-o', 'ConnectTimeout=10',
             f'{username}@{ip}', command_string],
            capture_output=True,
            text=True,
            timeout=60
        )
        
        if result.returncode == 0:
            return True, result.stdout
        else:
            return False, result.stderr
    except Exception as e:
        return False, str(e)

def main():
    parser = argparse.ArgumentParser(description='Configure Raspberry Pi settings')
    parser.add_argument('pi_number', type=int, choices=[1, 2], help='Pi number (1 or 2)')
    parser.add_argument('--settings', type=str, required=True, help='JSON settings string')
    parser.add_argument('-u', '--username', default='pi', help='SSH username')
    
    args = parser.parse_args()
    
    # Load config to get IP
    try:
        with open('pi-config.json', 'r') as f:
            config = json.load(f)
    except FileNotFoundError:
        print(json.dumps({'success': False, 'error': 'pi-config.json not found'}))
        sys.exit(1)
    
    # Get Pi IP (Ethernet preferred)
    all_pis = config['raspberry_pis']
    ethernet_pis = [pi for key, pi in all_pis.items() if pi['connection'] == 'Wired']
    
    if args.pi_number > len(ethernet_pis):
        print(json.dumps({'success': False, 'error': f'Pi {args.pi_number} not found'}))
        sys.exit(1)
    
    selected_pi = ethernet_pis[args.pi_number - 1]
    ip = selected_pi['ip']
    
    # Parse settings
    try:
        settings = json.loads(args.settings)
    except json.JSONDecodeError:
        print(json.dumps({'success': False, 'error': 'Invalid JSON settings'}))
        sys.exit(1)
    
    # Build commands
    all_commands = []
    all_commands.extend(configure_ssh(ip, args.username, settings.get('ssh', {})))
    all_commands.extend(configure_telnet(ip, args.username, settings.get('telnet', {})))
    all_commands.extend(configure_network(ip, args.username, settings.get('network', {})))
    
    # Execute
    success, message = execute_commands(ip, args.username, all_commands)
    
    print(json.dumps({
        'success': success,
        'message': message,
        'pi': args.pi_number,
        'ip': ip
    }))

if __name__ == '__main__':
    main()

