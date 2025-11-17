#!/usr/bin/env python3
"""
Constants for web-gui scripts
Shared constants used across multiple scripts
"""

# Default values
DEFAULT_SSH_PORT = 22
DEFAULT_TELNET_PORT = 23
DEFAULT_SSH_USERNAME = "pi"
DEFAULT_TIMEOUT = 30
DEFAULT_CONFIG_TIMEOUT = 120

# Connection types
CONNECTION_ETHERNET = "ethernet"
CONNECTION_WIFI = "wifi"
CONNECTION_AUTO = "auto"

# Protocol types
PROTOCOL_SSH = "ssh"
PROTOCOL_TELNET = "telnet"
PROTOCOL_AUTO = "auto"

# Pi models
PI_MODEL_3B = "pi3b"
PI_MODEL_5 = "pi5"
PI_MODEL_4 = "pi4"
PI_MODEL_ZERO = "pizero"

# SD card partition sizes (in MB)
BOOT_PARTITION_SIZE_MB = 512
MIN_ROOT_PARTITION_SIZE_MB = 1024

# File system types
FS_FAT32 = "FAT32"
FS_EXT4 = "ext4"
FS_NTFS = "NTFS"

# WiFi security types
WIFI_SECURITY_WPA3_PERSONAL = "WPA3_Personal"
WIFI_SECURITY_WPA2_PERSONAL = "WPA2_Personal"
WIFI_SECURITY_WPA3_ENTERPRISE = "WPA3_Enterprise"
WIFI_SECURITY_WPA2_ENTERPRISE = "WPA2_Enterprise"
WIFI_SECURITY_OWE = "OWE"
WIFI_SECURITY_OPEN = "Open"

# Default WiFi country code
DEFAULT_WIFI_COUNTRY = "US"

# Exit codes
EXIT_SUCCESS = 0
EXIT_FAILURE = 1
EXIT_TIMEOUT = 124
EXIT_INVALID_INPUT = 2
EXIT_CONFIG_ERROR = 3

# Error messages
ERROR_PI_NOT_FOUND = "Pi not found in configuration"
ERROR_INVALID_IP = "Invalid IP address"
ERROR_INVALID_MAC = "Invalid MAC address"
ERROR_CONNECTION_FAILED = "Connection to Pi failed"
ERROR_TIMEOUT = "Operation timed out"
ERROR_PERMISSION_DENIED = "Permission denied"
ERROR_CONFIG_NOT_FOUND = "Configuration file not found"













