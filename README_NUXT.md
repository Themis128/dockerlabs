# Nuxt 4 Frontend - Quick Start Guide

This is the Nuxt 4 frontend for the Raspberry Pi Manager application. It works alongside the Python backend server.

## 🚀 Quick Start

### 1. Install Dependencies

```bash
npm install
```

This will install:
- Nuxt 4
- TypeScript
- All other project dependencies

### 2. Set Up Environment

Copy `.env.example` to `.env`:

```bash
# On Windows (PowerShell)
Copy-Item .env.example .env

# On Linux/Mac
cp .env.example .env
```

For local development, you can also create `.env.local` from `.env.local.example`:

```bash
# On Windows (PowerShell)
Copy-Item .env.local.example .env.local

# On Linux/Mac
cp .env.local.example .env.local
```

The `.env` file should contain:
```env
PYTHON_SERVER_URL=http://localhost:3000
API_BASE_URL=http://localhost:3000/api
```

See `.env.example` for all available environment variables.

### 3. Start the Application

**Option A: Run both servers together (Recommended)**

```bash
npm run dev:all
```

This starts:
- Python backend on `http://localhost:3000`
- Nuxt frontend on `http://localhost:3001`

**Option B: Run servers separately**

Terminal 1 (Python backend):
```bash
npm run start:python
```

Terminal 2 (Nuxt frontend):
```bash
npm run dev
# or
npm run start:nuxt
```

### 4. Access the Application

Open your browser to:
- **Nuxt Frontend:** http://localhost:3001
- **Python Backend API:** http://localhost:3000/api

## 📁 Project Structure

```
.
├── app.vue                 # Root component
├── nuxt.config.ts         # Nuxt configuration
├── tsconfig.json          # TypeScript configuration
├── layouts/               # Layout components
│   ├── default.vue        # Main layout with navigation
│   └── error.vue          # Error page layout
├── pages/                 # Page components (file-based routing)
│   └── index.vue          # Main page
├── components/            # Vue components (auto-imported)
│   ├── DashboardTab.vue
│   ├── PisTab.vue
│   ├── SdcardTab.vue
│   └── ...
├── composables/           # Reusable composables (auto-imported)
│   └── useApi.ts          # API integration
├── middleware/            # Route middleware
│   ├── api.ts             # API error handling
│   └── auth.ts            # Authentication (placeholder)
├── plugins/               # Nuxt plugins
│   ├── api.client.ts      # Client-side API initialization
│   └── error-handler.client.ts  # Global error handling
├── server/                # Server-side code
│   ├── api/               # API routes
│   │   ├── health.ts       # Health check endpoint
│   │   └── proxy.ts       # Proxy helper
│   └── utils/             # Server utilities
│       └── python-api.ts  # Python backend helpers
├── utils/                 # Shared utilities (auto-imported)
│   ├── format.ts          # Formatting utilities
│   ├── validation.ts      # Form validation
│   └── constants.ts       # Application constants
├── types/                 # TypeScript type definitions
│   ├── api.ts             # API types
│   ├── pi.ts              # Raspberry Pi types
│   ├── sdcard.ts          # SD card types
│   └── index.ts           # Central exports
├── assets/                # Assets (processed by Vite)
│   └── css/
│       └── main.css       # Global styles
└── public/                # Static assets (served as-is)
    ├── favicon.svg
    └── robots.txt
```

## 🛠️ Development

### Available Scripts

- `npm run dev` - Start Nuxt dev server
- `npm run build` - Build for production
- `npm run generate` - Generate static site
- `npm run preview` - Preview production build
- `npm run start:python` - Start Python backend
- `npm run start:nuxt` - Start Nuxt on port 3001
- `npm run dev:all` - Start both servers

### Making API Calls

Use the `useApi()` composable in your components:

```vue
<script setup lang="ts">
const { getPis, listSdcards } = useApi()

const pis = ref([])

const loadPis = async () => {
  const response = await getPis()
  if (response.success) {
    pis.value = response.data.pis
  }
}
</script>
```

## 🔄 Migration Status

### ✅ Completed
- Project setup and configuration
- Dashboard component
- Raspberry Pi list component
- SD Card management component
- Connection testing component
- API composable

### 🚧 In Progress
- OS Installation tab
- Settings/Configuration tab
- Remote Connection tab

See [NUXT_MIGRATION_GUIDE.md](./docs/NUXT_MIGRATION_GUIDE.md) for detailed migration information.

## 🐛 Troubleshooting

### Port Already in Use

If port 3001 is already in use, change it in `package.json`:
```json
"start:nuxt": "nuxt dev --port 3002"
```

### API Calls Failing

1. Ensure Python server is running on port 3000
2. Check `.env` file has correct `PYTHON_SERVER_URL`
3. Check browser console for CORS errors
4. Verify proxy configuration in `nuxt.config.ts`

### Styles Not Loading

1. Check `assets/css/main.css` exists
2. Verify CSS is imported in `nuxt.config.ts`
3. Check component scoped styles

## 📚 Documentation

- [Full Migration Guide](./docs/NUXT_MIGRATION_GUIDE.md)
- [Nuxt 4 Documentation](https://nuxt.com/docs)
- [Vue 3 Documentation](https://vuejs.org/)

## 🎯 Next Steps

1. Complete remaining component migrations
2. Add error handling and loading states
3. Implement form validation
4. Add unit tests
5. Update Playwright E2E tests
