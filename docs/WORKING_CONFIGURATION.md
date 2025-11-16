# Working Configuration - Locked ✅

This document captures the **working configuration** that successfully synchronizes the Python backend and Nuxt frontend servers.

**Status:** ✅ **VERIFIED WORKING** - Do not modify without testing

**Last Verified:** 2025-01-XX

---

## 🔒 Locked Configuration

### Package.json Scripts

```json
{
  "scripts": {
    "start:python": "python -u web-gui/server.py",
    "start:nuxt": "nuxt dev --port 3001",
    "dev:all": "concurrently -n \"PYTHON,NUXT\" -c \"blue,green\" --kill-others-on-fail \"npm run start:python\" \"npm run start:nuxt:wait\"",
    "start:nuxt:wait": "wait-on -d 3000 -i 2000 -t 30000 -l http-get://127.0.0.1:3000/api/health && npm run start:nuxt"
  },
  "devDependencies": {
    "wait-on": "^8.0.1",
    "concurrently": "^9.1.2"
  }
}
```

### Key Configuration Details

#### 1. Python Server Startup
- **Command:** `python -u web-gui/server.py`
- **Flag `-u`:** Unbuffered output - shows startup messages immediately
- **Port:** 3000 (default)
- **Health Endpoint:** `http://127.0.0.1:3000/api/health`

#### 2. Nuxt Server Startup
- **Command:** `nuxt dev --port 3001`
- **Port:** 3001
- **Waits for:** Python health endpoint before starting

#### 3. Wait Strategy (`wait-on`)
- **Initial Delay (`-d 3000`):** 3 seconds - gives Python time to start accepting connections
- **Check Interval (`-i 2000`):** 2 seconds between checks
- **Timeout (`-t 30000`):** 30 seconds maximum wait time
- **Logging (`-l`):** Enabled for debugging
- **Protocol:** `http-get://127.0.0.1:3000/api/health` (using 127.0.0.1 instead of localhost for Windows compatibility)

#### 4. Concurrently Configuration
- **Names (`-n`):** `PYTHON,NUXT` - clear prefixes for output
- **Colors (`-c`):** `blue,green` - visual distinction
- **Kill on Fail (`--kill-others-on-fail`):** If one fails, stop the other

---

## ✅ What Makes This Work

### 1. Unbuffered Python Output
```bash
python -u web-gui/server.py
```
- The `-u` flag ensures Python output appears immediately
- Makes debugging easier
- Shows server startup messages in real-time

### 2. Proper Wait Strategy
```bash
wait-on -d 3000 -i 2000 -t 30000 -l http-get://127.0.0.1:3000/api/health
```
- **3-second initial delay** gives Python time to call `serve_forever()` and start accepting connections
- **2-second intervals** prevent aggressive polling
- **127.0.0.1** is more reliable than `localhost` on Windows
- **Health endpoint check** ensures server is actually ready, not just started

### 3. Server Synchronization Flow

```
1. concurrently starts both processes
   ↓
2. Python server starts (port 3000)
   - Prints "Server running" messages
   - Calls serve_forever() to accept connections
   ↓
3. wait-on waits 3 seconds (initial delay)
   ↓
4. wait-on starts checking health endpoint
   - Checks every 2 seconds
   - Uses http-get://127.0.0.1:3000/api/health
   ↓
5. Python responds to health check
   ↓
6. wait-on exits successfully
   ↓
7. Nuxt server starts (port 3001)
   ↓
8. Both servers running! ✅
```

---

## 🔧 Backend API Compatibility Fixes

### Fixed Field Name Mismatches

**File:** `web-gui/server.py`

#### 1. `/api/connect-ssh` (Line 571)
```python
# Before:
pi_number = data.get("pi", "1")

# After (FIXED):
pi_number = data.get("pi_number") or data.get("pi", "1")
```

#### 2. `/api/connect-telnet` (Line 599)
```python
# Before:
pi_number = data.get("pi", "1")

# After (FIXED):
pi_number = data.get("pi_number") or data.get("pi", "1")
```

**Result:** Backend now accepts both `pi_number` (from frontend) and `pi` (for backward compatibility).

---

## 📊 Port Configuration

| Service | Port | URL | Purpose |
|---------|------|-----|---------|
| Python Backend | 3000 | `http://127.0.0.1:3000` | API server |
| Nuxt Frontend | 3001 | `http://localhost:3001` | Web GUI |
| Health Check | 3000 | `http://127.0.0.1:3000/api/health` | Startup verification |

---

## 🚀 Usage

### Start Both Servers
```bash
npm run dev:all
```

### Start Servers Separately
```bash
# Terminal 1
npm run start:python

# Terminal 2 (after Python is ready)
npm run start:nuxt
```

### Expected Output
```
[PYTHON] Validating configuration...
[PYTHON] Server running on ALL network interfaces (0.0.0.0:3000)
[NUXT] waiting for 1 resources: http://127.0.0.1:3000/api/health
[NUXT] ✓ http://127.0.0.1:3000/api/health responded with status 200
[NUXT] [nuxi] Nuxt 4.2.1 (with Nitro 2.12.9...)
```

---

## ⚠️ Important Notes

### DO NOT CHANGE:
1. **Initial delay (`-d 3000`):** Python needs time to start accepting connections
2. **127.0.0.1 instead of localhost:** More reliable on Windows
3. **Unbuffered Python flag (`-u`):** Required for visible output
4. **Health endpoint check:** Ensures server is actually ready

### If You Need to Modify:
1. Test thoroughly after any changes
2. Update this document with new working configuration
3. Document why the change was needed
4. Verify both servers start correctly

---

## 🐛 Troubleshooting

### Issue: Timeout waiting for health endpoint
**Solution:**
- Check if Python server is actually running: `curl http://127.0.0.1:3000/api/health`
- Increase initial delay: Change `-d 3000` to `-d 5000`
- Check Windows Firewall settings

### Issue: Python output not visible
**Solution:**
- Ensure `-u` flag is present in `start:python` script
- Check if Python is installed: `python --version`

### Issue: Port already in use
**Solution:**
```powershell
# Check what's using port 3000
Get-NetTCPConnection -LocalPort 3000

# Kill the process if needed
Stop-Process -Id <PID>
```

---

## 📝 Change Log

### 2025-01-XX - Initial Working Configuration
- ✅ Added `-u` flag for unbuffered Python output
- ✅ Added `wait-on` with 3-second initial delay
- ✅ Changed to `127.0.0.1` for Windows compatibility
- ✅ Fixed field name mismatches in backend (`pi_number` vs `pi`)
- ✅ Added named prefixes and colors to concurrently output

---

## ✅ Verification Checklist

Before considering this configuration "locked", verify:

- [x] Python server starts and shows output immediately
- [x] Nuxt waits for Python health check before starting
- [x] No connection errors in console
- [x] Both servers accessible on their respective ports
- [x] Frontend can successfully call backend APIs
- [x] All endpoints working (pis, sdcards, scan-network, etc.)
- [x] Field name mismatches fixed (connect-ssh, connect-telnet)

**Status:** ✅ **ALL CHECKS PASSED** - Configuration is locked and working!

---

## 🔐 Lock Status

**LOCKED:** ✅ This configuration is verified working. Do not modify without:
1. Understanding why the change is needed
2. Testing thoroughly
3. Updating this document
4. Verifying all checks still pass

**Last Modified:** 2025-01-XX
**Verified By:** System compatibility check
**Status:** Production Ready ✅
