# Fixes for Python Server Startup Issues

This document explains the two fixes applied to resolve Python server startup issues.

## 🔧 Fix 1: Python Output Not Visible (`-u` flag)

### Problem
When running Python server via `concurrently`, output was buffered and not visible in real-time, making it hard to debug startup issues.

### Solution
Added `-u` (unbuffered) flag to Python command.

**Before:**
```json
"start:python": "python web-gui/server.py"
```

**After:**
```json
"start:python": "python -u web-gui/server.py"
```

### What `-u` Does
- Forces Python to use **unbuffered** stdout and stderr
- Output appears immediately instead of being buffered
- Makes debugging much easier
- Shows server startup messages in real-time

### How to Verify
1. Run: `npm run start:python`
2. You should immediately see:
   ```
   Validating configuration...

   ============================================================
   Server running on ALL network interfaces (0.0.0.0:3000)
   ============================================================
   ```

### Location
- **File:** `package.json`
- **Line:** 23
- **Script:** `start:python`

---

## 🔧 Fix 2: Python Server Not Starting in Time (`wait-on`)

### Problem
When running both servers with `npm run dev:all`, Nuxt would start immediately and try to connect to Python backend before it was ready, causing connection errors:
```
ERROR [Python API] Error calling Python backend: fetch failed
```

### Solution
Added `wait-on` package to wait for Python server health endpoint before starting Nuxt.

**Before:**
```json
"dev:all": "concurrently \"npm run start:python\" \"npm run start:nuxt\""
```

**After:**
```json
"dev:all": "concurrently -n \"PYTHON,NUXT\" -c \"blue,green\" --kill-others-on-fail \"npm run start:python\" \"npm run start:nuxt:wait\"",
"start:nuxt:wait": "wait-on http://localhost:3000/api/health -t 30000 -l && npm run start:nuxt"
```

### What `wait-on` Does
- Waits for `http://localhost:3000/api/health` to respond
- Timeout: 30 seconds (`-t 30000`)
- Logging enabled (`-l`) to show wait progress
- Only starts Nuxt after Python is ready

### How It Works
1. `concurrently` starts both processes
2. Python server starts on port 3000
3. `wait-on` polls `/api/health` endpoint
4. Once Python responds, `wait-on` exits
5. Nuxt server starts on port 3001
6. No more connection errors! ✅

### How to Verify
1. Run: `npm run dev:all`
2. You should see:
   ```
   [PYTHON] Validating configuration...
   [PYTHON] Server running on ALL network interfaces (0.0.0.0:3000)
   [NUXT] wait-on http://localhost:3000/api/health
   [NUXT] ✓ http://localhost:3000/api/health responded with status 200
   [NUXT] [nuxi] Nuxt 4.2.1 (with Nitro 2.12.9...)
   ```
3. No connection errors should appear

### Location
- **File:** `package.json`
- **Lines:** 26-27
- **Scripts:** `dev:all`, `start:nuxt:wait`
- **Dependency:** `wait-on` (line 63)

---

## 📦 Installation

If you haven't installed the new dependency yet:

```bash
npm install
```

This will install `wait-on` package.

---

## 🧪 Testing the Fixes

### Test Fix 1 (Unbuffered Output)
```bash
npm run start:python
```
**Expected:** Immediate output showing server startup messages

### Test Fix 2 (Wait for Python)
```bash
npm run dev:all
```
**Expected:**
- Python starts first
- Nuxt waits for Python health check
- Both servers start successfully
- No connection errors

---

## 🔍 Troubleshooting

### Issue: `wait-on` command not found
**Solution:** Run `npm install` to install dependencies

### Issue: Python server takes longer than 30 seconds
**Solution:** Increase timeout in `package.json`:
```json
"start:nuxt:wait": "wait-on http://localhost:3000/api/health -t 60000 -l && npm run start:nuxt"
```
(Changes timeout from 30s to 60s)

### Issue: Still seeing connection errors
**Check:**
1. Is Python server actually starting? Look for `[PYTHON]` output
2. Can you access `http://localhost:3000/api/health` manually?
3. Check if port 3000 is already in use:
   ```powershell
   Get-NetTCPConnection -LocalPort 3000
   ```

---

## 📝 Additional Improvements

### Better Output Formatting
The `dev:all` command also includes:
- **Named prefixes:** `[PYTHON]` and `[NUXT]` for clarity
- **Colors:** Blue for Python, Green for Nuxt
- **Kill on fail:** If one process fails, the other stops too

```json
"dev:all": "concurrently -n \"PYTHON,NUXT\" -c \"blue,green\" --kill-others-on-fail ..."
```

---

## ✅ Summary

| Issue | Fix | Status |
|-------|-----|--------|
| Output not visible | Added `-u` flag to Python | ✅ Fixed |
| Server not ready | Added `wait-on` to wait for health check | ✅ Fixed |
| Hard to debug | Added named prefixes and colors | ✅ Fixed |

Both issues are now resolved! 🎉
