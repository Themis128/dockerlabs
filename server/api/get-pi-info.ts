/**
 * Proxy endpoint for /api/get-pi-info
 * Proxies GET and POST requests to Python backend
 */

import { getHeader, setHeader, setResponseStatus } from 'h3';
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

  try {
    const method = getMethod(event);
    const query = getQuery(event);
    const body = method === 'POST' ? await readBody(event).catch(() => ({})) : null;

    let endpoint = '/api/get-pi-info';
    if (query.pi) {
      endpoint += `?pi=${query.pi}`;
    } else if (body && (body as any).pi) {
      endpoint += `?pi=${(body as any).pi}`;
    }

    const response = await callPythonApi(event, {
      endpoint,
      method: method as 'GET' | 'POST',
      body: method === 'POST' ? body : undefined,
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
    const statusCode = error.statusCode || 500;
    setResponseStatus(event, statusCode);

    // Ensure error response has consistent structure
    const errorData = error.data || { success: false, error: 'Failed to get Pi info' };
    return {
      ...errorData,
      success: errorData.success !== undefined ? errorData.success : false,
      error: errorData.error || errorData.message || 'Failed to get Pi info',
    };
  }
});
