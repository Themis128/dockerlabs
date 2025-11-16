# Debugging Guide - Browser Console and Network Issues

## Steps to Debug

### 1. Clear Browser Cache and Hard Refresh

**Chrome/Edge:**
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cached images and files"
- Click "Clear data"
- Then press `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac) for hard refresh

**Firefox:**
- Press `Ctrl + Shift + Delete` (Windows) or `Cmd + Shift + Delete` (Mac)
- Select "Cache"
- Click "Clear Now"
- Then press `Ctrl + F5` (Windows) or `Cmd + Shift + R` (Mac) for hard refresh

**Alternative:**
- Open DevTools (F12)
- Right-click the refresh button
- Select "Empty Cache and Hard Reload"

### 2. Check Browser Console

1. Open DevTools (F12)
2. Go to the **Console** tab
3. Look for:
   - Red errors (syntax errors, JSON parse errors)
   - Yellow warnings (passive listener warnings)
   - Any messages about failed API calls

**Common Issues:**
- `SyntaxError: Unexpected token` - Usually means malformed JSON
- `Failed to fetch` - Network/CORS issue
- `Passive event listener` warning - Should be fixed in button-system.js

### 3. Check Network Tab for Malformed JSON

1. Open DevTools (F12)
2. Go to the **Network** tab
3. Filter by "XHR" or "Fetch"
4. Click on each API request
5. Check the **Response** tab:
   - Should show valid JSON
   - Look for syntax errors
   - Check if response is truncated
6. Check the **Headers** tab:
   - `Content-Type` should be `application/json; charset=utf-8`
   - Status code should be 200 (or appropriate error code)

**What to Look For:**
- Incomplete JSON (missing closing braces)
- HTML error pages instead of JSON
- Empty responses
- Non-JSON text in response body

### 4. Test API Endpoints Directly

You can test endpoints directly in the browser or with curl:

```bash
# Test Pi list endpoint
curl http://192.168.0.23:3000/api/pis

# Test SD cards endpoint
curl http://192.168.0.23:3000/api/sdcards

# Test health endpoint
curl http://192.168.0.23:3000/api/health
```

Or test in browser:
- Open: http://192.168.0.23:3000/api/pis
- Open: http://192.168.0.23:3000/api/health

All should return valid JSON.

**Or run the test script:**
```bash
python web-gui/test_json_responses.py
```

### 5. Check Server Logs

Check the server console output for:
- JSON parsing errors
- Subprocess errors
- Any error messages

## Common Fixes

### If JSON is malformed:
1. Check server logs for the exact error
2. Verify the Python script outputs valid JSON
3. Check for encoding issues (should be UTF-8)

### If passive listener warning persists:
- The warning should be gone after clearing cache
- If not, check that button-system.js is loading correctly

### If API calls fail:
1. Check server is running
2. Check CORS headers
3. Verify endpoint paths are correct
4. Check for network errors in Network tab
