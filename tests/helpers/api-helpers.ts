/**
 * Helper functions for API testing through Nuxt proxy
 */

import type { APIRequestContext } from '@playwright/test';

export const NUXT_API_BASE = 'http://localhost:3001/api';
export const PYTHON_API_BASE = 'http://localhost:3000/api';

/**
 * Make API request through Nuxt proxy with retry logic
 */
export async function apiRequest(
  request: APIRequestContext,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
    retries?: number;
    retryDelay?: number;
  } = {}
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  const method = options.method || 'GET';
  const url = `${NUXT_API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  // Reduced default timeout from 30s to 5s for faster test execution
  // Tests can override if they need longer timeouts
  const timeout = options.timeout || 5000; // Default 5 seconds - fail fast
  const maxRetries = options.retries ?? 0; // No retries by default - prevent infinite loops
  const retryDelay = options.retryDelay ?? 500; // Reduced delay

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      let response;
      const requestOptions = { headers, timeout };

      if (method === 'GET') {
        response = await request.get(url, requestOptions);
      } else if (method === 'POST') {
        response = await request.post(url, { ...requestOptions, data: options.body });
      } else if (method === 'PUT') {
        response = await request.put(url, { ...requestOptions, data: options.body });
      } else if (method === 'DELETE') {
        response = await request.delete(url, requestOptions);
      } else {
        throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const data = await response.json().catch(() => ({}));
      const responseHeaders = response.headers();

      return {
        status: response.status(),
        data,
        headers: responseHeaders,
      };
    } catch (error: any) {
      lastError = error;

      // Don't retry on 4xx errors (client errors) - fail immediately
      if (error.response?.status && error.response.status >= 400 && error.response.status < 500) {
        return {
          status: error.response.status,
          data: await error.response.json().catch(() => ({ error: 'Client error' })),
          headers: error.response.headers || {},
        };
      }

      // Handle timeout or connection errors immediately - don't retry
      if (error.message?.includes('timeout') || error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT')) {
        return {
          status: 504,
          data: { error: 'Request timeout or connection refused' },
          headers: {},
        };
      }

      // Only retry on 5xx errors if retries are enabled
      if (attempt < maxRetries && error.response?.status >= 500) {
        await new Promise(resolve => setTimeout(resolve, retryDelay * (attempt + 1)));
        continue;
      }

      // If we get here and it's not a timeout/connection error, return error response
      if (error.response) {
        return {
          status: error.response.status || 500,
          data: await error.response.json().catch(() => ({ error: error.message })),
          headers: error.response.headers || {},
        };
      }

      // Final fallback - return timeout error
      return {
        status: 504,
        data: { error: error.message || 'Request failed' },
        headers: {},
      };
    }
  }

  // Should never reach here, but just in case
  return {
    status: 504,
    data: { error: 'Request failed after retries' },
    headers: {},
  };
}

/**
 * Test API endpoint through Nuxt proxy
 * Returns the result - assertions should be done in test files
 */
export async function testApiEndpoint(
  request: APIRequestContext,
  endpoint: string
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  return await apiRequest(request, endpoint);
}

/**
 * Make API request directly to Python backend (bypassing Nuxt proxy)
 */
export async function pythonApiRequest(
  request: APIRequestContext,
  endpoint: string,
  options: {
    method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body?: any;
    headers?: Record<string, string>;
    timeout?: number;
  } = {}
): Promise<{ status: number; data: any; headers: Record<string, string> }> {
  const method = options.method || 'GET';
  const url = `${PYTHON_API_BASE}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };
  // Reduced default timeout from 30s to 10s for faster test execution
  const timeout = options.timeout || 10000; // Default 10 seconds

  try {
    let response;
    if (method === 'GET') {
      response = await request.get(url, { headers, timeout });
    } else if (method === 'POST') {
      response = await request.post(url, { headers, data: options.body, timeout });
    } else if (method === 'PUT') {
      response = await request.put(url, { headers, data: options.body, timeout });
    } else if (method === 'DELETE') {
      response = await request.delete(url, { headers, timeout });
    } else {
      throw new Error(`Unsupported HTTP method: ${method}`);
    }

    const data = await response.json().catch(() => ({}));
    const responseHeaders = response.headers();

    return {
      status: response.status(),
      data,
      headers: responseHeaders,
    };
  } catch (error: any) {
    // Handle timeout or connection errors
    if (error.message?.includes('timeout') ||
        error.message?.includes('ECONNREFUSED') ||
        error.message?.includes('ECONNRESET') ||
        error.message?.includes('ETIMEDOUT')) {
      return {
        status: 504,
        data: { error: 'Request timeout or connection refused' },
        headers: {},
      };
    }

    // Handle other errors gracefully
    if (error.response) {
      const data = await error.response.json().catch(() => ({ error: error.message }));
      return {
        status: error.response.status || 500,
        data,
        headers: error.response.headers || {},
      };
    }

    // Final fallback
    return {
      status: 500,
      data: { error: error.message || 'Request failed' },
      headers: {},
    };
  }
}

/**
 * Wait for API response with retry
 */
export async function waitForApiResponse(
  request: APIRequestContext,
  endpoint: string,
  maxRetries: number = 5,
  retryDelay: number = 1000
): Promise<any> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const result = await apiRequest(request, endpoint);
      if (result.status === 200) {
        return result.data;
      }
    } catch (error) {
      // Continue to retry
    }
    if (i < maxRetries - 1) {
      await new Promise((resolve) => setTimeout(resolve, retryDelay));
    }
  }
  throw new Error(`API endpoint ${endpoint} did not respond after ${maxRetries} retries`);
}
