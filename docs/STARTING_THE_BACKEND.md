# Starting the Python Backend Server

The Nuxt frontend requires the Python backend server to be running on port 3000
to function properly. This guide shows you how to start it.

## Quick Start

### Option 1: Using npm (Recommended)

```bash
npm run start:server
```

This will start the Python server on `http://localhost:3000`

### Option 2: Using Python directly

```bash
python web-gui/server.py
```

### Option 3: Start Both Servers Together

To run both the Nuxt dev server and Python backend simultaneously:

```bash
npm run dev:all
```

This uses `concurrently` to run both:

- Python backend on port 3000
- Nuxt dev server on port 3001

### Option 4: Using PowerShell Script

```powershell
.\scripts\powershell\start-web-gui.ps1
```

Or with verbose logging:

```powershell
.\scripts\powershell\start-server-verbose.ps1
```

## Verifying the Server is Running

Once started, you should see output like:

```
Server running on ALL network interfaces (0.0.0.0:3000)
============================================================

Local access:
  http://localhost:3000/
  http://127.0.0.1:3000/

API endpoints:
  http://localhost:3000/api/health - Health check
  http://localhost:3000/api/metrics - Server metrics
```

You can test the server by visiting:

- **Health Check**: http://localhost:3000/api/health
- **Web Interface**: http://localhost:3000/

## Troubleshooting

### Port Already in Use

If you see an error that port 3000 is already in use:

1. **Check what's using the port:**

   ```powershell
   Get-NetTCPConnection -LocalPort 3000
   ```

2. **Stop the existing process** or use a different port:
   ```bash
   PORT=3001 python web-gui/server.py
   ```
   (Then update `nuxt.config.ts` to point to the new port)

### Python Not Found

Make sure Python is installed and in your PATH:

```bash
python --version
```

Should show Python 3.7 or higher.

### Server Won't Start

1. Check that you're in the project root directory
2. Verify `web-gui/server.py` exists
3. Check Python version: `python --version`
4. Try running with verbose mode: `VERBOSE=true python web-gui/server.py`

## Development Workflow

### Recommended Setup

**Terminal 1 - Python Backend:**

```bash
npm run start:server
```

**Terminal 2 - Nuxt Frontend:**

```bash
npm run dev
```

Or use the combined command:

```bash
npm run dev:all
```

## API Endpoints

Once the server is running, these endpoints are available:

- `GET /api/health` - Health check
- `GET /api/metrics` - Server metrics
- `GET /api/pis` - List Raspberry Pis
- `GET /api/sdcards` - List SD cards
- `GET /api/test-connections` - Test Pi connections
- `POST /api/configure-pi` - Configure Pi settings
- `POST /api/format-sdcard` - Format SD card
- `POST /api/install-os` - Install OS to SD card

## Network Access

The server binds to `0.0.0.0` by default, making it accessible from other
devices on your network. You'll see network IP addresses in the startup output.

To access from another device:

1. Find your computer's IP address from the server output
2. On the other device, navigate to `http://<your-ip>:3000`

## Stopping the Server

Press `Ctrl+C` in the terminal where the server is running.
