import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, getActiveTab, clickTab, isTabActive } from './helpers/nuxt-helpers';

test.describe('Layout and Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNuxtApp(page);
  });

  test('should render default layout', async ({ page }) => {
    // Check layout container exists
    await expect(page.locator('.layout-container')).toBeVisible();
  });

  test('should display header with title and description', async ({ page }) => {
    // Check header exists
    const header = page.locator('header');
    await expect(header).toBeVisible();

    // Check title - may contain emoji
    const h1 = header.locator('h1');
    await expect(h1).toBeVisible();
    const titleText = await h1.textContent();
    expect(titleText).toContain('Raspberry Pi Manager');

    // Check description
    await expect(header.locator('p')).toContainText('Manage your Raspberry Pi devices');
  });

  test('should display tab navigation', async ({ page }) => {
    // Check tabs container exists
    const tabs = page.locator('.tabs');
    await expect(tabs).toBeVisible();

    // Check all tab buttons are present
    const expectedTabs = [
      'Dashboard',
      'Raspberry Pis',
      'SD Card',
      'OS Install',
      'Settings',
      'Test Connections',
      'Remote Connection',
    ];

    for (const tabLabel of expectedTabs) {
      const tab = page.locator(`.tab-button:has-text("${tabLabel}")`);
      await expect(tab).toBeVisible();
    }
  });

  test('should have Dashboard tab active by default', async ({ page }) => {
    const activeTab = await getActiveTab(page);
    expect(activeTab).toBe('Dashboard');
  });

  test('should switch tabs when clicking', async ({ page }) => {
    // Click on "Raspberry Pis" tab
    await clickTab(page, 'Raspberry Pis');
    expect(await isTabActive(page, 'Raspberry Pis')).toBe(true);
    expect(await isTabActive(page, 'Dashboard')).toBe(false);

    // Click on "SD Card" tab
    await clickTab(page, 'SD Card');
    expect(await isTabActive(page, 'SD Card')).toBe(true);
    expect(await isTabActive(page, 'Raspberry Pis')).toBe(false);

    // Click back to Dashboard
    await clickTab(page, 'Dashboard');
    expect(await isTabActive(page, 'Dashboard')).toBe(true);
  });

  test('should highlight active tab', async ({ page }) => {
    // Check Dashboard is active initially
    const dashboardTab = page.locator('.tab-button:has-text("Dashboard")');
    await expect(dashboardTab).toHaveClass(/active/);

    // Click another tab
    await clickTab(page, 'Settings');

    // Check Settings is now active
    const settingsTab = page.locator('.tab-button:has-text("Settings")');
    await expect(settingsTab).toHaveClass(/active/);

    // Check Dashboard is no longer active
    await expect(dashboardTab).not.toHaveClass(/active/);
  });

  test('should display footer', async ({ page }) => {
    const footer = page.locator('footer[role="contentinfo"]');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('Raspberry Pi Management System');
  });

  test('should have proper ARIA attributes on tabs', async ({ page }) => {
    const tabs = page.locator('.tabs');
    await expect(tabs).toHaveAttribute('aria-label', 'Main navigation');

    // Check tab buttons have aria-selected
    const dashboardTab = page.locator('.tab-button:has-text("Dashboard")');
    await expect(dashboardTab).toHaveAttribute('aria-selected', 'true');
  });
});
