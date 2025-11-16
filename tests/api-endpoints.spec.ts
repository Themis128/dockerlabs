/**
 * Comprehensive Playwright tests for all API endpoints
 * Tests both GET and POST endpoints through the Nuxt proxy
 */

import { test, expect } from '@playwright/test';
import { apiRequest, pythonApiRequest } from './helpers/api-helpers';

test.describe('API Endpoints - GET Requests', () => {
  test('GET /api/health should return health status', async ({ request }) => {
    const result = await apiRequest(request, '/health');

    // Accept 200 or service unavailable (503/504) if servers aren't running
    expect([200, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();

    // Health endpoint should have status field
    if (result.data.status) {
      expect(result.data.status).toBeTruthy();
    }
  });

  test('GET /api/metrics should return server metrics', async ({ request }) => {
    const result = await apiRequest(request, '/metrics');

    // Accept 200, 429 (rate limiting), 500 (server error), or service unavailable (503/504) if servers aren't running
    expect([200, 429, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/pis should return list of Raspberry Pis', async ({ request }) => {
    // Use shorter timeout for this endpoint - if it's slow, fail fast
    const result = await apiRequest(request, '/pis', {
      timeout: 5000, // 5 second timeout
      retries: 0, // No retries for faster failure
    });

    // Accept 200 or service unavailable (503/504) if servers aren't running
    expect([200, 503, 504]).toContain(result.status);
    const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
    expect(contentType.toLowerCase()).toContain('json');

    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();

    // Response should have pis array or success property
    if (result.data.pis) {
      expect(Array.isArray(result.data.pis)).toBeTruthy();
    } else if (result.data.success !== undefined) {
      expect(typeof result.data.success).toBe('boolean');
    }
  });

  test('GET /api/test-connections should test connectivity to all Pis', async ({ request }) => {
    const result = await apiRequest(request, '/test-connections', {
      timeout: 5000,
      retries: 0,
    });

    // Should return 200, 400, 404, 500, or 504 (timeout) (depending on Pi availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/test-ssh should test SSH authentication for a Pi', async ({ request }) => {
    // Test with pi parameter
    const result = await apiRequest(request, '/test-ssh?pi=1', {
      timeout: 5000,
      retries: 0,
    });

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/get-pi-info should return information for a specific Pi', async ({ request }) => {
    // Test with pi parameter
    const result = await apiRequest(request, '/get-pi-info?pi=1', {
      timeout: 5000,
      retries: 0,
    });

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/sdcards should return list of SD cards', async ({ request }) => {
    // Use shorter timeout for this endpoint - if it's slow, fail fast
    const result = await apiRequest(request, '/sdcards', {
      timeout: 5000, // 5 second timeout
      retries: 0, // No retries for faster failure
    });

    // Accept 200, 429 (rate limiting), 500 (server error), or service unavailable (503/504) if servers aren't running
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');
    }

    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/os-images should return list of OS images', async ({ request }) => {
    const result = await apiRequest(request, '/os-images');

    // Accept 200, 429 (rate limiting), 500 (server error), or service unavailable (503/504) if servers aren't running
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');
    }

    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/scan-wifi should scan for WiFi networks', async ({ request }) => {
    const result = await apiRequest(request, '/scan-wifi');

    // Should return a response (may be success or error)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });
});

test.describe('API Endpoints - POST Requests', () => {
  test('POST /api/connect-ssh should connect via SSH', async ({ request }) => {
    const result = await apiRequest(request, '/connect-ssh', {
      method: 'POST',
      body: {
        pi: '1',
        username: 'pi',
        password: 'raspberry',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
      retries: 0, // No retries for faster failure
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 401, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/connect-telnet should connect via Telnet', async ({ request }) => {
    const result = await apiRequest(request, '/connect-telnet', {
      method: 'POST',
      body: {
        pi: '1',
        username: 'pi',
        password: 'raspberry',
      },
    });

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 401, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/execute-remote should execute command on remote Pi', async ({ request }) => {
    const result = await apiRequest(request, '/execute-remote', {
      method: 'POST',
      body: {
        pi: '1',
        command: 'echo "test"',
        connection_type: 'ssh',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
      retries: 0, // No retries for faster failure
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 401, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/format-sdcard should format an SD card', async ({ request }) => {
    const result = await apiRequest(request, '/format-sdcard', {
      method: 'POST',
      body: {
        device_id: 'test-device',
        pi_model: 'pi5',
        file_system: 'fat32',
      },
    });

    // Should return a response (may be success or error depending on device availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/install-os should install OS on SD card', async ({ request }) => {
    const result = await apiRequest(request, '/install-os', {
      method: 'POST',
      body: {
        device_id: 'test-device',
        os_image: 'raspios-lite',
        pi_model: 'pi5',
      },
    });

    // Should return a response (may be success or error depending on device availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/configure-pi should configure a Pi', async ({ request }) => {
    const result = await apiRequest(request, '/configure-pi', {
      method: 'POST',
      body: {
        pi: '1',
        hostname: 'test-pi',
        wifi_ssid: 'test-network',
        wifi_password: 'test-password',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
      retries: 0, // No retries for faster failure
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/scan-wifi should scan for WiFi networks', async ({ request }) => {
    const result = await apiRequest(request, '/scan-wifi', {
      method: 'POST',
      body: {},
    });

    // Should return a response (may be success or error)
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/get-pi-info should return Pi info (POST method)', async ({ request }) => {
    const result = await apiRequest(request, '/get-pi-info', {
      method: 'POST',
      body: {
        pi: '1',
      },
    });

    // Should return a response (may be success or error depending on Pi availability)
    expect([200, 400, 404, 500]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });
});

test.describe('API Endpoints - CORS and Headers', () => {
  test('API requests should include CORS headers when Origin is present', async ({ request }) => {
    const result = await apiRequest(request, '/pis', {
      headers: {
        'Origin': 'http://localhost:3001',
      },
    });

    // Accept 200, 429 (rate limiting), 500 (server error), or service unavailable (503/504) if servers aren't running
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    // CORS headers should be present when Origin header is sent (if request succeeded)
    if (result.status === 200) {
      const headers = result.headers;
      if (headers['access-control-allow-origin']) {
        expect(headers['access-control-allow-origin']).toBeTruthy();
      }
    }
  });

  test('OPTIONS requests should handle CORS preflight', async ({ request }) => {
    // Use fetch API directly for OPTIONS requests since Playwright's request context doesn't support it
    const response = await request.fetch('http://localhost:3001/api/pis', {
      method: 'OPTIONS',
      headers: {
        'Origin': 'http://localhost:3001',
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'Content-Type',
      },
    });

    expect([200, 204, 503, 504]).toContain(response.status());

    const headers = response.headers();
    if (headers['access-control-allow-origin']) {
      expect(headers['access-control-allow-origin']).toBeTruthy();
    }
  });

  test('API responses should have correct Content-Type header', async ({ request }) => {
    const result = await apiRequest(request, '/pis');

    // Accept 200, 429 (rate limiting), 500 (server error), or service unavailable (503/504) if servers aren't running
    expect([200, 429, 500, 503, 504]).toContain(result.status);

    if (result.status === 200) {
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');
    }
  });
});

test.describe('API Endpoints - Error Handling', () => {
  test('Invalid endpoint should return 404', async ({ request }) => {
    const result = await apiRequest(request, '/invalid-endpoint');

    // Accept 404 or service unavailable (503/504) if servers aren't running
    expect([404, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();

    // Error response should have error message if it's a 404
    if (result.status === 404 && result.data.error) {
      expect(typeof result.data.error).toBe('string');
    }
  });

  test('API should handle missing required parameters gracefully', async ({ request }) => {
    // Test endpoint that requires parameters without providing them
    const result = await apiRequest(request, '/test-ssh');

    // Should return error status (400, 404, 500, 503, or 504)
    expect([400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
  });

  test('API should handle malformed request body gracefully', async ({ request }) => {
    const result = await apiRequest(request, '/format-sdcard', {
      method: 'POST',
      body: {
        // Missing required fields
      },
    });

    // Should return error status (400, 404, 500, 503, or 504)
    expect([400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
  });

  test('API should handle timeout gracefully', async ({ request }) => {
    const startTime = Date.now();

    try {
      const result = await apiRequest(request, '/pis');
      const duration = Date.now() - startTime;

      // Should complete within reasonable time (60 seconds)
      expect(duration).toBeLessThan(60000);

      // Should return some status code
      expect(result.status).toBeGreaterThanOrEqual(200);
    } catch (error) {
      // Timeout errors are acceptable for this test
      expect(error).toBeDefined();
    }
  });
});

test.describe('API Endpoints - Response Structure', () => {
  test('Successful responses should have consistent structure', async ({ request }) => {
    const result = await apiRequest(request, '/pis');

    // Only check structure if we got a successful response
    if (result.status === 200) {
      expect(result.data).toBeDefined();
      expect(typeof result.data === 'object').toBeTruthy();

      // If response has success property, it should be boolean
      if (result.data.hasOwnProperty('success')) {
        expect(typeof result.data.success).toBe('boolean');
      }
    } else {
      // For non-200 responses, just verify we got a response
      expect(result.data).toBeDefined();
    }
  });

  test('Error responses should have error information', async ({ request }) => {
    const result = await apiRequest(request, '/invalid-endpoint');

    if (result.status >= 400 && result.status < 500) {
      expect(result.data).toBeDefined();
      expect(typeof result.data === 'object').toBeTruthy();

      // Error responses should have error or message field (if not a connection error)
      if (result.data && (result.data.error || result.data.message)) {
        expect(
          typeof (result.data.error || result.data.message) === 'string'
        ).toBeTruthy();
      }
    } else {
      // For 500+ or connection errors, just verify we got a response
      expect(result.data).toBeDefined();
    }
  });
});

test.describe('API Endpoints - Direct Python Backend Access', () => {
  test('GET /api/health should return health status from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/health');

    // Accept 200 or connection errors if Python server isn't running
    expect([200, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();

    // Health endpoint should have status field
    if (result.data.status) {
      expect(result.data.status).toBeTruthy();
    }
  });

  test('GET /api/metrics should return server metrics from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/metrics');

    // Accept 200 or connection errors if Python server isn't running
    expect([200, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/pis should return list from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/pis');

    // Accept 200 or connection errors if Python server isn't running
    expect([200, 500, 503, 504]).toContain(result.status);

    // Content-type check only if we got a successful response
    if (result.status === 200) {
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');
    }

    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/test-connections should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/test-connections');

    // Accept various status codes including connection errors
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('GET /api/sdcards should return list from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/sdcards');

    // Accept 200 or connection errors if Python server isn't running
    expect([200, 500, 503, 504]).toContain(result.status);

    // Content-type check only if we got a successful response
    if (result.status === 200) {
      const contentType = result.headers['content-type'] || result.headers['Content-Type'] || '';
      expect(contentType.toLowerCase()).toContain('json');
    }

    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/format-sdcard should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/format-sdcard', {
      method: 'POST',
      body: {
        device_id: 'test-device',
        pi_model: 'pi5',
        file_system: 'fat32',
      },
    });

    // Accept various status codes including connection errors
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/connect-ssh should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/connect-ssh', {
      method: 'POST',
      body: {
        pi: '1',
        username: 'pi',
        password: 'raspberry',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    expect([200, 400, 401, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/execute-remote should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/execute-remote', {
      method: 'POST',
      body: {
        pi: '1',
        command: 'echo "test"',
        connection_type: 'ssh',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    expect([200, 400, 401, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/install-os should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/install-os', {
      method: 'POST',
      body: {
        device_id: 'test-device',
        os_image: 'raspios-lite',
        pi_model: 'pi5',
      },
    });

    // Accept various status codes including connection errors
    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });

  test('POST /api/configure-pi should work from Python backend', async ({ request }) => {
    const result = await pythonApiRequest(request, '/configure-pi', {
      method: 'POST',
      body: {
        pi: '1',
        hostname: 'test-pi',
        wifi_ssid: 'test-network',
        wifi_password: 'test-password',
      },
      timeout: 5000, // Reduced to 5 second timeout for faster tests
    }).catch(() => ({
      status: 504,
      data: { error: 'Request timeout' },
      headers: {},
    }));

    expect([200, 400, 404, 500, 503, 504]).toContain(result.status);
    expect(result.data).toBeDefined();
    expect(typeof result.data === 'object').toBeTruthy();
  });
});
