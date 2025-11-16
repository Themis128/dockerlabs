#!/bin/bash
# Complete Setup Script for Raspberry Pi
# Run this on the Pi after adding your SSH key
# Usage: bash create-pi-setup-script.sh

echo "=========================================="
echo "Raspberry Pi Complete Setup"
echo "=========================================="
echo ""

# Add SSH key (you'll need to paste your public key)
echo "Step 1: Adding SSH Key"
echo "----------------------"
echo "Your SSH public key should already be added."
echo "If not, run the command from Windows: .\get-pi-command.ps1"
echo ""

# Open ports 22 and 23
echo "Step 2: Opening Ports 22 (SSH) and 23 (Telnet)"
echo "-----------------------------------------------"

if command -v ufw &> /dev/null; then
    echo "Using UFW firewall..."
    sudo ufw allow 22/tcp comment 'SSH'
    sudo ufw allow 23/tcp comment 'Telnet'
    sudo ufw --force enable
    echo "✓ Ports 22 and 23 opened"
elif command -v firewall-cmd &> /dev/null; then
    echo "Using firewalld..."
    sudo firewall-cmd --permanent --add-port=22/tcp
    sudo firewall-cmd --permanent --add-port=23/tcp
    sudo firewall-cmd --reload
    echo "✓ Ports 22 and 23 opened"
else
    echo "Using iptables..."
    sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT
    sudo iptables -A INPUT -p tcp --dport 23 -j ACCEPT
    sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null 2>&1
    echo "✓ Ports 22 and 23 opened"
fi

echo ""

# Enable and start SSH
echo "Step 3: Ensuring SSH is Running"
echo "-------------------------------"
sudo systemctl enable ssh
sudo systemctl start ssh
sudo systemctl status ssh --no-pager | head -3
echo ""

# Install and enable telnet
echo "Step 4: Installing and Enabling Telnet"
echo "--------------------------------------"
sudo apt-get update -y
sudo apt-get install -y telnetd inetutils-inetd
sudo systemctl enable inetd
sudo systemctl start inetd
sudo systemctl status inetd --no-pager | head -3
echo ""

# Verify ports
echo "Step 5: Verifying Services"
echo "-------------------------"
echo "Checking SSH (port 22):"
if sudo netstat -tuln | grep -q ":22 "; then
    echo "  ✓ SSH is listening on port 22"
else
    echo "  ✗ SSH may not be running"
fi

echo "Checking Telnet (port 23):"
if sudo netstat -tuln | grep -q ":23 "; then
    echo "  ✓ Telnet is listening on port 23"
else
    echo "  ✗ Telnet may not be running"
fi

echo ""
echo "=========================================="
echo "Setup Complete!"
echo "=========================================="
echo ""
echo "You can now:"
echo "  - Connect via SSH from Windows"
echo "  - Connect via Telnet from Windows"
echo ""
echo "Test from Windows:"
echo "  .\test-connections.ps1"
echo "  .\connect-ssh.ps1 1"
echo "  .\connect-telnet.ps1 1"

