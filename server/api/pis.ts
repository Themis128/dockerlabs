/**
 * Proxy endpoint for /api/pis
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
      endpoint: '/api/pis',
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

    // Transform response to match expected format: {success, data: {pis}}
    // Handle both formats: {success, pis} and {success, data: {pis}}
    if (response.success) {
      const pis = response.pis || response.data?.pis
      if (pis) {
        return {
          success: true,
          data: {
            pis: Array.isArray(pis) ? pis : [],
          },
        }
      }
      // If response already has the correct format, return as-is
      if (response.data?.pis) {
        return response
      }
    }

    // Return error response if success is false or no pis found
    return {
      success: false,
      error: response.error || 'Failed to fetch Pis',
      data: response.data,
    }
  } catch (error: any) {
    const origin = getHeader(event, 'origin')
    if (origin) {
      setHeader(event, 'Access-Control-Allow-Origin', origin)
      setHeader(event, 'Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      setHeader(event, 'Access-Control-Allow-Headers', 'Content-Type')
    }
    setHeader(event, 'Content-Type', 'application/json')
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.statusMessage || 'Failed to fetch Pis',
      data: error.data || { success: false, error: 'Failed to fetch Pis' },
    })
  }
})
