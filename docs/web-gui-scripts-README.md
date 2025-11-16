# Web GUI Scripts

This directory contains utility scripts used by the web server for managing Raspberry Pi devices.

## Scripts Overview

### Core Scripts

- **`configure_pi.py`** - Configure Raspberry Pi settings (SSH, Telnet, Network, WiFi)
- **`execute_remote_command.py`** - Execute commands on remote Pi via SSH or Telnet
- **`format_sdcard.py`** - Format SD cards for Raspberry Pi (Windows, Linux, macOS)
- **`generate_wpa_supplicant.py`** - Generate WiFi configuration files with WPA3 support
- **`list_sdcards.py`** - List available SD cards/disks
- **`scan_wifi_networks.py`** - Scan for available WiFi networks

### OS Management

- **`install_os.py`** - Install OS images to SD cards (supports Windows, Linux, macOS)
- **`list_os_images.py`** - List available OS images (local or static list)

### Pi Management

- **`reboot_pi.py`** - Reboot Raspberry Pi devices
- **`shutdown_pi.py`** - Shutdown Raspberry Pi devices
- **`get_pi_status.py`** - Get detailed status information from Pi

### Backup & Restore

- **`backup_pi.py`** - Backup Pi configuration and/or remote files
- **`restore_pi.py`** - Restore Pi configuration and/or remote files from backup

### Configuration

- **`validate_config.py`** - Validate Pi configuration file structure

### Utility Modules

- **`utils.py`** - Common utility functions (config loading, SSH execution, validation)
- **`constants.py`** - Shared constants (ports, timeouts, connection types, etc.)
- **`config_loader.py`** - Configuration loading and validation utilities

## Usage

All scripts are designed to be called from the web server via subprocess, but can also be used standalone from the command line.

### Example: Reboot a Pi

```bash
python web-gui/scripts/reboot_pi.py 1
```

### Example: Get Pi Status

```bash
python web-gui/scripts/get_pi_status.py 1
```

### Example: Validate Configuration

```bash
python web-gui/scripts/validate_config.py --verbose
```

### Example: Backup Pi Configuration

```bash
python web-gui/scripts/backup_pi.py 1 --type config --backup-dir ./backups
```

## Script Output Format

All scripts output JSON for structured responses:

**Success:**
```json
{
  "success": true,
  "message": "Operation completed successfully",
  ...
}
```

**Error:**
```json
{
  "success": false,
  "error": "Error message",
  ...
}
```

**Progress (for long-running operations):**
```json
{
  "type": "progress",
  "message": "Processing...",
  "percent": 50
}
```

## Exit Codes

- `0` - Success
- `1` - General failure
- `2` - Invalid input
- `3` - Configuration error
- `124` - Timeout

## Dependencies

All scripts use Python standard library only - no external dependencies required.

## Configuration

Scripts read configuration from `pi-config.json` in the project root. The configuration file should have the following structure:

```json
{
  "raspberry_pis": {
    "1": {
      "name": "Pi 1",
      "ip": "192.168.0.48",
      "mac": "B8-27-EB-74-83-19",
      "connection": "Wired"
    }
  }
}
```

## Notes

- Scripts that require root/admin privileges (like `format_sdcard.py` and `install_os.py`) will check for elevated permissions
- SSH-based scripts support both password and key-based authentication
- All scripts include proper error handling and timeout management
- Scripts are cross-platform (Windows, Linux, macOS) where applicable
