# Application Architecture Guide

## Overview

This document outlines the recommended architecture for the Raspberry Pi
Management application to ensure flawless operation. The application follows a
**hybrid architecture** combining Nuxt.js frontend, Python backend, and .NET
MAUI desktop components.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                    Client Layer (Browser)                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Nuxt.js SPA (Port 3001)                      │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Pages    │  │Components│  │Composables│           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐           │  │
│  │  │ Stores   │  │  Utils   │  │  Types   │           │  │
│  │  └──────────┘  └──────────┘  └──────────┘           │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Requests (/api/*)
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Nuxt Server API Layer (Port 3001)                │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  Server API Routes (server/api/*.ts)                 │  │
│  │  - Proxy endpoints to Python backend                 │  │
│  │  - CORS handling                                     │  │
│  │  - Error transformation                             │  │
│  │  - Request/Response validation                       │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTP Proxy
                            ▼
┌─────────────────────────────────────────────────────────────┐
│            Python Backend Server (Port 3000)                 │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  web-gui/server.py                                    │  │
│  │  - REST API endpoints                                 │  │
│  │  - SSH/Telnet connections                            │  │
│  │  - SD card operations                                │  │
│  │  - OS installation                                   │  │
│  │  - WiFi configuration                                │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ SSH/Telnet/System Commands
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              Raspberry Pi Devices (Network)                  │
└─────────────────────────────────────────────────────────────┘
```

## Layer-by-Layer Architecture

### 1. Frontend Layer (Nuxt.js SPA)

**Location**: Root directory (Nuxt project) **Port**: 3001 (development),
configured via `nuxt.config.ts` **Mode**: SPA (Single Page Application) -
`ssr: false`

#### Directory Structure

```
├── app.vue                 # Root component
├── pages/                   # Page components (minimal in SPA mode)
│   └── index.vue
├── layouts/                 # Layout components
│   ├── default.vue          # Main application layout
│   └── error.vue            # Error page layout
├── components/              # Reusable Vue components
│   ├── DashboardTab.vue
│   ├── PisTab.vue
│   ├── SdcardTab.vue
│   ├── OsInstallTab.vue
│   ├── SettingsTab.vue
│   ├── ConnectionsTab.vue
│   ├── RemoteTab.vue
│   ├── ErrorMessage.vue
│   ├── LoadingSpinner.vue
│   ├── NotificationToast.vue
│   └── ProgressBar.vue
├── composables/            # Vue composables (reusable logic)
│   ├── useApi.ts           # API communication
│   ├── useConnection.ts
│   ├── useNotifications.ts
│   ├── usePis.ts
│   ├── useProgress.ts
│   ├── useRemoteConnection.ts
│   └── useSdcards.ts
├── stores/                  # Pinia state management
│   ├── connections.ts
│   ├── pis.ts
│   ├── sdcards.ts
│   ├── settings.ts
│   └── ui.ts
├── types/                   # TypeScript type definitions
│   ├── api.ts
│   ├── index.ts
│   ├── nuxt.d.ts
│   ├── pi.ts
│   └── sdcard.ts
├── utils/                   # Utility functions
│   ├── constants.ts
│   ├── format.ts
│   └── validation.ts
├── plugins/                 # Nuxt plugins
│   ├── api.client.ts
│   ├── error-handler.client.ts
│   └── settings.client.ts
├── middleware/              # Route middleware
│   ├── api.ts
│   └── auth.ts
└── assets/                  # Static assets
    └── css/
        └── main.css
```

#### Key Principles

1. **Component Organization**
   - Each major feature has its own tab component
   - Shared UI components (Error, Loading, Toast) are reusable
   - Components should be self-contained with minimal dependencies

2. **State Management**
   - Use Pinia stores for global state
   - Keep component state local when possible
   - Stores handle data fetching and caching

3. **API Communication**
   - All API calls go through `useApi` composable
   - Never call Python backend directly from components
   - Use Nuxt server API routes as proxy layer

4. **Error Handling**
   - Centralized error handling via plugins
   - User-friendly error messages
   - Graceful degradation when backend is unavailable

### 2. Nuxt Server API Layer

**Location**: `server/api/` **Purpose**: Proxy layer between frontend and Python
backend

#### Structure

```
server/
├── api/
│   ├── [...].ts            # Catch-all for 404s
│   ├── health.ts           # Health check endpoint
│   ├── pis.ts              # Raspberry Pi management
│   ├── sdcards.ts          # SD card operations
│   ├── connect-ssh.ts      # SSH connections
│   ├── connect-telnet.ts   # Telnet connections
│   ├── execute-remote.ts   # Remote command execution
│   ├── get-pi-info.ts      # Pi information retrieval
│   ├── format-sdcard.ts    # SD card formatting
│   ├── install-os.ts       # OS installation
│   ├── configure-pi.ts     # Pi configuration
│   ├── scan-wifi.ts        # WiFi scanning
│   ├── test-connections.ts # Connection testing
│   ├── test-ssh.ts         # SSH testing
│   ├── os-images.ts        # OS image management
│   ├── metrics.ts          # Application metrics
│   └── proxy.ts            # Generic proxy
└── utils/
    └── python-api.ts       # Python API client utility
```

#### Responsibilities

1. **Request Proxying**
   - Forward requests to Python backend
   - Handle CORS preflight requests
   - Transform request/response formats

2. **Error Handling**
   - Catch Python backend errors
   - Transform to user-friendly messages
   - Handle timeouts and connection failures

3. **Validation**
   - Validate request parameters
   - Ensure proper data types
   - Sanitize inputs

4. **Response Transformation**
   - Normalize response formats
   - Add metadata if needed
   - Handle pagination

#### Example Pattern

```typescript
// server/api/example.ts
import { callPythonApi } from '../utils/python-api';

export default defineEventHandler(async (event) => {
  // Handle CORS
  if (getMethod(event) === 'OPTIONS') {
    // ... CORS headers
    return {};
  }

  try {
    const body = await readBody(event).catch(() => ({}));

    const response = await callPythonApi(event, {
      endpoint: '/api/example',
      method: 'POST',
      body,
    });

    // Set CORS headers
    setHeader(event, 'Content-Type', 'application/json');
    return response;
  } catch (error: any) {
    // Error handling
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Request failed',
      data: error.data || { success: false, error: 'Request failed' },
    });
  }
});
```

### 3. Python Backend Server

**Location**: `web-gui/server.py` **Port**: 3000 **Protocol**: HTTP/1.1

#### Responsibilities

1. **REST API Endpoints**
   - `/api/pis` - List Raspberry Pis
   - `/api/connect-ssh` - SSH connections
   - `/api/connect-telnet` - Telnet connections
   - `/api/execute-remote` - Remote command execution
   - `/api/get-pi-info` - Pi information
   - `/api/format-sdcard` - SD card formatting
   - `/api/install-os` - OS installation
   - `/api/configure-pi` - Pi configuration
   - `/api/scan-wifi` - WiFi scanning
   - `/api/sdcards` - SD card listing
   - `/api/test-connections` - Connection testing
   - `/api/test-ssh` - SSH authentication testing
   - `/api/os-images` - OS image management
   - `/api/metrics` - Application metrics
   - `/api/health` - Health check

2. **SSH/Telnet Operations**
   - Establish connections to Raspberry Pi devices
   - Execute remote commands
   - Handle authentication (password/key-based)
   - Manage connection timeouts

3. **System Operations**
   - SD card detection and formatting
   - OS image downloading and installation
   - WiFi network scanning and configuration
   - File system operations

4. **Error Handling**
   - Comprehensive error logging
   - Structured error responses
   - Request validation
   - Timeout management

#### Response Format

All endpoints should return JSON in this format:

```json
{
  "success": true|false,
  "data": { ... },
  "error": "Error message if success is false"
}
```

### 4. Configuration Files

#### nuxt.config.ts

**Key Settings**:

- `ssr: false` - SPA mode
- `runtimeConfig.public.apiBase` - API base URL
- `runtimeConfig.public.pythonServerUrl` - Python server URL
- Vite proxy configuration for `/api` routes

#### Environment Variables

```bash
# .env (optional, defaults in nuxt.config.ts)
API_BASE_URL=http://localhost:3000/api
PYTHON_SERVER_URL=http://localhost:3000
```

#### pi-config.json

Configuration for Raspberry Pi devices:

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

## Data Flow

### 1. User Action → API Call

```
User clicks button
  ↓
Component calls composable (e.g., useApi().getPis())
  ↓
Composable makes $fetch request to /api/pis
  ↓
Nuxt server API route (server/api/pis.ts) receives request
  ↓
Server route calls callPythonApi() utility
  ↓
Utility makes HTTP request to Python backend (http://localhost:3000/api/pis)
  ↓
Python server processes request
  ↓
Python server returns JSON response
  ↓
Nuxt server route receives response
  ↓
Server route returns response to frontend
  ↓
Composable receives response
  ↓
Composable updates Pinia store
  ↓
Component reactively updates UI
```

### 2. Error Flow

```
Error occurs in Python backend
  ↓
Python returns error response
  ↓
Nuxt server route catches error
  ↓
Server route transforms error to user-friendly format
  ↓
Server route throws createError()
  ↓
Composable catches error
  ↓
Composable returns error object with success: false
  ↓
Component displays error message via ErrorMessage component
  ↓
User sees notification toast
```

## Best Practices

### 1. API Communication

✅ **DO**:

- Always use `useApi` composable for API calls
- Handle errors gracefully
- Show loading states during requests
- Cache data in Pinia stores when appropriate

❌ **DON'T**:

- Call Python backend directly from components
- Ignore error responses
- Make duplicate API calls unnecessarily
- Store sensitive data in client-side state

### 2. Component Design

✅ **DO**:

- Keep components focused and single-purpose
- Use props for parent-to-child communication
- Use events for child-to-parent communication
- Extract reusable logic to composables

❌ **DON'T**:

- Create overly complex components
- Mix business logic with presentation
- Hardcode API endpoints
- Duplicate code across components

### 3. State Management

✅ **DO**:

- Use Pinia stores for global state
- Keep local state in components when possible
- Use computed properties for derived state
- Clear stores when appropriate

❌ **DON'T**:

- Store everything in global state
- Mutate state directly outside stores
- Create circular dependencies
- Store non-serializable data

### 4. Error Handling

✅ **DO**:

- Provide user-friendly error messages
- Log errors for debugging
- Handle network errors gracefully
- Show retry options when appropriate

❌ **DON'T**:

- Expose technical error details to users
- Swallow errors silently
- Show generic "Something went wrong" messages
- Ignore error states in UI

### 5. Performance

✅ **DO**:

- Lazy load components when possible
- Debounce search inputs
- Cache API responses appropriately
- Optimize images and assets

❌ **DON'T**:

- Load all data at once
- Make unnecessary API calls
- Block UI during long operations
- Ignore bundle size

## Development Workflow

### Starting the Application

1. **Start Python Backend**:

   ```bash
   npm run start:python
   # or
   python web-gui/server.py
   ```

   Server runs on `http://localhost:3000`

2. **Start Nuxt Frontend**:

   ```bash
   npm run dev
   # or
   npm run start:nuxt
   ```

   Frontend runs on `http://localhost:3001`

3. **Start Both** (recommended):
   ```bash
   npm run dev:all
   ```
   Uses `concurrently` to run both servers

### Development URLs

- **Frontend**: http://localhost:3001
- **Python Backend**: http://localhost:3000
- **API Proxy**: http://localhost:3001/api/\* (proxied to Python)

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm run test:gui
npm run test:api
npm run test:components
```

## Deployment Architecture

### Production Setup

1. **Python Backend**
   - Run as a service (systemd, Windows Service, etc.)
   - Use reverse proxy (nginx, Apache) for HTTPS
   - Configure firewall rules
   - Set up logging and monitoring

2. **Nuxt Frontend**
   - Build static files: `npm run build`
   - Serve from static file server or CDN
   - Configure API proxy in web server
   - Set up environment variables

3. **Reverse Proxy Configuration** (nginx example)

```nginx
server {
    listen 80;
    server_name your-domain.com;

    # Frontend
    location / {
        root /path/to/.output/public;
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api {
        proxy_pass http://localhost:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## Troubleshooting

### Common Issues

1. **Python backend not responding**
   - Check if Python server is running on port 3000
   - Verify firewall settings
   - Check Python server logs

2. **CORS errors**
   - Ensure Nuxt server API routes handle CORS
   - Check Python backend CORS configuration
   - Verify proxy settings in nuxt.config.ts

3. **API timeout errors**
   - Increase timeout in `callPythonApi` utility
   - Check network connectivity
   - Verify Python backend is not overloaded

4. **Build errors**
   - Clear `.nuxt` and `.output` directories
   - Reinstall dependencies: `rm -rf node_modules && npm install`
   - Check TypeScript errors

## Security Considerations

1. **API Security**
   - Never expose Python backend directly to internet
   - Use HTTPS in production
   - Implement rate limiting
   - Validate all inputs

2. **Authentication**
   - Implement authentication middleware
   - Use secure session management
   - Protect sensitive endpoints

3. **Data Protection**
   - Don't store passwords in plain text
   - Use environment variables for secrets
   - Encrypt sensitive data in transit

## Monitoring and Logging

1. **Frontend Logging**
   - Use browser console for development
   - Implement error tracking (Sentry, etc.)
   - Monitor API response times

2. **Backend Logging**
   - Python server logs to console
   - Implement structured logging
   - Monitor error rates and response times

3. **Health Checks**
   - Use `/api/health` endpoint
   - Monitor both frontend and backend
   - Set up alerts for failures

## Conclusion

This architecture provides:

- ✅ Clear separation of concerns
- ✅ Scalable and maintainable codebase
- ✅ Easy debugging and troubleshooting
- ✅ Flexible deployment options
- ✅ Good developer experience
- ✅ Production-ready structure

Follow these guidelines to ensure your application works flawlessly!
