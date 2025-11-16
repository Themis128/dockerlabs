# Nuxt 4 Project Structure

This document describes the complete project structure for the Nuxt 4
application.

## Directory Structure

```
dockerlabs/
├── .env.example                 # Environment variables template
├── .env.local.example           # Local environment template
├── app.vue                      # Root Vue component
├── nuxt.config.ts              # Nuxt configuration
├── package.json                 # Dependencies and scripts
├── tsconfig.json                # TypeScript configuration
│
├── layouts/                     # Layout components
│   ├── default.vue             # Main layout with navigation
│   └── error.vue               # Error page layout
│
├── pages/                       # Page components (file-based routing)
│   └── index.vue               # Main page
│
├── components/                  # Vue components (auto-imported)
│   ├── DashboardTab.vue
│   ├── PisTab.vue
│   ├── SdcardTab.vue
│   ├── OsInstallTab.vue
│   ├── SettingsTab.vue
│   ├── ConnectionsTab.vue
│   └── RemoteTab.vue
│
├── composables/                 # Composable functions (auto-imported)
│   └── useApi.ts               # API composable for backend calls
│
├── middleware/                  # Route middleware
│   ├── api.ts                  # API error handling middleware
│   └── auth.ts                 # Authentication middleware (placeholder)
│
├── plugins/                     # Nuxt plugins
│   ├── api.client.ts            # Client-side API initialization
│   └── error-handler.client.ts # Global error handling
│
├── server/                      # Server-side code
│   ├── api/                    # API routes
│   │   ├── health.ts           # Health check endpoint
│   │   └── proxy.ts            # Proxy endpoint helper
│   └── utils/                  # Server utilities
│       └── python-api.ts       # Python backend API helpers
│
├── utils/                       # Shared utility functions (auto-imported)
│   ├── format.ts               # Formatting utilities
│   ├── validation.ts           # Form validation helpers
│   └── constants.ts            # Application constants
│
├── types/                       # TypeScript type definitions
│   ├── api.ts                  # API request/response types
│   ├── pi.ts                   # Raspberry Pi types
│   ├── sdcard.ts               # SD card types
│   └── index.ts                # Central type exports
│
├── assets/                      # Assets (processed by Vite)
│   └── css/
│       └── main.css            # Global styles
│
├── public/                      # Static assets (served as-is)
│   ├── favicon.svg
│   ├── robots.txt
│   └── .gitkeep
│
└── web-gui/                     # Python backend
    └── server.py               # Python server
```

## Key Directories

### `layouts/`

Layout components that wrap pages. The `default.vue` layout provides the main
structure with header, navigation, and footer.

### `pages/`

File-based routing. Each `.vue` file in this directory becomes a route. The
`index.vue` file is the home page.

### `components/`

Vue components that are automatically imported and can be used anywhere without
explicit imports.

### `composables/`

Reusable composition functions (like `useApi`) that are automatically imported.

### `middleware/`

Route middleware that runs before navigation. Can be used for authentication,
API error handling, etc.

### `plugins/`

Nuxt plugins that run when the app initializes. Client-side plugins run only in
the browser.

### `server/`

Server-side code that runs on the Node.js server:

- `server/api/` - API routes (e.g., `/api/health`)
- `server/utils/` - Server-side utilities

### `utils/`

Shared utility functions that are automatically imported. Use for formatting,
validation, constants, etc.

### `types/`

TypeScript type definitions. Centralized types for better type safety across the
application.

### `assets/`

Assets that are processed by Vite (CSS, images, etc.). These are optimized and
bundled.

### `public/`

Static files served as-is. Files here are accessible at the root URL (e.g.,
`/favicon.svg`).

## Auto-Imports

Nuxt automatically imports:

- Components from `components/`
- Composables from `composables/`
- Utilities from `utils/`
- Types from `types/` (when using TypeScript)

This means you can use them without explicit imports:

```vue
<script setup lang="ts">
// No import needed - auto-imported
const { getPis } = useApi();
const formatted = formatBytes(1024);
</script>
```

## Type Safety

All types are defined in the `types/` directory and exported from
`types/index.ts`. Import types like this:

```typescript
import type { RaspberryPi, ApiResponse } from '~/types';
```

## Server-Side Code

Server-side code in `server/` runs on the Node.js server:

- API routes are accessible at `/api/*`
- Server utilities can call external APIs, access databases, etc.
- Use `server/utils/python-api.ts` to call the Python backend from server-side
  code

## Environment Variables

- `.env.example` - Template for environment variables
- `.env.local.example` - Template for local development
- Copy these files to `.env` and `.env.local` (gitignored) for your
  configuration

## Configuration Files

- `nuxt.config.ts` - Nuxt configuration (routing, modules, etc.)
- `tsconfig.json` - TypeScript configuration
- `package.json` - Dependencies and npm scripts

## Best Practices

1. **Components**: Keep components focused and reusable
2. **Composables**: Extract reusable logic into composables
3. **Types**: Define types in `types/` for better type safety
4. **Utils**: Use `utils/` for pure functions (no Vue reactivity)
5. **Server**: Use `server/` for server-only code (API routes, database access,
   etc.)
6. **Layouts**: Use layouts for shared page structure
7. **Middleware**: Use middleware for cross-cutting concerns (auth, error
   handling)

## File Naming Conventions

- Components: PascalCase (e.g., `DashboardTab.vue`)
- Composables: camelCase with `use` prefix (e.g., `useApi.ts`)
- Utils: camelCase (e.g., `format.ts`)
- Types: camelCase (e.g., `api.ts`)
- Server API routes: camelCase (e.g., `health.ts`)

## Next Steps

- Add more components as needed
- Extend types as the application grows
- Add more server API routes if needed
- Implement authentication in `middleware/auth.ts`
- Add more utility functions as needed
