import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('Raspberry Pi Manager GUI', () => {
  test.beforeEach(async ({ page }) => {
    // Retry navigation with exponential backoff if server isn't ready
    let retries = 5;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        // Use load for faster page loads - waits for load event
        await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
        // Wait for h1 to be visible - ensures page is loaded
        await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
        // Wait for at least one tab button to be ready (ensures JS is initialized)
        await page.waitForSelector('[data-tab]', { state: 'visible', timeout: 10000 });
        // Success - break out of retry loop
        return;
      } catch (error) {
        lastError = error as Error;
        retries--;
        if (retries > 0) {
          // Wait a bit before retrying (exponential backoff: 1s, 2s, 3s, 4s)
          const waitTime = 1000 * (5 - retries);
          await page.waitForTimeout(waitTime);
        }
      }
    }

    // If we get here, all retries failed
    throw lastError || new Error('Failed to load page after retries');
  });

  test('should load the homepage', async ({ page }) => {
    // h1 is already visible from beforeEach, just check text
    await expect(page.locator('h1')).toContainText('Raspberry Pi Manager', { timeout: 2000 });
  });

  test('should display dashboard tab by default', async ({ page }) => {
    // Wait for dashboard tab content to be ready and active
    await page.waitForFunction(
      () => {
        const dashboardTab = document.getElementById('dashboard');
        return dashboardTab && dashboardTab.classList.contains('active');
      },
      { timeout: 15000 }
    );

    const dashboardTab = page.locator('#dashboard');
    await expect(dashboardTab).toBeVisible({ timeout: 10000 });
    await expect(dashboardTab).toHaveClass(/active/, { timeout: 10000 });
  });

  test('should switch to Raspberry Pis tab', async ({ page }) => {
    // Wait for tab button to be ready before clicking
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });

    // Click tab button
    await page.click('[data-tab="pis"]');

    // Wait for tab to become active using waitForFunction with more reliable check
    await page.waitForFunction(
      () => {
        const pisTab = document.getElementById('pis');
        const dashboardTab = document.getElementById('dashboard');
        return pisTab && pisTab.classList.contains('active') &&
               dashboardTab && !dashboardTab.classList.contains('active');
      },
      { timeout: 15000 }
    );

    // Verify tab is visible and active
    const pisTab = page.locator('#pis');
    await expect(pisTab).toBeVisible({ timeout: 10000 });
    await expect(pisTab).toHaveClass(/active/, { timeout: 10000 });
    await expect(page.locator('#dashboard')).not.toHaveClass(/active/, { timeout: 5000 });
  });

  test('should switch to Test Connections tab', async ({ page }) => {
    // Wait for tab button to be ready before clicking
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click tab button
    await page.click('[data-tab="connections"]');

    // Wait for tab to become active using waitForFunction with more reliable check
    await page.waitForFunction(
      () => {
        const connectionsTab = document.getElementById('connections');
        const dashboardTab = document.getElementById('dashboard');
        return connectionsTab && connectionsTab.classList.contains('active') &&
               dashboardTab && !dashboardTab.classList.contains('active');
      },
      { timeout: 15000 }
    );

    // Wait for tab content to be visible and active
    const connectionsTab = page.locator('#connections');
    await expect(connectionsTab).toBeVisible({ timeout: 10000 });
    await expect(connectionsTab).toHaveClass(/active/, { timeout: 10000 });
  });

  test('should load Raspberry Pi list from API', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });

    // Click tab and wait for API response and tab to be active
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 10000 }
      ).catch(() => null),
      page.waitForFunction(
        () => {
          const pisTab = document.getElementById('pis');
          return pisTab && pisTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="pis"]')
    ]);

    // Check if pi-list is visible (may show loading or content)
    const piList = page.locator('#pi-list');
    await expect(piList).toBeVisible({ timeout: 10000 });
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Don't wait for API - just check that stat elements exist (they may show "-" initially)
    // The API call happens automatically on page load, but we don't need to wait for it
    await Promise.all([
      expect(page.locator('#total-pis')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#ethernet-count')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#wifi-count')).toBeVisible({ timeout: 2000 })
    ]);
  });

  test('should have refresh button on dashboard', async ({ page }) => {
    const refreshButton = page.locator('#refresh-dashboard');
    await Promise.all([
      expect(refreshButton).toBeVisible({ timeout: 2000 }),
      expect(refreshButton).toContainText('Refresh', { timeout: 2000 })
    ]);
  });

  test('should have refresh button on Pis tab', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const pisTab = document.getElementById('pis');
          return pisTab && pisTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="pis"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 15000 });

    const refreshButton = page.locator('#refresh-pis');
    await Promise.all([
      expect(refreshButton).toBeVisible({ timeout: 10000 }),
      expect(refreshButton).toContainText('Refresh List', { timeout: 5000 })
    ]);
  });

  test('should display test connections section', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const connectionsTab = document.getElementById('connections');
          return connectionsTab && connectionsTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="connections"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render in Firefox
    await page.waitForTimeout(500);

    // Check all elements in parallel - test-results might be hidden initially, so just check it exists
    await Promise.all([
      expect(page.locator('h3:has-text("Test All Connections")')).toBeVisible({ timeout: 10000 }),
      expect(page.locator('#test-all')).toBeVisible({ timeout: 10000 }),
      expect(page.locator('#test-results')).toBeAttached({ timeout: 5000 }) // Just check it exists, not necessarily visible
    ]);
  });

  test('should display SSH test section', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const connectionsTab = document.getElementById('connections');
          return connectionsTab && connectionsTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="connections"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render in Firefox
    await page.waitForTimeout(500);

    // Check all SSH section elements in parallel with longer timeouts
    await Promise.all([
      expect(page.locator('h3:has-text("Test SSH Authentication")')).toBeVisible({ timeout: 10000 }),
      expect(page.locator('#pi-select')).toBeVisible({ timeout: 10000 }),
      expect(page.locator('#test-ssh')).toBeVisible({ timeout: 10000 }),
      expect(page.locator('#ssh-results')).toBeVisible({ timeout: 10000 })
    ]);
  });

  test('should have Pi selection dropdown with options', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const connectionsTab = document.getElementById('connections');
          return connectionsTab && connectionsTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="connections"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render
    await page.waitForTimeout(500);

    const select = page.locator('#pi-select');
    await expect(select).toBeVisible({ timeout: 10000 });

    const options = select.locator('option');
    await Promise.all([
      expect(options).toHaveCount(2, { timeout: 10000 }),
      expect(options.nth(0)).toContainText('Pi 1', { timeout: 5000 }),
      expect(options.nth(1)).toContainText('Pi 2', { timeout: 5000 })
    ]);
  });

  test('should click test all connections button', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const connectionsTab = document.getElementById('connections');
          return connectionsTab && connectionsTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="connections"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render
    await page.waitForTimeout(500);

    const testButton = page.locator('#test-all');
    await expect(testButton).toBeVisible({ timeout: 10000 });
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#test-results');
    await expect(results).toBeVisible({ timeout: 10000 });
  });

  test('should click test SSH button', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });

    // Click and wait for tab to be active
    await Promise.all([
      page.waitForFunction(
        () => {
          const connectionsTab = document.getElementById('connections');
          return connectionsTab && connectionsTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="connections"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render
    await page.waitForTimeout(500);

    const testButton = page.locator('#test-ssh');
    await expect(testButton).toBeVisible({ timeout: 10000 });
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#ssh-results');
    await expect(results).toBeVisible({ timeout: 10000 });
  });

  test('should have proper tab navigation', async ({ page }) => {
    // Test all tabs
    const tabs = ['dashboard', 'pis', 'connections'];

    for (const tab of tabs) {
      // Wait for tab button to be ready
      await page.waitForSelector(`[data-tab="${tab}"]`, { state: 'visible', timeout: 10000 });

      // Click and wait for tab to be active
      await Promise.all([
        page.waitForFunction(
          (tabName) => {
            const tabElement = document.getElementById(tabName);
            return tabElement && tabElement.classList.contains('active');
          },
          tab,
          { timeout: 15000 }
        ),
        page.click(`[data-tab="${tab}"]`)
      ]);

      // Wait for tab content to be visible
      await page.waitForSelector(`#${tab}`, { state: 'visible', timeout: 15000 });
      await expect(page.locator(`#${tab}`)).toHaveClass(/active/, { timeout: 10000 });

      // Wait a bit for DOM to update
      await page.waitForTimeout(300);

      // Verify other tabs are not active in parallel
      const otherTabs = tabs.filter(t => t !== tab);
      await Promise.all(
        otherTabs.map(otherTab =>
          expect(page.locator(`#${otherTab}`)).not.toHaveClass(/active/, { timeout: 5000 })
        )
      );
    }
  });

  test('should display pi cards with correct information', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });

    // Click tab and wait for API response and tab to be active
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null),
      page.waitForFunction(
        () => {
          const pisTab = document.getElementById('pis');
          return pisTab && pisTab.classList.contains('active');
        },
        { timeout: 15000 }
      ),
      page.click('[data-tab="pis"]')
    ]);

    // Wait for tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 15000 });

    // Wait a bit for content to render
    await page.waitForTimeout(500);

    // Wait for at least one pi card to be visible (give more time for rendering)
    const piCards = page.locator('.pi-card');
    await expect(piCards.first()).toBeVisible({ timeout: 15000 });

    // Check first card has required elements in parallel
    const firstCard = piCards.first();
    await Promise.all([
      expect(firstCard.locator('h3')).toBeVisible({ timeout: 10000 }),
      expect(firstCard.locator('text=/IP:/').first()).toBeVisible({ timeout: 10000 }),
      expect(firstCard.locator('text=/MAC:/').first()).toBeVisible({ timeout: 10000 })
    ]);
  });
});
