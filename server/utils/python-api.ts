/**
 * Server-side utilities for calling Python backend
 * Helper functions for server-side API calls to Python server
 */

import type { H3Event } from 'h3';
import { createError } from 'h3';

// Track server startup time to suppress errors during initial startup
const serverStartTime = Date.now();
const STARTUP_GRACE_PERIOD = 30000; // 30 seconds

/**
 * Timeout constants (in milliseconds)
 * These should be slightly longer than the Python server timeouts to allow for network overhead
 */
export const API_TIMEOUTS = {
  DEFAULT: 30000, // 30 seconds - for most operations
  SIMPLE_READ: 10000, // 10 seconds - for simple read operations like /api/pis, /api/sdcards, /api/os-images
  NETWORK_SCAN: 70000, // 70 seconds - Python server uses 60s, add 10s margin
  EXECUTE_REMOTE: 70000, // 70 seconds - Python server uses 60s, add 10s margin
  CONFIGURE_PI: 130000, // 130 seconds - Python server uses 120s (CONFIG_TIMEOUT), add 10s margin
  FORMAT_SDCARD: 190000, // 190 seconds - Python server uses 180s, add 10s margin
  HEALTH_CHECK: 5000, // 5 seconds - health checks should be fast
} as const;

export interface PythonApiOptions {
  endpoint: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
  timeout?: number; // Timeout in milliseconds (default: API_TIMEOUTS.DEFAULT)
}

/**
 * Call Python backend API from server-side
 */
export async function callPythonApi(event: H3Event, options: PythonApiOptions): Promise<any> {
  const config = useRuntimeConfig();
  const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';
  const url = `${pythonServerUrl}${options.endpoint}`;

  const timeout = options.timeout || API_TIMEOUTS.DEFAULT;
  const timeoutSeconds = Math.round(timeout / 1000);

  try {
    const response = await $fetch(url, {
      method: options.method || 'GET',
      body: options.body,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      timeout,
      retry: 0, // Don't retry on timeout
      // Don't throw on error status codes - we'll handle them manually
      // This allows us to preserve the error response from Python server
      ignoreResponseError: false,
    });

    return response;
  } catch (error: any) {
    const errorMessage = error.message || String(error) || 'Unknown error';
    const errorCode = error.code || error.name;
    const httpStatusCode = error.statusCode || error.status || error.response?.status;

    // Extract response data from error (when Python server returns error response)
    // $fetch puts response data in error.data or error.response._data
    const responseData = error.data || error.response?._data || error.response?.data;

    // Check for connection errors (server not running)
    // Note: FetchError with "fetch failed" or "<no response>" without timeout indicates connection issues
    const isConnectionError =
      errorCode === 'ECONNREFUSED' ||
      errorCode === 'ENOTFOUND' ||
      errorCode === 'EAI_AGAIN' ||
      errorCode === 'FetchError' ||
      errorMessage.includes('ECONNREFUSED') ||
      errorMessage.includes('ENOTFOUND') ||
      errorMessage.includes('getaddrinfo') ||
      errorMessage.includes('connect ECONNREFUSED') ||
      errorMessage.includes('Failed to fetch') ||
      (errorMessage.includes('fetch failed') && !errorMessage.includes('timeout')) ||
      (errorMessage.includes('<no response>') && !errorMessage.includes('TimeoutError'));

    // Check for timeout errors
    const isTimeout =
      errorMessage.includes('timeout') ||
      errorMessage.includes('ETIMEDOUT') ||
      errorMessage.includes('aborted') ||
      errorCode === 'TimeoutError' ||
      errorCode === 'ETIMEDOUT';

    // Check if Python server returned an error response (has status code but error occurred)
    const hasServerResponse = httpStatusCode && httpStatusCode >= 400 && httpStatusCode < 600;

    // Log errors in development mode
    // Suppress only pure connection errors (ECONNREFUSED, ENOTFOUND) without HTTP status
    // These are expected during startup if Python server isn't fully ready
    // Also suppress timeouts during initial startup (first 30 seconds) as they're likely due to hot reload
    const isPureConnectionError = isConnectionError && !hasServerResponse && !isTimeout;
    const timeSinceStartup = Date.now() - serverStartTime;
    const isStartupTimeout = isTimeout && process.dev && timeSinceStartup < STARTUP_GRACE_PERIOD;
    const shouldLog = process.dev && !isPureConnectionError && !isStartupTimeout;

    if (shouldLog) {
      // Use warning level for timeouts, error for other issues
      const logLevel = isTimeout ? 'warn' : 'error';
      const logMethod = logLevel === 'warn' ? console.warn : console.error;

      logMethod(`[Python API] ${isTimeout ? 'Timeout' : 'Error'} calling Python backend:`, {
        url,
        method: options.method || 'GET',
        error: errorMessage,
        errorCode,
        statusCode: httpStatusCode,
        timeout: `${timeoutSeconds}s`,
        isConnectionError,
        isTimeout,
        hasServerResponse,
        hasResponseData: !!responseData,
      });
    }

    // Handle connection errors (server not running) - these don't have HTTP status codes
    if (isConnectionError && !httpStatusCode) {
      throw createError({
        statusCode: 503,
        statusMessage: 'Service Unavailable',
        data: {
          success: false,
          error: `Cannot connect to Python backend server at ${pythonServerUrl}. Please ensure the Python server is running on port 3000.`,
          endpoint: options.endpoint,
          connectionError: true,
        },
      });
    }

    // Handle timeout errors
    if (isTimeout) {
      throw createError({
        statusCode: 504,
        statusMessage: 'Gateway Timeout',
        data: {
          success: false,
          error: `Operation timed out after ${timeoutSeconds} seconds. The Python backend may be processing a long-running operation.`,
          timeout: timeoutSeconds,
          endpoint: options.endpoint,
        },
      });
    }

    // Handle HTTP error responses from Python server (preserve the response)
    if (hasServerResponse) {
      // Python server returned an error response - preserve it
      const errorData = responseData || {
        success: false,
        error: errorMessage || 'Python server returned an error',
      };

      throw createError({
        statusCode: httpStatusCode,
        statusMessage: error.statusMessage || 'Python API Error',
        data: errorData,
      });
    }

    // Handle other errors (network issues, parsing errors, etc.)
    throw createError({
      statusCode: httpStatusCode || 500,
      statusMessage: error.statusMessage || 'Python API call failed',
      data: responseData || {
        success: false,
        error: errorMessage || 'Failed to connect to Python backend',
        endpoint: options.endpoint,
      },
    });
  }
}

/**
 * Health check for Python backend
 * Uses a shorter timeout since health checks should be fast
 */
export async function checkPythonBackendHealth(event: H3Event): Promise<boolean> {
  try {
    const response = await callPythonApi(event, {
      endpoint: '/api/health',
      method: 'GET',
      timeout: API_TIMEOUTS.HEALTH_CHECK,
    });
    return (
      response?.status === 'healthy' || response?.status === 'ok' || response?.status === 'degraded'
    );
  } catch {
    return false;
  }
}
