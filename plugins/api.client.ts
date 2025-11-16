/**
 * Client-side API initialization plugin
 * Runs on client-side only
 */

export default defineNuxtPlugin(() => {
  const config = useRuntimeConfig();

  // Initialize API configuration
  if (process.client) {
    console.log('[API Plugin] Initializing API client');
    console.log('[API Plugin] API Base URL:', config.public.apiBase);
    console.log('[API Plugin] Python Server URL:', config.public.pythonServerUrl);
  }
});
