# Nuxt 4 Migration Guide

This guide documents the migration from vanilla JavaScript/HTML to Nuxt 4 for the Raspberry Pi Manager frontend.

## Overview

The migration follows **Option 1: Nuxt as Frontend Only**, keeping the Python backend server (`server.py`) intact while modernizing the frontend with Nuxt 4.

## Architecture

```
┌─────────────────┐
│   Nuxt 4 App   │  (Frontend - Port 3001)
│   (Vue/TS)     │
└────────┬────────┘
         │ API Calls
         │ (Proxy)
         ▼
┌─────────────────┐
│  Python Server  │  (Backend - Port 3000)
│   (server.py)   │
└─────────────────┘
```

## Project Structure

```
dockerlabs/
├── nuxt.config.ts          # Nuxt configuration
├── app.vue                 # Root component
├── pages/
│   └── index.vue           # Main page with tabs
├── components/
│   ├── DashboardTab.vue    # Dashboard component
│   ├── PisTab.vue          # Raspberry Pi list
│   ├── SdcardTab.vue       # SD card management
│   ├── OsInstallTab.vue    # OS installation (to be migrated)
│   ├── SettingsTab.vue     # Settings (to be migrated)
│   ├── ConnectionsTab.vue  # Connection testing
│   └── RemoteTab.vue       # Remote connection (to be migrated)
├── composables/
│   └── useApi.ts           # API composable for backend calls
├── assets/
│   └── css/
│       └── main.css        # Global styles
└── web-gui/
    ├── server.py            # Python backend (unchanged)
    └── public/              # Old frontend (can be removed after migration)
```

## Setup Instructions

### 1. Install Dependencies

```bash
npm install nuxt@latest
```

Or add to `package.json`:

```json
{
  "dependencies": {
    "nuxt": "^4.0.0"
  }
}
```

### 2. Update package.json Scripts

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "generate": "nuxt generate",
    "preview": "nuxt preview",
    "start:nuxt": "nuxt dev --port 3001",
    "start:python": "python web-gui/server.py"
  }
}
```

### 3. Environment Variables

Create a `.env` file:

```env
# Python backend server URL
PYTHON_SERVER_URL=http://localhost:3000

# API base URL (used by Nuxt)
API_BASE_URL=http://localhost:3000/api
```

### 4. Running the Application

**Option A: Run both servers separately**

Terminal 1 (Python backend):
```bash
npm run start:python
# or
python web-gui/server.py
```

Terminal 2 (Nuxt frontend):
```bash
npm run dev
# or
npm run start:nuxt
```

**Option B: Use a process manager (recommended for production)**

Install `concurrently`:
```bash
npm install --save-dev concurrently
```

Add to `package.json`:
```json
{
  "scripts": {
    "dev:all": "concurrently \"npm run start:python\" \"npm run start:nuxt\""
  }
}
```

## Migration Status

### ✅ Completed

- [x] Nuxt 4 project setup
- [x] Basic routing structure
- [x] API composable (`useApi.ts`)
- [x] Dashboard component
- [x] Raspberry Pi list component
- [x] SD Card management component
- [x] Connection testing component
- [x] Global styles setup

### 🚧 In Progress / To Do

- [ ] OS Installation tab (complex form with many options)
- [ ] Settings/Configuration tab
- [ ] Remote Connection tab (terminal functionality)
- [ ] Progress streaming for SD card formatting (SSE)
- [ ] WiFi scanning integration
- [ ] Error handling and loading states
- [ ] Debug panel (from original app.js)
- [ ] Button system (from button-system.js)

## Migration Steps for Remaining Components

### 1. OS Installation Tab

**Current:** Complex HTML form with many collapsible sections in `index.html`

**Migration:**
- Create `components/OsInstallTab.vue`
- Convert form sections to Vue components:
  - `OsInstallForm.vue` - Main form
  - `OsImageSelector.vue` - OS image selection
  - `NetworkConfig.vue` - WiFi/Network configuration
  - `UserConfig.vue` - User settings
  - `SshConfig.vue` - SSH settings
- Use Vue's reactive state for form data
- Implement form validation with Vue's validation libraries

### 2. Settings Tab

**Current:** Settings form in `index.html`

**Migration:**
- Create `components/SettingsTab.vue`
- Convert to Vue form components
- Use `useApi().configurePi()` for submission

### 3. Remote Connection Tab

**Current:** Terminal-like interface in `index.html`

**Migration:**
- Create `components/RemoteTab.vue`
- Create `components/Terminal.vue` for terminal display
- Use `useApi().executeRemoteCommand()` for commands
- Implement command history and terminal features

### 4. Progress Streaming

**Current:** Server-Sent Events (SSE) for SD card formatting progress

**Migration:**
- Use Nuxt's `useFetch` or `$fetch` with streaming support
- Or use native `EventSource` API in composable
- Create `composables/useProgressStream.ts` for SSE handling

## API Integration

All API calls go through the `useApi()` composable, which:

1. Uses the configured API base URL
2. Handles errors consistently
3. Provides TypeScript types
4. Can be extended with logging/debugging

Example usage:

```vue
<script setup lang="ts">
const { getPis, listSdcards } = useApi()

const pis = ref([])
const loading = ref(false)

const loadPis = async () => {
  loading.value = true
  const response = await getPis()
  if (response.success) {
    pis.value = response.data.pis
  }
  loading.value = false
}
</script>
```

## Styling Strategy

1. **Global styles** → `assets/css/main.css`
2. **Component styles** → Scoped styles in each `.vue` file
3. **CSS Variables** → Defined in `:root` in `main.css`
4. **Utility classes** → Can be added to `main.css` or use a utility library

## Development Workflow

1. **Start Python server** on port 3000
2. **Start Nuxt dev server** on port 3001 (or use proxy)
3. **Access app** at `http://localhost:3001`
4. **API calls** are proxied to Python server via Vite proxy config

## Production Build

1. **Build Nuxt app:**
   ```bash
   npm run build
   ```

2. **Output location:** `.output/public/`

3. **Option A:** Serve static files from Python server
   - Copy `.output/public/*` to `web-gui/public/`
   - Python server serves them as before

4. **Option B:** Use separate servers
   - Nuxt on port 3001 (or 80/443)
   - Python API on port 3000
   - Configure reverse proxy (nginx) if needed

## Benefits of Migration

1. **Type Safety:** TypeScript support
2. **Component Reusability:** Vue components
3. **Better DX:** Hot module replacement, auto-imports
4. **Modern Tooling:** Vite, ESLint, Prettier integration
5. **Ecosystem:** Access to Vue/Nuxt ecosystem
6. **Performance:** Better code splitting, lazy loading
7. **SEO Ready:** Can enable SSR if needed later

## Troubleshooting

### API calls failing

- Check `PYTHON_SERVER_URL` in `.env`
- Verify Python server is running on port 3000
- Check browser console for CORS errors
- Verify proxy configuration in `nuxt.config.ts`

### Styles not loading

- Ensure `assets/css/main.css` is imported in `nuxt.config.ts`
- Check component scoped styles are properly scoped
- Verify CSS variables are defined

### Components not rendering

- Check component imports in `pages/index.vue`
- Verify component names match file names
- Check browser console for errors

## Next Steps

1. Complete migration of remaining tabs
2. Add error boundaries
3. Implement loading states
4. Add unit tests
5. Set up E2E tests with Playwright (update existing tests)
6. Optimize bundle size
7. Add PWA support (if needed)

## Resources

- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [Vue 3 Documentation](https://vuejs.org/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)
