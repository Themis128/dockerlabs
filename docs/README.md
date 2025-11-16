# Web GUI - Raspberry Pi Management Interface

A Python-based web server providing a browser interface for managing Raspberry Pi devices.

## Structure

```
web-gui/
├── server.py           # Main HTTP server (Python 3.7+)
├── public/             # Static web files
│   ├── index.html     # Main web interface
│   ├── app.js         # Frontend JavaScript
│   └── styles.css     # Stylesheet
└── scripts/           # Python utility scripts
    ├── __init__.py
    ├── configure_pi.py
    ├── execute_remote_command.py
    ├── format_sdcard.py
    ├── generate_wpa_supplicant.py
    ├── list_sdcards.py
    └── scan_wifi_networks.py
```

## Requirements

- Python 3.7 or later
- No external dependencies (uses Python standard library only)

## Running the Server

### From project root:
```bash
python web-gui/server.py
```

### Using npm script:
```bash
npm run start:server
```

### Using PowerShell:
```powershell
.\start-web-gui.ps1
```

The server will start on port 3000 by default (configurable via `PORT` environment variable).

## Configuration

The server requires a `pi-config.json` file in the project root with Raspberry Pi device information:

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

## API Endpoints

### GET Endpoints
- `/api/pis` - List all Raspberry Pi devices
- `/api/test-connections` - Test connectivity to all Pis
- `/api/test-ssh-auth?pi=N` - Test SSH authentication for Pi N
- `/api/get-pi-info?pi=N` - Get information for Pi N
- `/api/list-sdcards` - List detected SD cards
- `/api/scan-wifi` - Scan for available WiFi networks

### POST Endpoints
- `/api/connect-ssh` - Connect via SSH (returns connection info)
- `/api/connect-telnet` - Connect via Telnet (returns connection info)
- `/api/execute-remote` - Execute command on remote Pi
- `/api/format-sdcard` - Format an SD card
- `/api/install-os` - Install OS image to SD card
- `/api/configure-pi` - Configure Pi settings

## Scripts

All scripts in the `scripts/` directory are called by the server via subprocess. They:
- Accept command-line arguments
- Output JSON for structured responses
- Use exit codes to indicate success/failure
- Read configuration from `pi-config.json` in project root

## Development

The server uses Python's built-in `http.server` module with custom request handling. It serves static files from `public/` and handles API requests via the `PiManagementHandler` class.

### Test Files

- `test_progress_frontend.html` - Standalone test page for format progress component (development/testing only)

## Security Notes

- CORS is enabled for localhost by default
- For production, restrict `ALLOWED_ORIGINS` in `server.py`
- Scripts execute with the same permissions as the server process
- No authentication is implemented - add authentication for production use
