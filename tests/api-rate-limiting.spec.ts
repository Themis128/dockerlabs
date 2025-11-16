/**
 * Test to verify that API rate limiting and duplicate call prevention works correctly
 * This test ensures that switching tabs doesn't cause excessive API requests
 */

import { test, expect } from '@playwright/test';

test.describe('API Rate Limiting and Duplicate Call Prevention', () => {
  test('should not make excessive API calls when switching tabs rapidly', async ({
    page,
    context,
  }) => {
    // Track all network requests
    const apiRequests: string[] = [];

    // Monitor network requests
    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/pis') || url.includes('/api/sdcards')) {
        apiRequests.push(url);
      }
    });

    // Navigate to the app
    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.layout-container', { state: 'visible', timeout: 15000 });

    // Wait for initial load
    await page.waitForTimeout(1000);

    // Clear previous requests
    apiRequests.length = 0;

    // Rapidly switch between tabs that trigger API calls
    const tabs = ['dashboard', 'pis', 'sdcard', 'dashboard', 'pis', 'sdcard'];

    for (const tab of tabs) {
      const tabButton = page.locator(`[data-tab="${tab}"]`);
      if ((await tabButton.count()) > 0) {
        await tabButton.click();
        // Small delay to allow requests to be made
        await page.waitForTimeout(100);
      }
    }

    // Wait a bit more to catch any delayed requests
    await page.waitForTimeout(1000);

    // Count requests per endpoint
    const pisRequests = apiRequests.filter((url) => url.includes('/api/pis')).length;
    const sdcardsRequests = apiRequests.filter((url) => url.includes('/api/sdcards')).length;

    // Should not have excessive requests - with 6 tab switches, we should have at most
    // 3-4 calls per endpoint (some tabs trigger the same endpoint)
    // The old bug would have caused 10+ requests per endpoint
    expect(pisRequests).toBeLessThan(10);
    expect(sdcardsRequests).toBeLessThan(10);

    // Log for debugging
    console.log(`Total /api/pis requests: ${pisRequests}`);
    console.log(`Total /api/sdcards requests: ${sdcardsRequests}`);
  });

  test('should debounce rapid tab switches to same tab', async ({ page }) => {
    const apiRequests: string[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/pis')) {
        apiRequests.push(url);
      }
    });

    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.layout-container', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Clear previous requests
    apiRequests.length = 0;

    // Click the same tab multiple times rapidly
    const dashboardTab = page.locator('[data-tab="dashboard"]');
    if ((await dashboardTab.count()) > 0) {
      for (let i = 0; i < 10; i++) {
        await dashboardTab.click();
        await page.waitForTimeout(50); // Very rapid clicks
      }
    }

    // Wait for any debounced requests
    await page.waitForTimeout(1500);

    const pisRequests = apiRequests.filter((url) => url.includes('/api/pis')).length;

    // Should only have 1-2 requests despite 10 clicks (due to debouncing and same-tab prevention)
    expect(pisRequests).toBeLessThan(3);

    console.log(`Requests after 10 rapid clicks on same tab: ${pisRequests}`);
  });

  test('should respect minimum time between API calls', async ({ page }) => {
    const apiRequests: { url: string; time: number }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('/api/pis')) {
        apiRequests.push({ url, time: Date.now() });
      }
    });

    await page.goto('http://localhost:3001', { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.layout-container', { state: 'visible', timeout: 15000 });
    await page.waitForTimeout(1000);

    // Clear previous requests
    apiRequests.length = 0;

    // Switch tabs with very short delays (less than debounce time)
    const tabs = ['pis', 'dashboard', 'pis', 'dashboard'];

    for (const tab of tabs) {
      const tabButton = page.locator(`[data-tab="${tab}"]`);
      if ((await tabButton.count()) > 0) {
        await tabButton.click();
        await page.waitForTimeout(100); // Less than 500ms debounce
      }
    }

    // Wait for all requests to complete
    await page.waitForTimeout(2000);

    // Check time between requests
    if (apiRequests.length > 1) {
      for (let i = 1; i < apiRequests.length; i++) {
        const current = apiRequests[i];
        const previous = apiRequests[i - 1];
        if (current && previous) {
          const timeDiff = current.time - previous.time;
          // Should respect 500ms debounce (allow some tolerance)
          expect(timeDiff).toBeGreaterThan(400);
        }
      }
    }

    console.log(`Total requests: ${apiRequests.length}`);
    if (apiRequests.length > 1) {
      const timeDiffs = [];
      for (let i = 1; i < apiRequests.length; i++) {
        const current = apiRequests[i];
        const previous = apiRequests[i - 1];
        if (current && previous) {
          timeDiffs.push(current.time - previous.time);
        }
      }
      console.log(`Time differences between requests: ${timeDiffs.join(', ')}ms`);
    }
  });
});
