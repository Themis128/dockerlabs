#!/bin/bash
# Manual script to open ports 22 and 23 on Raspberry Pi
# Run this script directly on each Raspberry Pi

echo "=========================================="
echo "Opening Ports 22 (SSH) and 23 (Telnet)"
echo "=========================================="
echo ""

# Check which firewall is being used
if command -v ufw &> /dev/null; then
    echo "Using UFW firewall..."
    echo ""

    # Allow SSH (port 22)
    echo "Opening port 22 (SSH)..."
    sudo ufw allow 22/tcp comment 'SSH'

    # Allow Telnet (port 23)
    echo "Opening port 23 (Telnet)..."
    sudo ufw allow 23/tcp comment 'Telnet'

    # Enable UFW if not already enabled
    echo ""
    echo "Enabling UFW firewall..."
    sudo ufw --force enable

    # Show status
    echo ""
    echo "Firewall status:"
    sudo ufw status | grep -E '(22|23)'

elif command -v firewall-cmd &> /dev/null; then
    echo "Using firewalld..."
    echo ""

    # Add ports to firewall
    echo "Opening port 22 (SSH)..."
    sudo firewall-cmd --permanent --add-port=22/tcp

    echo "Opening port 23 (Telnet)..."
    sudo firewall-cmd --permanent --add-port=23/tcp

    # Reload firewall
    echo "Reloading firewall..."
    sudo firewall-cmd --reload

    # Show open ports
    echo ""
    echo "Open ports:"
    sudo firewall-cmd --list-ports | grep -E '(22|23)'

else
    echo "Using iptables..."
    echo ""

    # Add rules for SSH
    echo "Opening port 22 (SSH)..."
    sudo iptables -A INPUT -p tcp --dport 22 -j ACCEPT

    # Add rules for Telnet
    echo "Opening port 23 (Telnet)..."
    sudo iptables -A INPUT -p tcp --dport 23 -j ACCEPT

    # Save iptables rules
    echo "Saving iptables rules..."
    if [ -d /etc/iptables ]; then
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
    else
        sudo mkdir -p /etc/iptables
        sudo iptables-save | sudo tee /etc/iptables/rules.v4 > /dev/null
    fi

    echo "✓ Ports 22 and 23 opened via iptables"
fi

# Ensure SSH service is enabled and running
echo ""
echo "Ensuring SSH service is enabled..."
sudo systemctl enable ssh
sudo systemctl start ssh
sudo systemctl status ssh --no-pager | head -3

# Ensure Telnet service is enabled (if installed)
echo ""
if systemctl list-unit-files | grep -q inetd; then
    echo "Ensuring Telnet service is enabled..."
    sudo systemctl enable inetd
    sudo systemctl start inetd
    sudo systemctl status inetd --no-pager | head -3
else
    echo "Telnet service (inetd) not found. Install with:"
    echo "  sudo apt-get install -y telnetd inetutils-inetd"
fi

echo ""
echo "=========================================="
echo "Port Configuration Complete!"
echo "=========================================="
echo ""
echo "Ports 22 (SSH) and 23 (Telnet) should now be open."
echo "You can test connectivity from another machine."
