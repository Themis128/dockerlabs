/**
 * Catch-all API route for invalid endpoints
 * Returns 404 for any unmatched API routes
 */

import { getHeader, setHeader, setResponseStatus } from 'h3';

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

  const origin = getHeader(event, 'origin');
  if (origin) {
    setHeader(event, 'Access-Control-Allow-Origin', origin);
    setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type');
  }
  setHeader(event, 'Content-Type', 'application/json');
  setResponseStatus(event, 404);

  return {
    success: false,
    error: 'API endpoint not found',
    message: 'API endpoint not found',
  };
});
