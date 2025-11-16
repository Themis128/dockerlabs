"""
Web GUI Scripts Package

This package contains utility scripts used by the web server for:
- Executing remote commands on Raspberry Pi devices
- Configuring Pi settings
- Formatting SD cards
- Generating WiFi configuration files
- Listing SD cards
- Scanning WiFi networks
- Installing OS images
- Managing Pi devices (reboot, shutdown, status)
- Backup and restore operations
- Configuration validation

Utility Modules:
- utils: Common utility functions
- constants: Shared constants
- config_loader: Configuration loading and validation
"""

__version__ = "2.0.0"

# Export commonly used functions
try:
    from .utils import load_config, get_pi_info, execute_ssh_command
    from .constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT
    from .config_loader import validate_pi_config, get_pi_by_number
except ImportError:
    # If relative imports fail, try absolute
    import sys
    import os
    sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
    from utils import load_config, get_pi_info, execute_ssh_command
    from constants import DEFAULT_SSH_USERNAME, DEFAULT_TIMEOUT
    from config_loader import validate_pi_config, get_pi_by_number

__all__ = [
    "load_config",
    "get_pi_info",
    "execute_ssh_command",
    "validate_pi_config",
    "get_pi_by_number",
    "DEFAULT_SSH_USERNAME",
    "DEFAULT_TIMEOUT",
]
