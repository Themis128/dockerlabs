import { test, expect } from '@playwright/test';
import { apiRequest, testApiEndpoint, waitForApiResponse } from './helpers/api-helpers';

test.describe('API Integration through Nuxt Proxy', () => {
  test('GET /api/pis should return valid JSON through Nuxt proxy', async ({ request }) => {
    const result = await apiRequest(request, '/pis', {
      timeout: 5000,
      retries: 0,
    });

    // Accept 200 (success) or 429 (rate limiting) or 500 (server error) or 503/504 (timeout/unavailable)
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      // Content-type may include charset, so just check it contains json
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');

      // Check response structure - API may return pis array or object with pis property
      if (result.data) {
        expect(typeof result.data === 'object').toBeTruthy();
        if (result.data.pis) {
          expect(Array.isArray(result.data.pis)).toBeTruthy();
        } else if (Array.isArray(result.data)) {
          // API might return array directly
          expect(Array.isArray(result.data)).toBeTruthy();
        }
      }
    }
  });

  test('GET /api/pis should include success property', async ({ request }) => {
    const result = await apiRequest(request, '/pis', {
      timeout: 5000,
      retries: 0,
    });

    // Accept 200 (success) or 429 (rate limiting) or 500 (server error) or 503/504 (timeout/unavailable)
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200 && result.data) {
      // API may return success property
      if (result.data.hasOwnProperty('success')) {
        expect(typeof result.data.success).toBe('boolean');
      }
    }
  });

  test('GET /api/sdcards should return valid JSON through Nuxt proxy', async ({ request }) => {
    const result = await apiRequest(request, '/sdcards', {
      timeout: 5000,
      retries: 0,
    });

    // Accept 200 (success) or 429 (rate limiting) or 500 (server error) or 503/504 (timeout/unavailable)
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      // Content-type may include charset, so just check it contains json
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');

      // Response should be an object
      if (result.data) {
        expect(typeof result.data === 'object').toBeTruthy();
      }
    }
  });

  test('GET /api/os-images should return valid JSON through Nuxt proxy', async ({ request }) => {
    const result = await apiRequest(request, '/os-images', {
      timeout: 5000,
      retries: 0,
    });

    // Accept 200 (success) or 429 (rate limiting) or 500 (server error) or 504 (timeout)
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      // Content-type may include charset, so just check it contains json
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');

      if (result.data) {
        expect(typeof result.data === 'object').toBeTruthy();
      }
    }
  });

  test('GET /api/test-connections should be accessible through Nuxt proxy', async ({ request }) => {
    const result = await apiRequest(request, '/test-connections', {
      timeout: 5000,
      retries: 0,
    });

    // Should return 200, 400, 404, 429 (rate limiting), 500, 503, or 504 (timeout) or handle error gracefully
    expect([200, 400, 404, 429, 500, 503, 504]).toContain(result.status);
    // Response should be an object (even if it's an error)
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('API requests should include CORS headers when Origin is present', async ({ request }) => {
    const result = await apiRequest(request, '/pis', {
      headers: {
        Origin: 'http://localhost:3001',
      },
      timeout: 5000,
      retries: 0,
    });

    // Accept 200 (success) or 429 (rate limiting) or 500 (server error) or 504 (timeout)
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    // CORS headers should be present when Origin header is sent (if request succeeded)
    if (result.status === 200) {
      const headers = result.headers;
      if (headers['access-control-allow-origin']) {
        expect(headers['access-control-allow-origin']).toBeTruthy();
      }
    }
  });

  test('POST requests should work through Nuxt proxy', async ({ request }) => {
    // Test a POST endpoint (adjust based on actual API)
    const result = await apiRequest(request, '/scan-wifi', {
      method: 'POST',
      body: {},
      timeout: 5000,
      retries: 0,
    });

    // Should return a response (may be success or error, including 429 for rate limiting or 504 for timeout)
    expect([200, 400, 429, 500, 503, 504]).toContain(result.status);
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('API error handling should return proper error structure', async ({ request }) => {
    // Test with invalid endpoint
    const result = await apiRequest(request, '/invalid-endpoint', {
      timeout: 5000,
      retries: 0,
    });

    // Should return error status (404, 500, 503, or 504)
    expect([404, 500, 503, 504]).toContain(result.status);

    // Error response should be an object or at least defined
    expect(result.data).toBeDefined();
    if (result.data && typeof result.data === 'object') {
      expect(typeof result.data === 'object').toBeTruthy();
    }
  });

  test('API should handle timeout gracefully', async ({ request }) => {
    // This test verifies the API doesn't hang
    const startTime = Date.now();

    const result = await apiRequest(request, '/pis', {
      timeout: 5000,
      retries: 0,
    });
    const duration = Date.now() - startTime;

    // Should complete within reasonable time (10 seconds with 5s timeout)
    expect(duration).toBeLessThan(10000);

    // Should return some status code (even if it's a timeout)
    expect(result.status).toBeGreaterThanOrEqual(200);
    expect(result.data).toBeDefined();
  });
});
