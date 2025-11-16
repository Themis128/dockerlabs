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
        { name: 'description', content: 'Comprehensive web-based management system for Raspberry Pi devices. Configure, monitor, and manage multiple Raspberry Pi devices from a single interface.' },
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
  runtimeConfig: {
    public: {
      // Use relative path so requests go through Nuxt proxy/server routes (which handle CORS)
      // Only use absolute URL if explicitly set via environment variable
      apiBase: process.env.API_BASE_URL || '/api',
      pythonServerUrl: process.env.PYTHON_SERVER_URL || 'http://localhost:3000',
    },
  },

  // CSS configuration
  css: ['~/assets/css/main.css'],

  // TypeScript configuration
  typescript: {
    strict: true,
    typeCheck: false, // Disable type checking during dev to avoid vue-tsc dependency issues
  },

  // Auto-imports configuration
  imports: {
    dirs: [
      'composables',
      'utils',
      'types',
    ],
  },

  // Module configuration
  modules: ['@pinia/nuxt'],

  // Vite configuration
  vite: {
    server: {
      watch: {
        ignored: ['**/web-gui/**', '**/RaspberryPiManager/**', '**/playwright-report/**', '**/test-results/**', '**/__pycache__/**'],
      },
      // Note: Vite proxy removed - Nuxt server routes (server/api/*) handle API proxying
      // This ensures requests go through server routes which add CORS headers
    },
  },
})
