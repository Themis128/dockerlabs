import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, clickTab } from './helpers/nuxt-helpers';
import { waitForElementStable, isElementVisible } from './helpers/page-helpers';

test.describe('Component Rendering', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNuxtApp(page);
  });

  test('should render DashboardTab component', async ({ page }) => {
    // Dashboard should be active by default
    await clickTab(page, 'Dashboard');

    // Wait for main content area
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    // DashboardTab should be rendered (check for common dashboard elements)
    // Note: Actual selectors depend on DashboardTab implementation
    await page.waitForTimeout(500); // Allow component to render
  });

  test('should render PisTab component', async ({ page }) => {
    await clickTab(page, 'Raspberry Pis');

    // Wait for tab to be active
    await page.waitForSelector('.tab-button:has-text("Raspberry Pis").active', { timeout: 10000 });

    // PisTab should be rendered
    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500); // Allow component to render
  });

  test('should render SdcardTab component', async ({ page }) => {
    await clickTab(page, 'SD Card');

    await page.waitForSelector('.tab-button:has-text("SD Card").active', { timeout: 10000 });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
  });

  test('should render OsInstallTab component', async ({ page }) => {
    await clickTab(page, 'OS Install');

    await page.waitForSelector('.tab-button:has-text("OS Install").active', { timeout: 10000 });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
  });

  test('should render SettingsTab component', async ({ page }) => {
    await clickTab(page, 'Settings');

    await page.waitForSelector('.tab-button:has-text("Settings").active', { timeout: 10000 });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    // Check for SettingsTab specific elements
    await expect(page.locator('h2:has-text("Pi Configuration")')).toBeVisible();
    await expect(page.locator('.settings-tab')).toBeVisible();
  });

  test('SettingsTab should show Pi selection dropdown', async ({ page }) => {
    await clickTab(page, 'Settings');

    // Wait for settings tab to load
    await page.waitForSelector('.settings-tab', { timeout: 10000 });

    // Check for Pi selection dropdown
    const piSelect = page.locator('select').first();
    await expect(piSelect).toBeVisible();
  });

  test('SettingsTab should show form when Pi is selected', async ({ page }) => {
    await clickTab(page, 'Settings');

    await page.waitForSelector('.settings-tab', { timeout: 10000 });

    // Select a Pi from dropdown if available
    const piSelect = page.locator('select').first();
    const optionCount = await piSelect.locator('option').count();

    if (optionCount > 1) {
      // Select first Pi (skip "-- Select Pi --" option)
      await piSelect.selectOption({ index: 1 });

      // Wait for form to appear
      await page.waitForSelector('.settings-form', { timeout: 5000 });

      // Check for form sections
      await expect(page.locator('h3:has-text("System Settings")')).toBeVisible();
      await expect(page.locator('h3:has-text("SSH Settings")')).toBeVisible();
      await expect(page.locator('h3:has-text("WiFi Settings")')).toBeVisible();
    } else {
      // If no Pis available, check for "no selection" message
      await expect(page.locator('.no-selection-message')).toBeVisible();
    }
  });

  test('SettingsTab should have WiFi scan button', async ({ page }) => {
    await clickTab(page, 'Settings');

    await page.waitForSelector('.settings-tab', { timeout: 10000 });

    // Check for WiFi scan button - it contains "Scan" text (may have emoji)
    const scanButton = page.locator('button').filter({ hasText: /Scan/i });
    await expect(scanButton).toBeVisible({ timeout: 10000 });
  });

  test('should render ConnectionsTab component', async ({ page }) => {
    await clickTab(page, 'Test Connections');

    await page.waitForSelector('.tab-button:has-text("Test Connections").active', { timeout: 10000 });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
  });

  test('should render RemoteTab component', async ({ page }) => {
    await clickTab(page, 'Remote Connection');

    await page.waitForSelector('.tab-button:has-text("Remote Connection").active', { timeout: 10000 });

    const main = page.locator('main');
    await expect(main).toBeVisible({ timeout: 10000 });

    await page.waitForTimeout(500);
  });

  test('should only show one tab content at a time', async ({ page }) => {
    // Start on Dashboard
    await clickTab(page, 'Dashboard');
    await page.waitForTimeout(300);

    // Switch to another tab
    await clickTab(page, 'Raspberry Pis');
    await page.waitForTimeout(300);

    // Verify only one tab is active
    const activeTabs = page.locator('.tab-button.active');
    const count = await activeTabs.count();
    expect(count).toBe(1);
  });
});
