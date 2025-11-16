# Frontend to Backend Compatibility Report

This document compares what the Nuxt frontend **sends** vs what the Python backend **expects**.

## 📊 Summary

| Endpoint | Frontend Sends | Backend Expects | Status | Issue |
|----------|----------------|-----------------|--------|-------|
| `/api/configure-pi` | `{pi_number: string, settings: {...}}` | `{pi_number: int(1\|2), settings: dict}` | ⚠️ Type Mismatch | Backend converts string to int |
| `/api/connect-ssh` | `{pi_number: string, ...}` | `{pi: string}` | ❌ **FIELD MISMATCH** | Different field name |
| `/api/connect-telnet` | `{pi_number: string, ...}` | `{pi: string}` | ❌ **FIELD MISMATCH** | Different field name |
| `/api/execute-remote` | `{pi_number, command, ...}` | `{pi_number, command, ...}` | ✅ Compatible | Matches |
| `/api/format-sdcard` | `{device_id, pi_model}` | `{device_id, pi_model}` | ✅ Compatible | Matches |
| `/api/install-os` | `{device_id, ...}` | `{device_id, ...}` | ✅ Compatible | Matches |
| `/api/test-ssh?pi=` | Query param `pi` | Query param `pi` | ✅ Compatible | Matches |
| `/api/get-pi-info?pi=` | Query param `pi` | Query param `pi` | ✅ Compatible | Matches |

## 🔍 Detailed Analysis

### 1. `/api/configure-pi` (POST)

**Frontend Sends (`composables/useApi.ts:226-231`):**
```typescript
{
    pi_number: string,  // e.g., "1" or "2"
    settings: {
        ssh: {...},
        telnet: {...},
        network: {...}
    }
}
```

**Backend Expects (`web-gui/server.py:1682-1708`):**
```python
{
    "pi_number": int,  # Must be 1 or 2
    "settings": dict   # Must be a dictionary
}
```

**Backend Processing:**
```python
pi_number = data.get("pi_number")
# ...
pi_number = int(pi_number)  # Converts string to int
if pi_number not in [1, 2]:
    # Returns error
```

**Status:** ✅ **WORKING** - Backend converts string to int, validates it's 1 or 2

**Note:** Frontend sends string, backend expects int but handles conversion gracefully.

---

### 2. `/api/connect-ssh` (POST) ⚠️ **ISSUE FOUND**

**Frontend Sends (`composables/useApi.ts:271-278`):**
```typescript
{
    pi_number: string,
    username?: string,
    password?: string,
    key_path?: string
}
```

**Backend Expects (`web-gui/server.py:570`):**
```python
{
    "pi": string,  # Note: expects "pi", not "pi_number"
    # Other fields ignored
}
```

**Backend Processing:**
```python
data = json.loads(post_data.decode())
pi_number = data.get("pi", "1")  # Looks for "pi" field, defaults to "1"
```

**Status:** ❌ **FIELD MISMATCH**
- Frontend sends: `pi_number`
- Backend expects: `pi`
- **Impact:** Backend will always use default value "1" instead of the actual pi number

**Fix Needed:** Either:
1. Change frontend to send `pi` instead of `pi_number`
2. Change backend to accept `pi_number` (preferred for consistency)

---

### 3. `/api/connect-telnet` (POST) ⚠️ **ISSUE FOUND**

**Frontend Sends (`composables/useApi.ts:283-289`):**
```typescript
{
    pi_number: string,
    username?: string,
    password?: string
}
```

**Backend Expects (`web-gui/server.py:597`):**
```python
{
    "pi": string,  # Note: expects "pi", not "pi_number"
    # Other fields ignored
}
```

**Backend Processing:**
```python
data = json.loads(post_data.decode())
pi_number = data.get("pi", "1")  # Looks for "pi" field, defaults to "1"
```

**Status:** ❌ **FIELD MISMATCH**
- Frontend sends: `pi_number`
- Backend expects: `pi`
- **Impact:** Backend will always use default value "1" instead of the actual pi number

**Fix Needed:** Same as connect-ssh - either change frontend or backend for consistency.

---

### 4. `/api/execute-remote` (POST)

**Frontend Sends (`composables/useApi.ts:236-246`):**
```typescript
{
    pi_number: string,
    command: string,
    connection_type?: string,  // "ssh" | "telnet"
    network_type?: string,     // "wifi" | "ethernet" | "auto"
    username?: string,
    password?: string,
    key_path?: string
}
```

**Backend Expects (`web-gui/server.py:676-682`):**
```python
{
    "pi_number": string,  # Gets converted to string anyway
    "command": string,     # Required
    "connection_type": string,  # Default: "ssh"
    "network_type": string,     # Default: "auto"
    "username": string,         # Default: "pi"
    "password": string | None,   # Optional
    "key_path": string | None   # Optional
}
```

**Status:** ✅ **COMPATIBLE** - All fields match

---

### 5. `/api/format-sdcard` (POST)

**Frontend Sends (`composables/useApi.ts:216-221`):**
```typescript
{
    device_id: string,
    pi_model?: string  // Default: "pi5"
}
```

**Backend Expects (`web-gui/server.py:1314-1315`):**
```python
{
    "device_id": string,  # Required
    "pi_model": string    # Default: "pi5"
}
```

**Status:** ✅ **COMPATIBLE** - All fields match

---

### 6. `/api/install-os` (POST)

**Frontend Sends (`composables/useApi.ts:251-259`):**
```typescript
{
    device_id: string,
    os_version?: string,
    download_url?: string,
    custom_image?: string,
    configuration: any
}
```

**Backend Expects (`web-gui/server.py:1650`):**
```python
{
    "device_id": string,  # Required
    # Other fields are optional and not currently used
    # (Backend returns placeholder message)
}
```

**Status:** ✅ **COMPATIBLE** - Backend only requires `device_id`, ignores other fields (placeholder implementation)

---

### 7. `/api/test-ssh?pi=` (GET with Query Parameter)

**Frontend Sends (`composables/useApi.ts:188-190`):**
```typescript
GET /api/test-ssh?pi=1
```

**Backend Expects (`web-gui/server.py:518-519`):**
```python
# Parses query string
query = parse_qs(urlparse(self.path).query)
pi_number = query.get("pi", ["1"])[0]  # Gets "pi" query param
```

**Status:** ✅ **COMPATIBLE** - Query parameter name matches

---

### 8. `/api/get-pi-info?pi=` (GET with Query Parameter)

**Frontend Sends (`composables/useApi.ts:195-197`):**
```typescript
GET /api/get-pi-info?pi=1
```

**Backend Expects (`web-gui/server.py:619-620`):**
```python
# Parses query string
query_params = parse_qs(parsed_url.query)
pi_number = query_params.get("pi", ["1"])[0]  # Gets "pi" query param
```

**Status:** ✅ **COMPATIBLE** - Query parameter name matches

---

## ⚠️ Issues Found

### Issue 1: `/api/connect-ssh` Field Name Mismatch

**Problem:**
- Frontend sends: `pi_number`
- Backend expects: `pi`
- Result: Backend always uses default value "1"

**Location:**
- Frontend: `composables/useApi.ts:271-278`
- Backend: `web-gui/server.py:570`

**Fix Options:**
1. **Option A (Recommended):** Update backend to accept `pi_number` for consistency:
   ```python
   pi_number = data.get("pi_number") or data.get("pi", "1")
   ```

2. **Option B:** Update frontend to send `pi`:
   ```typescript
   return await post('/connect-ssh', {
       pi: piNumber,  // Changed from pi_number
       username,
       password,
       key_path,
   });
   ```

---

### Issue 2: `/api/connect-telnet` Field Name Mismatch

**Problem:**
- Frontend sends: `pi_number`
- Backend expects: `pi`
- Result: Backend always uses default value "1"

**Location:**
- Frontend: `composables/useApi.ts:283-289`
- Backend: `web-gui/server.py:597`

**Fix Options:**
Same as Issue 1 - update either frontend or backend for consistency.

---

## ✅ Compatible Endpoints

All other endpoints are working correctly:
- ✅ `/api/configure-pi` - Backend handles string-to-int conversion
- ✅ `/api/execute-remote` - All fields match
- ✅ `/api/format-sdcard` - All fields match
- ✅ `/api/install-os` - Backend only requires device_id
- ✅ `/api/test-ssh?pi=` - Query parameter matches
- ✅ `/api/get-pi-info?pi=` - Query parameter matches

---

## 📝 Request Format Standards

### POST Request Body Format
```json
{
    "field_name": "value",
    "optional_field": "value"
}
```

### GET Request Query Parameters
```
/api/endpoint?param1=value1&param2=value2
```

### Headers
- `Content-Type: application/json` (for POST requests)
- CORS headers handled by Nuxt proxy

---

## 🔧 Recommendations

1. **Fix Field Name Mismatches:**
   - Update backend to accept both `pi` and `pi_number` for backward compatibility
   - Or standardize on `pi_number` across all endpoints

2. **Standardize Field Names:**
   - Use `pi_number` consistently (matches other endpoints like `configure-pi`, `execute-remote`)
   - Consider deprecating `pi` field name

3. **Add Validation:**
   - Frontend should validate `pi_number` is "1" or "2" before sending
   - Backend already validates, but frontend validation improves UX

4. **Documentation:**
   - Document expected request formats for each endpoint
   - Add TypeScript types that match backend expectations

---

## ✅ Conclusion

**Overall Status: MOSTLY COMPATIBLE** ⚠️

- **2 Issues Found:** Field name mismatches in `connect-ssh` and `connect-telnet`
- **6 Endpoints Working:** All other endpoints are compatible
- **Impact:** Low - The two affected endpoints will always use Pi 1 instead of the specified Pi number

**Priority:** Medium - Should be fixed for correct functionality, but doesn't break the application (just uses wrong Pi).
