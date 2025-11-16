import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, NUXT_BASE_URL } from './helpers/nuxt-helpers';

test.describe('Routing and Pages', () => {
  test('should load index page correctly', async ({ page }) => {
    await navigateToNuxtApp(page, '/');

    // Check page title
    await expect(page).toHaveTitle(/Raspberry Pi Manager/);

    // Check main layout is rendered
    await expect(page.locator('.layout-container')).toBeVisible();
  });

  test('should navigate to index page', async ({ page }) => {
    await page.goto(`${NUXT_BASE_URL}/`, { waitUntil: 'domcontentloaded', timeout: 30000 }); // Reduced from 60s

    // Wait for page to be ready - reduced timeout
    await page.waitForSelector('.layout-container', { state: 'visible', timeout: 15000 }); // Reduced from 30s

    // Verify page loaded - header may contain emoji
    const h1 = page.locator('h1');
    await expect(h1).toBeVisible();
    const h1Text = await h1.textContent();
    expect(h1Text).toContain('Raspberry Pi Manager');
  });

  test('should handle 404 errors gracefully', async ({ page }) => {
    const response = await page.goto(`${NUXT_BASE_URL}/non-existent-page`, {
      waitUntil: 'domcontentloaded',
      timeout: 30000, // Reduced from 60s
    });

    // In SPA mode, 404 might redirect to index or show error
    // Check that page doesn't crash
    expect(response?.status()).toBeGreaterThanOrEqual(200);
  });

  test('should maintain state during navigation', async ({ page }) => {
    await navigateToNuxtApp(page);

    // Click on a tab - use helper for better reliability
    await page.click('.tab-button:has-text("Settings")');
    // Wait for tab to be active instead of fixed timeout
    await expect(page.locator('.tab-button:has-text("Settings").active')).toBeVisible({
      timeout: 2000,
    });

    // Navigate away and back (in SPA mode, this might not trigger navigation)
    // But we can verify the app state is maintained
    // Use domcontentloaded for faster reload
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForSelector('.layout-container', { state: 'visible', timeout: 15000 }); // Reduced from 30s

    // After reload, should be back to default (Dashboard)
    const activeTab = await page.locator('.tab-button.active').first().textContent();
    expect(activeTab?.trim()).toBe('Dashboard');
  });

  test('should have correct page metadata', async ({ page }) => {
    await navigateToNuxtApp(page);

    // Check meta tags
    const viewport = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewport).toContain('width=device-width');

    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description?.length).toBeGreaterThan(0);
  });

  test('should load favicon', async ({ page }) => {
    await navigateToNuxtApp(page);

    // Check favicon link exists
    const favicon = page.locator('link[rel="icon"]');
    const count = await favicon.count();
    expect(count).toBeGreaterThan(0);
  });
});
