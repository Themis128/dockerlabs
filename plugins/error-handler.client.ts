/**
 * Global error handler plugin
 * Handles unhandled errors and API errors globally
 */

export default defineNuxtPlugin(() => {
  if (process.client) {
    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      console.error('[Error Handler] Unhandled promise rejection:', event.reason)
      // You can add error reporting here (e.g., Sentry, LogRocket, etc.)
    })

    // Handle global errors
    window.addEventListener('error', (event) => {
      console.error('[Error Handler] Global error:', event.error)
      // You can add error reporting here
    })

    // Handle Vue errors
    const nuxtApp = useNuxtApp()
    nuxtApp.hook('app:error', (error) => {
      console.error('[Error Handler] Vue app error:', error)
    })
  }
})
