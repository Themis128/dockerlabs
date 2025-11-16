/**
 * Server plugin to verify Python backend connection on startup
 * Runs once when Nuxt server starts
 */

export default defineNitroPlugin(async (nitroApp) => {
  // Only run in development mode
  if (!process.dev) {
    return;
  }

  const config = useRuntimeConfig();
  const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';
  const healthUrl = `${pythonServerUrl}/api/health`;

  // Small delay to allow Nuxt to fully initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    console.log(`[Nuxt Startup] Checking Python backend connection at ${pythonServerUrl}...`);

    const response = await $fetch<{ status?: string; [key: string]: any }>(healthUrl, {
      method: 'GET',
      timeout: 5000, // 5 second timeout
      retry: 0,
    });

    if (
      response &&
      (response.status === 'healthy' || response.status === 'ok' || response.status === 'degraded')
    ) {
      console.log(`[Nuxt Startup] ✓ Python backend connection verified at ${pythonServerUrl}`);
    } else {
      console.warn(
        `[Nuxt Startup] ⚠ Python backend responded but status is: ${response?.status || 'unknown'}`
      );
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error) || 'Unknown error';
    const isConnectionError =
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('ENOTFOUND') ||
      errorMsg.includes('fetch failed') ||
      errorMsg.includes('Failed to fetch');

    if (isConnectionError) {
      console.warn(`[Nuxt Startup] ⚠ Cannot connect to Python backend at ${pythonServerUrl}`);
      console.warn(`[Nuxt Startup] ⚠ Error: ${errorMsg}`);
      console.warn(`[Nuxt Startup] ⚠ Please ensure the Python server is running on port 3000`);
      console.warn(
        `[Nuxt Startup] ⚠ Nuxt will continue, but API calls may fail until Python server is available`
      );
    } else {
      // Other errors (timeout, etc.) - log but don't treat as critical
      console.warn(`[Nuxt Startup] ⚠ Python backend health check failed: ${errorMsg}`);
    }
  }
});
