# Troubleshooting Installation Errors

## Where to Find Installation Error Details

When an installation fails at 50% (after formatting), the error details can be found in several places:

### 1. **Server Console Output** (Primary Location)

The server logs all errors to **stderr** (standard error output). Check the terminal/console where you started the server.

**Look for lines starting with:**
```
[ERROR YYYY-MM-DD HH:MM:SS][request_id] Error message
```

**Example:**
```bash
# Start server with verbose logging
cd web-gui
python server.py

# Or with verbose mode enabled
VERBOSE=true python server.py
```

**Common error locations in server output:**
- `[ERROR] Error in install_os:` - General installation errors
- `[ERROR] Error installing OS:` - Script execution errors
- `[ERROR] Download process failed` - Image download errors
- `[ERROR] Installation process failed` - Installation script errors

### 2. **Browser Console** (F12 Developer Tools)

Open browser Developer Tools (F12) and check the **Console** tab for:
- JavaScript errors
- Failed fetch requests
- SSE connection errors
- Parsing errors

**Look for:**
- `[Install] Failed to parse progress data:` - JSON parsing errors
- `Failed to fetch` - Network/connection errors
- `Response body is not readable` - Streaming errors

### 3. **Detailed Log Section in UI**

The "Detailed Log" section in the installation UI should show:
- Progress messages
- Error messages (if sent via SSE)
- Debug information (if `error_debug` type messages are sent)

**If the Detailed Log is empty or stops at "Step 2: Starting OS installation...":**
- The server likely failed before sending error details
- Check the server console instead

### 4. **Check Server Logs File** (if logging to file)

If you're running the server with output redirection:
```bash
python server.py > server.log 2>&1
```

Check `server.log` for error messages.

## Common Failure Scenarios

### Scenario 1: Stream Ends Abruptly
**Symptom:** Progress stops at 50%, no error message in UI

**Where to check:**
1. Server console - look for connection errors or exceptions
2. Browser console - check for network errors
3. Check if the installation script exists: `web-gui/scripts/install_os.py`

**Common causes:**
- Missing image file
- Download failed
- Script execution error
- Permission denied

### Scenario 2: Error Sent but Not Displayed
**Symptom:** Error message appears but details are missing

**Where to check:**
1. Browser console - check for JSON parsing errors
2. Detailed Log - scroll down to see full error details
3. Check if `error_debug` messages are being parsed correctly

### Scenario 3: Silent Failure
**Symptom:** Installation fails with no messages

**Where to check:**
1. Server console - **MOST IMPORTANT** - errors are always logged here
2. Check server is running: `http://localhost:3000/api/health`
3. Check script permissions: `chmod +x web-gui/scripts/install_os.py`

## Debugging Steps

### Step 1: Enable Verbose Logging
```bash
cd web-gui
VERBOSE=true python server.py
```

This will show:
- All debug messages
- Request/response details
- Subprocess execution details

### Step 2: Check Installation Script Directly
```bash
cd web-gui/scripts
python install_os.py test_image.img \\.\PhysicalDrive1
```

This will show the actual error from the script.

### Step 3: Check Download Script
```bash
cd web-gui/scripts
python download_os_image.py "https://downloads.raspberrypi.org/raspios_lite_armhf/images/raspios_lite_armhf-latest/"
```

This will show download errors.

### Step 4: Check Browser Network Tab
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Filter by "install-os"
4. Check the request/response
5. Look for error status codes (4xx, 5xx)

### Step 5: Check SSE Stream
1. Open Developer Tools (F12)
2. Go to **Network** tab
3. Find the `install-os` request
4. Click on it
5. Go to **Response** or **Preview** tab
6. Look for `data: {"success": false, "error": "..."}` messages

## Quick Diagnostic Command

Run this to check all components:
```bash
cd "D:\Nuxt Projects\dockerlabs"
python -c "import os; print('Server:', os.path.exists('web-gui/server.py')); print('Install script:', os.path.exists('web-gui/scripts/install_os.py')); print('Download script:', os.path.exists('web-gui/scripts/download_os_image.py'))"
```

## What to Look For in Server Console

When installation fails, the server console should show something like:

```
[ERROR 2025-01-27 21:05:57][abc123] Error in install_os: <error message>
[ERROR 2025-01-27 21:05:57][abc123] Exception: <ExceptionType>: <error details>
```

**Copy the full error message** - it contains the root cause.

## Common Error Messages

| Error Message | Location | Solution |
|--------------|----------|----------|
| "Image file not found" | Server console | Check download completed successfully |
| "Permission denied" | Server console | Run server as administrator (Windows) or with sudo (Linux) |
| "Root privileges required" | Server console | Run with elevated permissions |
| "Download failed" | Server console | Check internet connection, verify URL |
| "Installation ended without completion status" | UI | Check server console for actual error |
| "Response body is not readable" | Browser console | Server may have crashed, check server console |

## Getting Help

When reporting installation failures, include:
1. **Server console output** (full error messages)
2. **Browser console output** (any JavaScript errors)
3. **Detailed Log from UI** (if available)
4. **OS and Python version**
5. **What you were trying to install** (OS image name/URL)
