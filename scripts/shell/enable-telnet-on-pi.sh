#!/bin/bash
# Script to enable Telnet on Raspberry Pi
# Run this script on each Raspberry Pi via SSH

echo "=========================================="
echo "Enabling Telnet on Raspberry Pi"
echo "=========================================="
echo ""

# Update package list
echo "Updating package list..."
sudo apt-get update -y

# Install telnet daemon
echo "Installing telnet daemon..."
sudo apt-get install -y telnetd

# Install inetutils-inetd if not already installed
echo "Installing inetutils-inetd..."
sudo apt-get install -y inetutils-inetd

# Enable and start inetd service
echo "Enabling inetd service..."
sudo systemctl enable inetd
sudo systemctl start inetd

# Check if telnet is listening on port 23
echo ""
echo "Checking telnet service status..."
sudo systemctl status inetd --no-pager

echo ""
echo "Testing telnet port..."
if sudo netstat -tuln | grep -q ":23 "; then
    echo "✓ Telnet is running on port 23"
else
    echo "⚠ Telnet may not be running. Checking alternative methods..."

    # Alternative: Use xinetd
    if ! command -v xinetd &> /dev/null; then
        echo "Installing xinetd as alternative..."
        sudo apt-get install -y xinetd

        # Create xinetd configuration for telnet
        sudo tee /etc/xinetd.d/telnet > /dev/null <<EOF
service telnet
{
    disable = no
    flags = REUSE
    socket_type = stream
    wait = no
    user = root
    server = /usr/sbin/in.telnetd
    log_on_failure += USERID
}
EOF

        sudo systemctl enable xinetd
        sudo systemctl restart xinetd
        echo "✓ xinetd configured and started"
    fi
fi

echo ""
echo "=========================================="
echo "Telnet setup complete!"
echo "=========================================="
echo ""
echo "You can now connect via telnet from another machine:"
echo "  telnet <pi-ip-address> 23"
echo ""
echo "Note: Telnet is insecure. Use SSH for production."
