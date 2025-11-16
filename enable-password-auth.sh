#!/bin/bash
# Script to enable password authentication on Raspberry Pi
# Run this script on the Raspberry Pi (requires physical access or existing SSH access)

echo "=========================================="
echo "Enabling SSH Password Authentication"
echo "=========================================="
echo ""

# Backup SSH config
echo "Backing up SSH configuration..."
sudo cp /etc/ssh/sshd_config /etc/ssh/sshd_config.backup

# Enable password authentication
echo "Enabling password authentication..."
sudo sed -i 's/#PasswordAuthentication yes/PasswordAuthentication yes/' /etc/ssh/sshd_config
sudo sed -i 's/PasswordAuthentication no/PasswordAuthentication yes/' /etc/ssh/sshd_config

# If PasswordAuthentication line doesn't exist, add it
if ! grep -q "^PasswordAuthentication" /etc/ssh/sshd_config; then
    echo "PasswordAuthentication yes" | sudo tee -a /etc/ssh/sshd_config
fi

# Also ensure PubkeyAuthentication is enabled (for key-based auth too)
sudo sed -i 's/#PubkeyAuthentication yes/PubkeyAuthentication yes/' /etc/ssh/sshd_config
if ! grep -q "^PubkeyAuthentication" /etc/ssh/sshd_config; then
    echo "PubkeyAuthentication yes" | sudo tee -a /etc/ssh/sshd_config
fi

# Restart SSH service
echo "Restarting SSH service..."
sudo systemctl restart ssh

# Check status
echo ""
echo "SSH service status:"
sudo systemctl status ssh --no-pager | head -5

echo ""
echo "=========================================="
echo "Password authentication enabled!"
echo "=========================================="
echo ""
echo "You can now connect using:"
echo "  ssh pi@<ip-address>"
echo ""
echo "Note: Both password and key-based authentication are now enabled."
