/**
 * Proxy endpoint for /api/format-sdcard
 * Proxies POST requests to Python backend
 */

import { getHeader, setHeader, createError } from 'h3';
import { callPythonApi, API_TIMEOUTS } from '../utils/python-api';

export default defineEventHandler(async (event) => {
  // Handle CORS preflight
  if (getMethod(event) === 'OPTIONS') {
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }
    return {};
  }

  try {
    const body = await readBody(event).catch(() => ({}));

    const response = await callPythonApi(event, {
      endpoint: '/api/format-sdcard',
      method: 'POST',
      body,
      timeout: API_TIMEOUTS.FORMAT_SDCARD, // SD card formatting can take up to 180 seconds
    });

    // Set CORS headers if Origin is present
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }

    // Ensure content-type is set
    setHeader(event, 'Content-Type', 'application/json');
    return response;
  } catch (error: any) {
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }
    setHeader(event, 'Content-Type', 'application/json');
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to format SD card',
      data: error.data || { success: false, error: 'Failed to format SD card' },
    });
  }
});
