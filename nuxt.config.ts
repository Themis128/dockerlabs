// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2024-11-01',
  devtools: { enabled: true },

  // Use SPA mode to work alongside Python server
  ssr: false,

  // App configuration
  app: {
    head: {
      title: 'Raspberry Pi Manager - Device Management System',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1.0, viewport-fit=cover' },
        {
          name: 'description',
          content:
            'Comprehensive web-based management system for Raspberry Pi devices. Configure, monitor, and manage multiple Raspberry Pi devices from a single interface.',
        },
        { name: 'theme-color', content: '#0078D4' },
        { name: 'color-scheme', content: 'light dark' },
      ],
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'manifest', href: '/manifest.json' },
        { rel: 'preconnect', href: 'https://downloads.raspberrypi.org', crossorigin: '' },
      ],
    },
  },

  // Runtime config for API base URL
  // These values are exposed to the client and should be safe to expose
  runtimeConfig: {
    public: {
      // API base URL - use relative path so requests go through Nuxt proxy/server routes (which handle CORS)
      // Only use absolute URL if explicitly set via environment variable
      // In production, ensure this uses HTTPS for secure data transmission
      apiBase: process.env.API_BASE_URL || '/api',
      // Python backend server URL - defaults to localhost for development
      // In production, this should be set via PYTHON_SERVER_URL environment variable
      // and should use HTTPS to secure data transmission
      pythonServerUrl: process.env.PYTHON_SERVER_URL || 'http://localhost:3000',
      // Ollama server URL - defaults to localhost for development
      // In production, this should be set via OLLAMA_URL environment variable
      ollamaUrl: process.env.OLLAMA_URL || 'http://localhost:11434',
    },
  },

  // CSS configuration
  // Main application stylesheet
  css: ['~/assets/css/main.css'],

  // TypeScript configuration
  typescript: {
    strict: true,
    // Enable type checking during development to catch type-related errors early
    // Note: This requires vue-tsc to be installed. If you encounter issues, you can temporarily disable it.
    typeCheck: true,
  },

  // Auto-imports configuration
  imports: {
    dirs: ['composables', 'utils', 'types'],
  },

  // Module configuration
  modules: ['@pinia/nuxt'],

  // Dev server configuration - bind to all interfaces for Playwright
  devServer: {
    host: '0.0.0.0',
    port: 3001,
  },

  // Vite configuration
  vite: {
    server: {
      watch: {
        ignored: [
          '**/web-gui/**',
          '**/RaspberryPiManager/**',
          '**/playwright-report/**',
          '**/test-results/**',
          '**/__pycache__/**',
          '**/.nuxt/**',
          '**/.nuxt/dist/**',
          '**/node_modules/**',
          '**/.git/**',
          '**/bin/**',
          '**/obj/**',
        ],
        // Use polling on Windows to avoid EPERM errors
        usePolling: process.platform === 'win32',
        interval: 2000, // Increase interval to reduce file system pressure
      },
      // Note: Vite proxy removed - Nuxt server routes (server/api/*) handle API proxying
      // This ensures requests go through server routes which add CORS headers
    },
  },

  // Nitro configuration for file watching
  nitro: {
    // Ignore more directories to prevent EPERM errors on Windows
    ignore: [
      '**/.nuxt/**',
      '**/.nuxt/dist/**',
      '**/node_modules/**',
      '**/web-gui/**',
      '**/RaspberryPiManager/**',
      '**/playwright-report/**',
      '**/test-results/**',
      '**/__pycache__/**',
      '**/bin/**',
      '**/obj/**',
    ],
  },
});
