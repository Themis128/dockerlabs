#!/bin/bash
# Script to add SSH public key to Raspberry Pi
# Run this ON THE RASPBERRY PI after copying your public key
# Usage: bash add-key-to-pi.sh [public-key-file]

if [ -z "$1" ]; then
    echo "Usage: bash add-key-to-pi.sh [public-key-file]"
    echo "Or paste your public key when prompted"
    echo ""
    read -p "Paste your SSH public key here: " PUBLIC_KEY
else
    PUBLIC_KEY=$(cat "$1")
fi

if [ -z "$PUBLIC_KEY" ]; then
    echo "ERROR: No public key provided"
    exit 1
fi

echo "Adding SSH public key..."
mkdir -p ~/.ssh
chmod 700 ~/.ssh

# Check if key already exists
if grep -q "$PUBLIC_KEY" ~/.ssh/authorized_keys 2>/dev/null; then
    echo "Key already exists in authorized_keys"
else
    echo "$PUBLIC_KEY" >> ~/.ssh/authorized_keys
    echo "Key added successfully"
fi

chmod 600 ~/.ssh/authorized_keys

echo ""
echo "✓ SSH key configured!"
echo "You should now be able to connect without a password."
