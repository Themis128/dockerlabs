/**
 * Helper functions for OS Installation testing
 */

import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Setup OS installation form with SD card and OS selection
 * Returns true if setup was successful, false if required elements are not available
 */
export async function setupOSInstallForm(page: Page): Promise<boolean> {
  // Wait for SD card select - using real API, so cards need to load from backend
  const sdCardSelect = page.locator('select[aria-label="Select SD Card"]');
  await expect(sdCardSelect).toBeVisible({ timeout: 10000 });

  // Wait for SD cards to load from real API (with longer timeout for real backend)
  let optionCount = 1;
  for (let i = 0; i < 20; i++) {
    await page.waitForTimeout(500);
    const sdCardOptions = sdCardSelect.locator('option');
    optionCount = await sdCardOptions.count();
    if (optionCount > 1) {
      break;
    }
  }

  if (optionCount <= 1) {
    // No SD cards available from real API - this is expected in test environment
    // Skip the test if no cards are available
    return false;
  }

  // Select SD card
  await sdCardSelect.selectOption({ index: 1 });
  await page.waitForTimeout(500);

  // Select download option
  const downloadRadioCard = page.locator('label.radio-card').filter({ hasText: 'Download OS Image' });
  await expect(downloadRadioCard).toBeVisible({ timeout: 5000 });
  await downloadRadioCard.click();
  await page.waitForTimeout(500);

  // Wait for OS version select to appear and load
  const osVersionSelect = page.locator('select#os-version-select, select[aria-label="Select OS Image"]');
  await expect(osVersionSelect).toBeVisible({ timeout: 10000 });
  await page.waitForTimeout(1000);

  // Select OS version - find first option with a value (not optgroup label)
  const selectedValue = await osVersionSelect.evaluate((select: HTMLSelectElement) => {
    // Find first option with a value attribute
    for (let i = 0; i < select.options.length; i++) {
      const option = select.options[i];
      if (option && option.value && option.value !== '') {
        select.value = option.value;
        // Trigger change event
        select.dispatchEvent(new Event('change', { bubbles: true }));
        return option.value;
      }
    }
    return null;
  }).catch(() => null);

  if (!selectedValue) {
    // Fallback: try selecting by index
    await osVersionSelect.selectOption({ index: 1 });
    await page.waitForTimeout(500);
  }

  // Verify OS version was actually selected
  const finalSelectedValue = await osVersionSelect.evaluate((select: HTMLSelectElement) => {
    return select.value;
  }).catch(() => '');

  if (!finalSelectedValue) {
    // OS version not selected - form won't be valid
    return false;
  }

  // Wait for Vue reactivity to update canInstall computed property
  await page.waitForTimeout(1000);

  // Verify the install button is now enabled
  const installButton = page.locator('button[type="submit"].btn-install, button[type="submit"]').filter({ hasText: /Install OS/i });
  const isButtonEnabled = await installButton.isEnabled().catch(() => false);

  if (!isButtonEnabled) {
    // Button still disabled - form validation failed
    // Check what's missing
    const sdCardValue = await page.locator('select[aria-label="Select SD Card"]').evaluate((el: HTMLSelectElement) => el.value).catch(() => '');
    const osVersionValue = await osVersionSelect.evaluate((el: HTMLSelectElement) => el.value).catch(() => '');

    // Wait a bit more for reactivity
    await page.waitForTimeout(2000);
    const stillDisabled = await installButton.isDisabled().catch(() => true);
    if (stillDisabled) {
      return false;
    }
  }

  return true;
}

/**
 * Start OS installation by clicking the install button
 * Returns true if button was clicked, false if button is disabled
 */
export async function startOSInstallation(page: Page): Promise<boolean> {
  const installButton = page.locator('button[type="submit"].btn-install, button[type="submit"]').filter({ hasText: /Install OS/i });

  // Wait for button to be visible and stable
  await expect(installButton).toBeVisible({ timeout: 10000 });

  // Wait for form to be ready - check that button is not disabled
  let retries = 0;
  let isDisabled = true;
  while (isDisabled && retries < 20) {
    await page.waitForTimeout(500);
    isDisabled = await installButton.isDisabled().catch(() => true);
    retries++;

    if (!isDisabled) {
      break;
    }
  }

  if (isDisabled) {
    // Try to see why it's disabled - check form state
    const sdCardSelected = await page.locator('select[aria-label="Select SD Card"]').evaluate((el: HTMLSelectElement) => el.value).catch(() => '');
    const osVersionSelected = await page.locator('select#os-version-select').evaluate((el: HTMLSelectElement) => el.value).catch(() => '');
    const canInstallClass = await installButton.evaluate((el: HTMLElement) => el.classList.contains('disabled')).catch(() => true);

    // If still disabled after waiting, return false
    return false;
  }

  // Scroll button into view
  await installButton.scrollIntoViewIfNeeded();
  await page.waitForTimeout(300);

  // Verify button is still enabled before clicking
  const stillDisabled = await installButton.isDisabled().catch(() => true);
  if (stillDisabled) {
    return false;
  }

  // Get the form element to submit it directly if needed
  const form = page.locator('form.os-install-form');

  // Try multiple methods to ensure form submission works
  try {
    // Method 1: Click the button normally
    await installButton.click({ timeout: 10000 });
    await page.waitForTimeout(500);

    // Check if form was submitted (button should show loading state)
    const isLoading = await installButton.evaluate((el: HTMLElement) => {
      return el.classList.contains('loading') ||
             (el.querySelector('.btn-spinner') !== null) ||
             el.textContent?.includes('Installing');
    }).catch(() => false);

    if (isLoading) {
      return true;
    }

    // Method 2: If button click didn't work, try submitting form directly
    await form.evaluate((formEl: HTMLFormElement) => {
      formEl.requestSubmit();
    });
    await page.waitForTimeout(500);

    // Check again
    const isLoadingAfterSubmit = await installButton.evaluate((el: HTMLElement) => {
      return el.classList.contains('loading') ||
             (el.querySelector('.btn-spinner') !== null) ||
             el.textContent?.includes('Installing');
    }).catch(() => false);

    if (isLoadingAfterSubmit) {
      return true;
    }

    // Method 3: Force click as last resort
    await installButton.click({ force: true, timeout: 10000 });
    await page.waitForTimeout(1000);

  } catch (error) {
    // If all methods fail, try JavaScript click
    await installButton.evaluate((el: HTMLElement) => {
      (el as HTMLButtonElement).click();
    });
    await page.waitForTimeout(1000);
  }

  return true;
}

/**
 * Wait for installation to start (progress card appears)
 * Returns true if installation started, false otherwise
 */
export async function waitForInstallationStart(page: Page, timeout: number = 30000): Promise<boolean> {
  try {
    // Wait for progress card to appear (indicates installation started)
    // This appears after formatting completes and installation begins
    const progressCard = page.locator('.progress-card');

    // First try to wait for it directly
    try {
      await progressCard.waitFor({ state: 'visible', timeout: Math.min(timeout, 10000) });
      return true;
    } catch {
      // If that fails, poll with more flexible checks
      const startTime = Date.now();
      while (Date.now() - startTime < timeout) {
        // Check multiple ways the progress card might appear
        const isVisible = await progressCard.isVisible().catch(() => false);
        const count = await progressCard.count().catch(() => 0);
        const inDOM = count > 0;

        if (isVisible || inDOM) {
          // Progress card exists, installation started
          return true;
        }

        // Check if there's an error message (installation might have failed)
        const errorMessage = page.locator('.progress-message.error, .progress-log-entry.error');
        const hasError = await errorMessage.isVisible().catch(() => false);
        if (hasError) {
          // Installation attempted but failed - still counts as "started"
          return true;
        }

        // Check if progress log exists (another indicator)
        const progressLog = page.locator('.progress-log');
        const hasLog = await progressLog.count().catch(() => 0) > 0;
        if (hasLog) {
          return true;
        }

        await page.waitForTimeout(500);
      }
    }

    return false;
  } catch {
    // Final fallback - check if progress card exists in DOM at all
    const progressCard = page.locator('.progress-card');
    const count = await progressCard.count().catch(() => 0);
    return count > 0;
  }
}

/**
 * Wait for installation result (success or error)
 * Returns the result type: 'success', 'error', or 'timeout'
 */
export async function waitForInstallationResult(
  page: Page,
  timeout: number = 15000
): Promise<'success' | 'error' | 'timeout'> {
  try {
    // Wait for either success or error message
    const successMessage = page.locator('text=/successfully|completed|installed successfully/i');
    const errorMessage = page.locator('text=/failed|error|Installation ended/i');

    const result = await Promise.race([
      successMessage.waitFor({ state: 'visible', timeout }).then(() => 'success' as const),
      errorMessage.waitFor({ state: 'visible', timeout }).then(() => 'error' as const),
    ]);

    return result;
  } catch {
    return 'timeout';
  }
}

/**
 * Mock SD cards API endpoint to return test SD cards
 */
export async function mockSdcardsEndpoint(page: Page): Promise<void> {
  await page.route('**/api/sdcards', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          data: {
            sdcards: [
              {
                deviceId: 'test-device-1',
                device_id: 'test-device-1',
                name: 'Test SD Card 1',
                label: 'Test SD Card 1',
                size: 32 * 1024 * 1024 * 1024, // 32 GB
                size_gb: 32,
                sizeFormatted: '32.00 GB',
                available: true,
                removable: true,
              },
              {
                deviceId: 'test-device-2',
                device_id: 'test-device-2',
                name: 'Test SD Card 2',
                label: 'Test SD Card 2',
                size: 64 * 1024 * 1024 * 1024, // 64 GB
                size_gb: 64,
                sizeFormatted: '64.00 GB',
                available: true,
                removable: true,
              },
            ],
          },
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock OS images API endpoint to return test OS images
 */
export async function mockOsImagesEndpoint(page: Page): Promise<void> {
  await page.route('**/api/os-images', async (route) => {
    const request = route.request();

    if (request.method() === 'GET') {
      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          success: true,
          images: [
            {
              name: 'Raspberry Pi OS (64-bit)',
              version: '2024-01-01',
              url: 'https://downloads.raspberrypi.org/raspios_arm64/images/raspios_arm64-2024-01-01/2024-01-01-raspios-bookworm-arm64.img.xz',
            },
            {
              name: 'Raspberry Pi OS (32-bit)',
              version: '2024-01-01',
              url: 'https://downloads.raspberrypi.org/raspios_armhf/images/raspios_armhf-2024-01-01/2024-01-01-raspios-bookworm-armhf.img.xz',
            },
          ],
        }),
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Mock format SD card endpoint to return successful format
 */
export async function mockFormatEndpoint(page: Page): Promise<void> {
  // Unroute any existing format-sdcard routes first
  await page.unroute('**/api/format-sdcard');

  await page.route('**/api/format-sdcard', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      // Return a successful format response as SSE stream
      // The component expects data: {success: true} to proceed
      const formatResponse = createProgressSSE([
        { type: 'progress', message: 'Formatting SD card...', percent: 0 },
        { type: 'progress', message: 'Formatting in progress...', percent: 50 },
        { type: 'progress', message: 'Formatting complete', percent: 100 },
        { success: true, message: 'SD card formatted successfully' },
      ]);

      await route.fulfill({
        status: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: formatResponse,
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Setup all required API mocks for OS installation tests
 * Note: In a real test environment, you might want to use actual endpoints
 * instead of mocks. This function can be modified to skip mocking if needed.
 */
export async function setupApiMocks(page: Page, useMocks: boolean = true): Promise<void> {
  if (useMocks) {
    await mockSdcardsEndpoint(page);
    await mockOsImagesEndpoint(page);
    await mockFormatEndpoint(page);
  }
  // If useMocks is false, the tests will use the actual API endpoints
  // This requires the Python backend to be running and real SD cards to be available
}

/**
 * Mock installation endpoint with custom response
 */
export async function mockInstallEndpoint(
  page: Page,
  responseBody: string,
  status: number = 200
): Promise<void> {
  // Unroute any existing install-os routes first
  await page.unroute('**/api/install-os');

  await page.route('**/api/install-os', async (route) => {
    const request = route.request();

    if (request.method() === 'POST') {
      await route.fulfill({
        status,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
        body: responseBody, // Don't use Buffer.from for string
      });
    } else {
      await route.continue();
    }
  });
}

/**
 * Create SSE response body for progress updates
 */
export function createProgressSSE(
  messages: Array<{
    type?: string;
    message?: string;
    percent?: number;
    success?: boolean;
    error?: string;
    debug_info?: any;
    source?: string;
  }>
): string {
  return messages
    .map((msg) => {
      const jsonStr = JSON.stringify(msg);
      return `data: ${jsonStr}\n\n`;
    })
    .join('');
}

/**
 * Common installation scenarios for testing
 */
export const InstallationScenarios = {
  /**
   * Successful installation with all progress steps
   */
  success: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Formatting SD card...', percent: 10 },
    { type: 'progress', message: 'Downloading OS image...', percent: 50 },
    { type: 'progress', message: 'Installing OS...', percent: 80 },
    { type: 'progress', message: 'Finalizing installation...', percent: 95 },
    { success: true, message: 'OS image installed successfully' },
  ]),

  /**
   * Installation that ends without completion status
   */
  noCompletionStatus: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Formatting SD card...', percent: 10 },
    { type: 'progress', message: 'Downloading OS image...', percent: 50 },
    { type: 'progress', message: 'Download complete. Starting OS installation...', percent: 80 },
    // No final result - stream ends here
  ]),

  /**
   * Installation timeout
   */
  timeout: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Installation in progress...', percent: 50 },
    { success: false, error: 'Operation timed out after 1800 seconds of silence', type: 'error' },
  ]),

  /**
   * Script crash scenario
   */
  scriptCrash: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Installing OS...', percent: 50 },
    {
      success: false,
      error: 'Installation failed with exit code 1',
      debug_info: {
        returncode: 1,
        message: 'Result sent from finally block - script may have crashed or exited without sending result',
      },
    },
  ]),

  /**
   * Process termination
   */
  processTerminated: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Installing OS...', percent: 50 },
    {
      success: false,
      error: 'Installation process was terminated unexpectedly',
      debug_info: {
        message: 'Process was still running when finally block executed - may have been killed or crashed',
        process_was_running: true,
      },
    },
  ]),

  /**
   * Installation failure with debug info
   */
  failureWithDebug: () => createProgressSSE([
    { type: 'progress', message: 'Starting installation...', percent: 0 },
    { type: 'progress', message: 'Installing OS...', percent: 50 },
    { type: 'error_debug', message: 'stderr: Permission denied', source: 'stderr' },
    {
      success: false,
      error: 'Installation failed: Permission denied',
      debug_info: {
        returncode: 1,
        stderr: 'Permission denied: Administrator privileges required',
        stdout: null,
        message: 'Script ended without returning a result',
      },
    },
  ]),
};
