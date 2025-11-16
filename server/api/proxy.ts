/**
 * Generic proxy endpoint to Python backend
 * This is a catch-all proxy that can be used for server-side proxying
 * when needed. Most API routes use specific endpoints in server/api/
 *
 * Note: The Vite proxy in nuxt.config.ts handles client-side proxying
 * during development. This endpoint is for server-side proxying scenarios.
 */

import { getHeader, setHeader, createError } from 'h3';
import { callPythonApi } from '../utils/python-api';

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

  const config = useRuntimeConfig();
  const pythonServerUrl = config.public.pythonServerUrl || 'http://localhost:3000';

  // Get the path from the request
  const path = getRouterParam(event, 'path') || '';
  const endpoint = path ? `/${path}` : '/api';

  try {
    const method = getMethod(event);
    const body = method !== 'GET' ? await readBody(event).catch(() => ({})) : undefined;

    const response = await callPythonApi(event, {
      endpoint,
      method: method as 'GET' | 'POST' | 'PUT' | 'DELETE',
      body,
    });

    // Set CORS headers
    const origin = getHeader(event, 'origin');
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin);
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
    }

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
      statusMessage: error.statusMessage || 'Proxy request failed',
      data: error.data || { success: false, error: 'Proxy request failed' },
    });
  }
});
