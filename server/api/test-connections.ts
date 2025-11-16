/**
 * Proxy endpoint for /api/test-connections
 * Proxies requests to Python backend
 */

import { callPythonApi } from '../utils/python-api'

export default defineEventHandler(async (event) => {
  // Handle CORS preflight
  if (getMethod(event) === 'OPTIONS') {
    const origin = getHeader(event, 'origin')
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin)
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    }
    return {}
  }

  try {
    const response = await callPythonApi(event, {
      endpoint: '/api/test-connections',
      method: 'GET',
    })

    // Set CORS headers if Origin is present
    const origin = getHeader(event, 'origin')
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin)
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    }

    // Ensure content-type is set
    setHeader(event, 'Content-Type', 'application/json')
    return response
  } catch (error: any) {
    // Return error response instead of throwing for test-connections
    const origin = getHeader(event, 'origin')
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin)
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    }

    setHeader(event, 'Content-Type', 'application/json')
    setResponseStatus(event, error.statusCode || 500)
    return error.data || { success: false, error: 'Failed to test connections' }
  }
})
