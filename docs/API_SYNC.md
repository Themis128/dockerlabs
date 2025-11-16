# Frontend-Backend API Synchronization

This document tracks the synchronization between the Nuxt frontend, Nuxt server
routes, and Python backend.

## API Endpoint Mapping

### GET Endpoints

| Frontend (useApi)       | Nuxt Server Route                | Python Backend          | Status    |
| ----------------------- | -------------------------------- | ----------------------- | --------- |
| `/api/pis`              | `server/api/pis.ts`              | `/api/pis`              | ✅ Synced |
| `/api/test-connections` | `server/api/test-connections.ts` | `/api/test-connections` | ✅ Synced |
| `/api/scan-network`     | `server/api/scan-network.ts`     | `/api/scan-network`     | ✅ Synced |
| `/api/test-ssh?pi=`     | `server/api/test-ssh.ts`         | `/api/test-ssh?pi=`     | ✅ Synced |
| `/api/get-pi-info?pi=`  | `server/api/get-pi-info.ts`      | `/api/get-pi-info?pi=`  | ✅ Synced |
| `/api/sdcards`          | `server/api/sdcards.ts`          | `/api/sdcards`          | ✅ Synced |
| `/api/os-images`        | `server/api/os-images.ts`        | `/api/os-images`        | ✅ Synced |
| `/api/health`           | `server/api/health.ts`           | `/api/health`           | ✅ Synced |
| `/api/metrics`          | `server/api/metrics.ts`          | `/api/metrics`          | ✅ Synced |

### POST Endpoints

| Frontend (useApi)     | Nuxt Server Route              | Python Backend        | Status    |
| --------------------- | ------------------------------ | --------------------- | --------- |
| `/api/scan-wifi`      | `server/api/scan-wifi.ts`      | `/api/scan-wifi`      | ✅ Synced |
| `/api/format-sdcard`  | `server/api/format-sdcard.ts`  | `/api/format-sdcard`  | ✅ Synced |
| `/api/configure-pi`   | `server/api/configure-pi.ts`   | `/api/configure-pi`   | ✅ Synced |
| `/api/execute-remote` | `server/api/execute-remote.ts` | `/api/execute-remote` | ✅ Synced |
| `/api/install-os`     | `server/api/install-os.ts`     | `/api/install-os`     | ✅ Synced |
| `/api/connect-ssh`    | `server/api/connect-ssh.ts`    | `/api/connect-ssh`    | ✅ Synced |
| `/api/connect-telnet` | `server/api/connect-telnet.ts` | `/api/connect-telnet` | ✅ Synced |

## Request Flow

```
Frontend Component
  ↓
useApi() composable
  ↓
Nuxt Server Route (server/api/*.ts)
  ↓ (adds CORS headers, error handling)
Python Backend (web-gui/server.py)
  ↓
Response flows back through same path
```

## Response Format

All endpoints should return JSON in this format:

```typescript
{
  success: boolean;
  data?: any;
  error?: string;
}
```

## CORS Handling

- All Nuxt server routes handle CORS preflight (OPTIONS) requests
- CORS headers are added to all responses
- Origin is checked and allowed if present

## Error Handling

- Frontend: `useApi` composable catches errors and returns
  `{success: false, error: string}`
- Nuxt Server Routes: Catch errors from Python backend and format them
  consistently
- Python Backend: Returns JSON with `success` and `error` fields

## Configuration

- **Frontend API Base**: `/api` (relative path, goes through Nuxt server routes)
- **Python Server URL**: `http://localhost:3000` (used by Nuxt server routes)
- **Ports**:
  - Frontend (Nuxt): `3001`
  - Backend (Python): `3000`

## Synchronization Checklist

- [x] All frontend API calls have corresponding Nuxt server routes
- [x] All Nuxt server routes have corresponding Python backend endpoints
- [x] Response formats are consistent across all layers
- [x] CORS headers are properly handled
- [x] Error handling is consistent
- [x] All endpoints are exposed in `useApi` composable

## Last Updated

2025-11-16 - All endpoints synchronized
