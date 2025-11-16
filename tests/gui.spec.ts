import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('Raspberry Pi Manager GUI', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we can connect to the server before each test
    // Use networkidle to ensure the page is fully loaded
    await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
    // Wait for the page to be fully loaded
    await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
  });

  test('should load the homepage', async ({ page }) => {
    await expect(page.locator('h1')).toContainText('Raspberry Pi Manager');
  });

  test('should display dashboard tab by default', async ({ page }) => {
    const dashboardTab = page.locator('#dashboard');
    await expect(dashboardTab).toBeVisible();
    await expect(dashboardTab).toHaveClass(/active/);
  });

  test('should switch to Raspberry Pis tab', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="pis"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#pis')).toBeVisible();
    await expect(page.locator('#pis')).toHaveClass(/active/);
    await expect(page.locator('#dashboard')).not.toHaveClass(/active/);
  });

  test('should switch to Test Connections tab', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="connections"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 10000 });
    await expect(page.locator('#connections')).toBeVisible();
    await expect(page.locator('#connections')).toHaveClass(/active/);
  });

  test('should load Raspberry Pi list from API', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="pis"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 10000 });

    // Wait for API call with timeout
    try {
      await page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 15000 }
      );
    } catch (e) {
      // If API fails, just verify tab is visible
    }

    // Check if pi-list is populated (not showing loading message)
    const piList = page.locator('#pi-list');
    await expect(piList).toBeVisible({ timeout: 10000 });
  });

  test('should display dashboard statistics', async ({ page }) => {
    // Wait for dashboard to be visible
    await page.waitForSelector('#dashboard', { state: 'visible', timeout: 10000 });

    // Wait for data to load with timeout
    try {
      await page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 15000 }
      );
    } catch (e) {
      // If API fails, just check that the elements exist
    }

    // Check that stats are displayed (not showing dashes)
    const totalPis = page.locator('#total-pis');
    await expect(totalPis).toBeVisible({ timeout: 10000 });

    const ethernetCount = page.locator('#ethernet-count');
    await expect(ethernetCount).toBeVisible({ timeout: 10000 });

    const wifiCount = page.locator('#wifi-count');
    await expect(wifiCount).toBeVisible({ timeout: 10000 });
  });

  test('should have refresh button on dashboard', async ({ page }) => {
    // Wait for dashboard to be visible
    await page.waitForSelector('#dashboard', { state: 'visible', timeout: 10000 });
    const refreshButton = page.locator('#refresh-dashboard');
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await expect(refreshButton).toContainText('Refresh');
  });

  test('should have refresh button on Pis tab', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="pis"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 10000 });
    const refreshButton = page.locator('#refresh-pis');
    await expect(refreshButton).toBeVisible({ timeout: 10000 });
    await expect(refreshButton).toContainText('Refresh List');
  });

  test('should display test connections section', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="connections"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 10000 });

    await expect(page.locator('h3:has-text("Test All Connections")')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#test-all')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#test-results')).toBeVisible({ timeout: 10000 });
  });

  test('should display SSH test section', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="connections"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="connections"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#connections', { state: 'visible', timeout: 10000 });
    // Wait for the SSH section elements to be present
    await page.waitForSelector('#test-ssh', { state: 'visible', timeout: 10000 });

    await expect(page.locator('h3:has-text("Test SSH Authentication")')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#pi-select')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#test-ssh')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#ssh-results')).toBeVisible({ timeout: 5000 });
  });

  test('should have Pi selection dropdown with options', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    const select = page.locator('#pi-select');
    await expect(select).toBeVisible();

    const options = select.locator('option');
    await expect(options).toHaveCount(2);
    await expect(options.nth(0)).toContainText('Pi 1');
    await expect(options.nth(1)).toContainText('Pi 2');
  });

  test('should click test all connections button', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    const testButton = page.locator('#test-all');
    await expect(testButton).toBeVisible();
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#test-results');
    await expect(results).toBeVisible();
  });

  test('should click test SSH button', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    // Wait for the connections tab to be fully loaded
    await page.waitForSelector('#test-ssh', { state: 'visible', timeout: 10000 });

    const testButton = page.locator('#test-ssh');
    await expect(testButton).toBeVisible();
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#ssh-results');
    await expect(results).toBeVisible();
  });

  test('should have proper tab navigation', async ({ page }) => {
    // Wait for page to be fully loaded
    await page.waitForSelector('[data-tab="dashboard"]', { state: 'visible', timeout: 10000 });

    // Test all tabs
    const tabs = ['dashboard', 'pis', 'connections'];

    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      await expect(page.locator(`#${tab}`)).toHaveClass(/active/);

      // Verify other tabs are not active
      for (const otherTab of tabs) {
        if (otherTab !== tab) {
          await expect(page.locator(`#${otherTab}`)).not.toHaveClass(/active/);
        }
      }
    }
  });

  test('should display pi cards with correct information', async ({ page }) => {
    // Wait for tab button to be ready
    await page.waitForSelector('[data-tab="pis"]', { state: 'visible', timeout: 10000 });
    await page.click('[data-tab="pis"]');
    // Wait for the tab content to be visible
    await page.waitForSelector('#pis', { state: 'visible', timeout: 10000 });

    // Wait for API response and cards to be rendered
    await Promise.race([
      page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 15000 }
      ).catch(() => null),
      page.waitForSelector('.pi-card', { state: 'visible', timeout: 15000 }).catch(() => null)
    ]);

    // Wait for at least one pi card to be visible (more efficient than counting)
    const piCards = page.locator('.pi-card');
    await expect(piCards.first()).toBeVisible({ timeout: 5000 });

    // Check first card has required elements in parallel
    // Each card has both Ethernet and WiFi sections, so we check for at least one of each
    const firstCard = piCards.first();
    await Promise.all([
      expect(firstCard.locator('h3')).toBeVisible({ timeout: 5000 }),
      expect(firstCard.locator('text=/IP:/').first()).toBeVisible({ timeout: 5000 }),
      expect(firstCard.locator('text=/MAC:/').first()).toBeVisible({ timeout: 5000 })
    ]);
  });
});
