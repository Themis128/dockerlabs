# API Error Analysis

## Summary

This document explains the API errors seen in the development server logs and their resolution status.

## Fixed Issues

### ✅ 404 Error: `test_ssh_auth.py not found`

**Status:** FIXED

**Problem:** The Python backend server was looking for `test_ssh_auth.py` in the wrong location.

**Solution:** Updated the path in `web-gui/server.py` from:
```python
script_path = os.path.join(os.path.dirname(__file__), "..", "test_ssh_auth.py")
```

To:
```python
script_path = os.path.join(os.path.dirname(__file__), "..", "scripts", "python", "test_ssh_auth.py")
```

**Action Required:** Restart the Python backend server for this fix to take effect.

## Expected Validation Errors (400 Bad Request)

The following 400 errors are **expected behavior** - they indicate the backend is correctly validating requests and rejecting invalid ones:

### 1. `/api/install-os` - "OS image path, download URL, or custom image required"

**Status:** EXPECTED - Validation working correctly

**Cause:** The API requires one of:
- `download_url` (for downloading OS images)
- `custom_image` (for custom uploaded images)
- `image_path` (for pre-downloaded images)

**When it occurs:**
- User clicks "Install OS" without selecting an OS image source
- Frontend makes test calls during development
- Form validation hasn't prevented the API call

**Frontend behavior:** The frontend correctly sends these parameters when the user properly fills out the form (see `components/OsInstallTab.vue:932-939`).

### 2. `/api/configure-pi` - "Pi number required"

**Status:** EXPECTED - Validation working correctly

**Cause:** The API requires `pi_number` parameter.

**When it occurs:**
- User clicks "Configure Pi" without selecting a Pi
- Frontend makes test calls during development

**Frontend behavior:** The frontend correctly sends `pi_number` when the user selects a Pi (see `composables/useApi.ts:262-267`).

### 3. `/api/format-sdcard` - "Device ID required"

**Status:** EXPECTED - Validation working correctly

**Cause:** The API requires `device_id` parameter.

**When it occurs:**
- User clicks "Format SD Card" without selecting an SD card
- Frontend makes test calls during development

**Frontend behavior:** The frontend correctly sends `device_id` when the user selects an SD card (see `composables/useApi.ts:252-257`).

## Recommendations

### Option 1: Improve Frontend Validation (Recommended)

Add client-side validation to prevent API calls when required fields are missing. This will:
- Reduce error log noise
- Provide better user experience
- Prevent unnecessary backend requests

### Option 2: Adjust Error Logging

Modify the error logging to treat 400 validation errors as warnings rather than errors, since they're expected during normal operation.

### Option 3: No Action Required

These errors are harmless and indicate the system is working correctly. They will not occur in production when users properly fill out forms.

## Testing

To verify the fixes:

1. **Test SSH Auth:**
   ```bash
   # Restart Python backend, then test:
   curl http://localhost:3000/api/test-ssh?pi=1
   ```
   Should return a valid response (not 404).

2. **Test Form Validation:**
   - Try clicking "Install OS" without selecting an SD card or OS image
   - The 400 error is expected and indicates validation is working
   - Fill out the form properly and the request should succeed

## Conclusion

- ✅ **404 error:** Fixed - restart backend server
- ℹ️ **400 errors:** Expected validation responses - no action required
- ✅ **Frontend code:** Correctly sends required parameters
- ✅ **Backend validation:** Working as designed

