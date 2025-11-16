/**
 * Server plugin to verify Python backend connection on startup
 * Runs once when Nuxt server starts (not on every HMR reload)
 */

// Use global variable that persists across module reloads
// Store on globalThis which survives HMR
const GLOBAL_KEY = '__nuxt_python_health_checked__';
const CHECK_COOLDOWN = 60000; // 60 seconds - only check once per minute max
const WARNING_SUPPRESS_DURATION = 300000; // 5 minutes - suppress warnings after first failure
const LOCK_TIMEOUT = 10000; // 10 seconds max for lock

// Initialize if not exists
if (typeof (globalThis as any)[GLOBAL_KEY] === 'undefined') {
  (globalThis as any)[GLOBAL_KEY] = {
    checked: false,
    lastCheck: 0,
    lastWarning: 0,
    inProgress: false,
    lockPromise: null,
    hasWarned: false,
  };
}

export default defineNitroPlugin(async (nitroApp) => {
  // Only run in development mode
  if (!process.dev) {
    return;
  }

  const checkState = (globalThis as any)[GLOBAL_KEY];
  const now = Date.now();

  // Check if we should suppress warnings (already warned recently)
  // If we've warned within the last 5 minutes, skip the entire check
  const shouldSuppressWarnings = checkState.hasWarned &&
    (now - checkState.lastWarning) < WARNING_SUPPRESS_DURATION;

  // Skip if we've checked recently (during HMR reloads or rapid rebuilds)
  // OR if we've already warned recently (suppress all checks for 5 minutes after first warning)
  if ((checkState.checked && now - checkState.lastCheck < CHECK_COOLDOWN) || shouldSuppressWarnings) {
    return;
  }

  // Prevent parallel execution with a simple lock mechanism
  if (checkState.inProgress) {
    // Wait for the in-progress check to complete (with timeout)
    try {
      await Promise.race([
        checkState.lockPromise || Promise.resolve(),
        new Promise((resolve) => setTimeout(resolve, LOCK_TIMEOUT)),
      ]);
    } catch {
      // Ignore lock wait errors
    }
    // After waiting, check if we still need to run
    const shouldSuppressAfterWait = checkState.hasWarned &&
      (Date.now() - checkState.lastWarning) < WARNING_SUPPRESS_DURATION;
    if ((checkState.checked && Date.now() - checkState.lastCheck < CHECK_COOLDOWN) || shouldSuppressAfterWait) {
      return;
    }
  }

  // Acquire lock
  checkState.inProgress = true;
  const lockResolve = () => {
    checkState.inProgress = false;
    checkState.lockPromise = null;
  };
  checkState.lockPromise = new Promise((resolve) => {
    // Will be resolved when check completes
    setTimeout(() => {
      lockResolve();
      resolve(undefined);
    }, LOCK_TIMEOUT);
  });

  // Check if health check is disabled via environment variable
  if (process.env.NUXT_SKIP_PYTHON_CHECK === 'true') {
    return;
  }

  const config = useRuntimeConfig();
  const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';
  const healthUrl = `${pythonServerUrl}/api/health`;

  // Track if this is the first check (before we update lastCheck)
  const isFirstCheck = !checkState.checked || (now - checkState.lastCheck) >= CHECK_COOLDOWN;

  // Mark as checking immediately to prevent duplicate runs
  checkState.checked = true;
  checkState.lastCheck = now;

  // Small delay to allow Nuxt to fully initialize
  await new Promise((resolve) => setTimeout(resolve, 1000));

  try {
    // Only log "checking" message on first check or if we've warned before (to show recovery)
    if (isFirstCheck || checkState.hasWarned) {
      console.log(`[Nuxt Startup] Checking Python backend connection at ${pythonServerUrl}...`);
    }

    const response = await $fetch<{ status?: string; [key: string]: any }>(healthUrl, {
      method: 'GET',
      timeout: 5000, // 5 second timeout
      retry: 0,
    });

    if (
      response &&
      (response.status === 'healthy' || response.status === 'ok' || response.status === 'degraded')
    ) {
      // Connection successful - reset warning state
      const wasWarned = checkState.hasWarned;
      if (checkState.hasWarned) {
        checkState.hasWarned = false;
        checkState.lastWarning = 0;
      }
      // Only log success message on first check or if we were previously warned
      if (isFirstCheck || wasWarned) {
        console.log(`[Nuxt Startup] ✓ Python backend connection verified at ${pythonServerUrl}`);
      }
    } else {
      if (isFirstCheck) {
        console.warn(
          `[Nuxt Startup] ⚠ Python backend responded but status is: ${response?.status || 'unknown'}`
        );
        checkState.hasWarned = true;
        checkState.lastWarning = now;
      }
    }
  } catch (error: any) {
    const errorMsg = error.message || String(error) || 'Unknown error';
    const statusCode = error.statusCode || error.status;
    const isRateLimitError = statusCode === 429;
    const isConnectionError =
      errorMsg.includes('ECONNREFUSED') ||
      errorMsg.includes('ENOTFOUND') ||
      errorMsg.includes('fetch failed') ||
      errorMsg.includes('Failed to fetch') ||
      errorMsg.includes('<no response>');

    // Only log on first check and skip rate limit errors
    if (isFirstCheck && !isRateLimitError) {
      if (isConnectionError) {
        console.warn(`[Nuxt Startup] ⚠ Cannot connect to Python backend at ${pythonServerUrl}`);
        console.warn(`[Nuxt Startup] ⚠ Error: ${errorMsg}`);
        console.warn(`[Nuxt Startup] ⚠ Please ensure the Python server is running on port 3000`);
        console.warn(
          `[Nuxt Startup] ⚠ Nuxt will continue, but API calls may fail until Python server is available`
        );
        // Mark that we've warned and suppress for 5 minutes
        checkState.hasWarned = true;
        checkState.lastWarning = now;
      } else {
        // Other errors (timeout, etc.) - log but don't treat as critical
        console.warn(`[Nuxt Startup] ⚠ Python backend health check failed: ${errorMsg}`);
        checkState.hasWarned = true;
        checkState.lastWarning = now;
      }
    }
  } finally {
    // Release lock
    lockResolve();
  }
});
