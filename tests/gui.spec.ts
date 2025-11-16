import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('Raspberry Pi Manager GUI', () => {
  test.beforeEach(async ({ page }) => {
    // Use load for faster page loads - waits for load event
    await page.goto(BASE_URL, { waitUntil: 'load', timeout: 30000 });
    // Wait for h1 to be visible - ensures page is loaded
    await page.waitForSelector('h1', { state: 'visible', timeout: 5000 });
    // Small wait to ensure JavaScript is initialized
    await page.waitForLoadState('networkidle', { timeout: 5000 }).catch(() => null);
  });

  test('should load the homepage', async ({ page }) => {
    // h1 is already visible from beforeEach, just check text
    await expect(page.locator('h1')).toContainText('Raspberry Pi Manager', { timeout: 2000 });
  });

  test('should display dashboard tab by default', async ({ page }) => {
    const dashboardTab = page.locator('#dashboard');
    await Promise.all([
      expect(dashboardTab).toBeVisible({ timeout: 2000 }),
      expect(dashboardTab).toHaveClass(/active/, { timeout: 2000 })
    ]);
  });

  test('should switch to Raspberry Pis tab', async ({ page }) => {
    await page.click('[data-tab="pis"]');
    await Promise.all([
      expect(page.locator('#pis')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#pis')).toHaveClass(/active/, { timeout: 2000 }),
      expect(page.locator('#dashboard')).not.toHaveClass(/active/, { timeout: 2000 })
    ]);
  });

  test('should switch to Test Connections tab', async ({ page }) => {
    await page.click('[data-tab="connections"]');
    await Promise.all([
      expect(page.locator('#connections')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#connections')).toHaveClass(/active/, { timeout: 2000 })
    ]);
  });

  test('should load Raspberry Pi list from API', async ({ page }) => {
    // Click tab and wait for API response in parallel, but don't block on API
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 3000 }
      ).catch(() => null),
      page.click('[data-tab="pis"]')
    ]);

    // Check if pi-list is visible (may show loading or content)
    const piList = page.locator('#pi-list');
    await expect(piList).toBeVisible({ timeout: 2000 });
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
    await page.click('[data-tab="pis"]');
    const refreshButton = page.locator('#refresh-pis');
    await Promise.all([
      expect(refreshButton).toBeVisible({ timeout: 2000 }),
      expect(refreshButton).toContainText('Refresh List', { timeout: 2000 })
    ]);
  });

  test('should display test connections section', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    // Check all elements in parallel with shorter timeout
    await Promise.all([
      expect(page.locator('h3:has-text("Test All Connections")')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#test-all')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#test-results')).toBeVisible({ timeout: 2000 })
    ]);
  });

  test('should display SSH test section', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    // Check all SSH section elements in parallel with shorter timeout
    await Promise.all([
      expect(page.locator('h3:has-text("Test SSH Authentication")')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#pi-select')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#test-ssh')).toBeVisible({ timeout: 2000 }),
      expect(page.locator('#ssh-results')).toBeVisible({ timeout: 2000 })
    ]);
  });

  test('should have Pi selection dropdown with options', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    const select = page.locator('#pi-select');
    await expect(select).toBeVisible({ timeout: 2000 });

    const options = select.locator('option');
    await Promise.all([
      expect(options).toHaveCount(2, { timeout: 2000 }),
      expect(options.nth(0)).toContainText('Pi 1', { timeout: 2000 }),
      expect(options.nth(1)).toContainText('Pi 2', { timeout: 2000 })
    ]);
  });

  test('should click test all connections button', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    const testButton = page.locator('#test-all');
    await expect(testButton).toBeVisible({ timeout: 2000 });
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#test-results');
    await expect(results).toBeVisible({ timeout: 2000 });
  });

  test('should click test SSH button', async ({ page }) => {
    await page.click('[data-tab="connections"]');

    const testButton = page.locator('#test-ssh');
    await expect(testButton).toBeVisible({ timeout: 2000 });
    await testButton.click();

    // Should show loading or results
    const results = page.locator('#ssh-results');
    await expect(results).toBeVisible({ timeout: 2000 });
  });

  test('should have proper tab navigation', async ({ page }) => {
    // Test all tabs
    const tabs = ['dashboard', 'pis', 'connections'];

    for (const tab of tabs) {
      await page.click(`[data-tab="${tab}"]`);
      await expect(page.locator(`#${tab}`)).toHaveClass(/active/, { timeout: 2000 });

      // Verify other tabs are not active in parallel
      const otherTabs = tabs.filter(t => t !== tab);
      await Promise.all(
        otherTabs.map(otherTab =>
          expect(page.locator(`#${otherTab}`)).not.toHaveClass(/active/, { timeout: 2000 })
        )
      );
    }
  });

  test('should display pi cards with correct information', async ({ page }) => {
    // Click tab and wait for API response in parallel
    await Promise.all([
      page.waitForResponse(response =>
        response.url().includes('/api/pis') && response.status() === 200,
        { timeout: 5000 }
      ).catch(() => null),
      page.click('[data-tab="pis"]')
    ]);

    // Wait for at least one pi card to be visible (give more time for rendering)
    const piCards = page.locator('.pi-card');
    await expect(piCards.first()).toBeVisible({ timeout: 5000 });

    // Check first card has required elements in parallel
    const firstCard = piCards.first();
    await Promise.all([
      expect(firstCard.locator('h3')).toBeVisible({ timeout: 2000 }),
      expect(firstCard.locator('text=/IP:/').first()).toBeVisible({ timeout: 2000 }),
      expect(firstCard.locator('text=/MAC:/').first()).toBeVisible({ timeout: 2000 })
    ]);
  });
});
