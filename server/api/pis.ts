/**
 * Proxy endpoint for /api/pis
 * Proxies requests to Python backend
 */

import { getHeader, setHeader, createError } from 'h3'
import { callPythonApi, API_TIMEOUTS } from '../utils/python-api'

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
      timeout: API_TIMEOUTS.SIMPLE_READ, // Simple read operation should be fast
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
    // Preserve the status code from the error (503 for connection errors, 504 for timeouts, etc.)
    const statusCode = error.statusCode || error.status || 500
    throw createError({
      statusCode,
      statusMessage: error.statusMessage || 'Failed to fetch Pis',
      data: error.data || { success: false, error: 'Failed to fetch Pis' },
    })
  }
})
