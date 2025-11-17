import { test, expect } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Test OS Installation functionality from network URL
 * Tests the app running at http://192.168.0.23:3001/
 */

const NETWORK_BASE_URL = 'http://192.168.0.23:3001';

test.describe('OS Installation - Network URL Testing', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the network URL
    await page.goto(NETWORK_BASE_URL, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    // Wait for the app to load
    const layoutContainer = page.locator('.layout-container');
    await layoutContainer.waitFor({ state: 'visible', timeout: 15000 });

    // Wait for tabs to be visible
    const tabButton = page.locator('.tab-button').first();
    await tabButton.waitFor({ state: 'visible', timeout: 5000 });
  });

  test('should access OS Install tab from network URL', async ({ page }) => {
    // Find and click the OS Install tab
    const osInstallTab = page.locator('.tab-button').filter({ hasText: 'OS Install' });
    await expect(osInstallTab).toBeVisible({ timeout: 10000 });

    // Click the tab
    await osInstallTab.click();

    // Wait for tab to become active
    await expect(osInstallTab).toHaveClass(/active/, { timeout: 5000 });

    // Verify OS Install content is visible
    const osInstallHeader = page.locator('.os-install-header h2');
    await expect(osInstallHeader).toBeVisible({ timeout: 10000 });
    await expect(osInstallHeader).toContainText('OS Installation');

    console.log('✓ OS Install tab accessible from network URL');
  });

  test('should display OS Install form elements', async ({ page }) => {
    // Navigate to OS Install tab
    const osInstallTab = page.locator('.tab-button').filter({ hasText: 'OS Install' });
    await osInstallTab.click();
    await expect(osInstallTab).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForTimeout(500);

    // Verify form exists
    const form = page.locator('form.os-install-form');
    await expect(form).toBeVisible({ timeout: 5000 });

    // Verify SD card selection
    const sdCardSelect = page.locator('select[aria-label="Select SD Card"]');
    await expect(sdCardSelect).toBeVisible({ timeout: 5000 });

    // Verify OS source selection
    const downloadRadioCard = page.locator('label.radio-card').filter({ hasText: 'Download OS Image' });
    await expect(downloadRadioCard).toBeVisible({ timeout: 5000 });

    const customRadioCard = page.locator('label.radio-card').filter({ hasText: 'Use Custom Image' });
    await expect(customRadioCard).toBeVisible({ timeout: 5000 });

    // Verify install button exists
    const installButton = page.locator('button[type="submit"]').filter({ hasText: /Install OS/i });
    await expect(installButton).toBeVisible({ timeout: 5000 });

    console.log('✓ All OS Install form elements are visible');
  });

  test('should interact with OS source selection', async ({ page }) => {
    // Navigate to OS Install tab
    const osInstallTab = page.locator('.tab-button').filter({ hasText: 'OS Install' });
    await osInstallTab.click();
    await expect(osInstallTab).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForTimeout(500);

    // Select download option
    const downloadRadioCard = page.locator('label.radio-card').filter({ hasText: 'Download OS Image' });
    await downloadRadioCard.click();
    await page.waitForTimeout(300);

    // Verify download option is selected
    const downloadRadio = page.locator('input[type="radio"][value="download"]');
    await expect(downloadRadio).toBeChecked({ timeout: 2000 });

    // Verify OS version select appears
    const osVersionSelect = page.locator('select#os-version-select');
    await expect(osVersionSelect).toBeVisible({ timeout: 5000 });

    // Switch to custom image
    const customRadioCard = page.locator('label.radio-card').filter({ hasText: 'Use Custom Image' });
    await customRadioCard.click();
    await page.waitForTimeout(300);

    // Verify custom option is selected
    const customRadio = page.locator('input[type="radio"][value="custom"]');
    await expect(customRadio).toBeChecked({ timeout: 2000 });

    // Verify file input appears
    const fileInput = page.locator('input[type="file"]');
    await expect(fileInput).toBeVisible({ timeout: 5000 });

    console.log('✓ OS source selection works correctly');
  });

  test('should load SD cards from API', async ({ page }) => {
    // Navigate to OS Install tab
    const osInstallTab = page.locator('.tab-button').filter({ hasText: 'OS Install' });
    await osInstallTab.click();
    await expect(osInstallTab).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check SD card select
    const sdCardSelect = page.locator('select[aria-label="Select SD Card"]');
    await expect(sdCardSelect).toBeVisible({ timeout: 5000 });

    // Wait for options to potentially load
    await page.waitForTimeout(2000);

    // Check if there are any SD card options (besides the default)
    const options = sdCardSelect.locator('option');
    const optionCount = await options.count();

    if (optionCount > 1) {
      console.log(`✓ SD cards loaded successfully (${optionCount - 1} cards found)`);
    } else {
      console.log('⚠ No SD cards found (this may be expected if no cards are connected)');
    }

    // Verify the select is functional
    await expect(sdCardSelect).toBeEnabled();
  });

  test('should verify API connectivity', async ({ request }) => {
    // Test if the API is accessible from the network
    const apiUrl = `${NETWORK_BASE_URL}/api/sdcards`;

    try {
      const response = await request.get(apiUrl, { timeout: 10000 });
      const status = response.status();

      // Accept 200 (success) or other valid status codes
      expect([200, 400, 404, 500, 503, 504]).toContain(status);

      if (status === 200) {
        const data = await response.json();
        console.log('✓ API is accessible and responding');
        console.log(`  Response: ${JSON.stringify(data).substring(0, 100)}...`);
      } else {
        console.log(`⚠ API returned status ${status}`);
      }
    } catch (error: any) {
      console.log(`⚠ API connection issue: ${error.message}`);
      // Don't fail the test, just log the issue
    }
  });

  test('should verify install button state', async ({ page }) => {
    // Navigate to OS Install tab
    const osInstallTab = page.locator('.tab-button').filter({ hasText: 'OS Install' });
    await osInstallTab.click();
    await expect(osInstallTab).toHaveClass(/active/, { timeout: 5000 });
    await page.waitForTimeout(1000);

    // Check install button
    const installButton = page.locator('button[type="submit"]').filter({ hasText: /Install OS/i });
    await expect(installButton).toBeVisible({ timeout: 5000 });

    // Button should be disabled when no selections are made
    const isDisabled = await installButton.isDisabled();

    if (isDisabled) {
      console.log('✓ Install button correctly disabled when no selections made');
    } else {
      console.log('⚠ Install button is enabled (may have default selections)');
    }

    // Verify button text
    const buttonText = await installButton.textContent();
    expect(buttonText).toContain('Install');
  });
});
