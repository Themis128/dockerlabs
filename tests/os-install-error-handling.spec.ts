import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, clickTab } from './helpers/nuxt-helpers';
import {
  setupOSInstallForm,
  startOSInstallation,
  waitForInstallationStart,
  waitForInstallationResult,
  mockInstallEndpoint,
  mockFormatEndpoint,
  InstallationScenarios,
} from './helpers/os-install-helpers';

/**
 * Comprehensive tests for OS Installation error handling
 * Tests the new implementations that ensure final results are always sent
 * even when the installation process crashes, times out, or is interrupted.
 */
test.describe('OS Installation - Error Handling', () => {
  test.beforeEach(async ({ page }) => {
    // Use actual API endpoints for SD cards and OS images (real backend)
    // Mock format endpoint for safety (formatting real SD cards in tests is dangerous)
    // Only the install-os endpoint will be mocked per test for error scenarios
    await mockFormatEndpoint(page);

    // Capture console errors for debugging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log(`[Browser Console Error] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.log(`[Page Error] ${error.message}`);
    });

    await navigateToNuxtApp(page);
    await clickTab(page, 'OS Install');

    // Wait for OS Install tab to be ready
    const osInstallHeader = page.locator('.os-install-header h2');
    await expect(osInstallHeader).toBeVisible({ timeout: 10000 });

    // Wait a bit for the tab to fully load and SD cards to load from real API
    await page.waitForTimeout(2000);
  });

  test('should handle installation that ends without completion status', async ({ page }) => {
    // Setup form using real API endpoints (no mocks for SD cards/OS images)
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Only mock the install-os endpoint to simulate a stream that ends without a final result
    // This is needed to test the error handling scenario
    await mockInstallEndpoint(page, InstallationScenarios.noCompletionStatus());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for error to appear - can be in progress message or log
    // The error message appears when stream ends without completion
    // Wait up to 30 seconds for the error to appear (stream needs to end)
    let errorFound = false;

    try {
      const errorMessage = page.locator('.progress-message.error, .progress-log-entry.error').filter({
        hasText: /Installation ended without completion status|server may have disconnected|process was interrupted|ended unexpectedly/i
      });
      await expect(errorMessage.first()).toBeVisible({ timeout: 30000 });
      errorFound = true;
    } catch {
      // Try checking the progress log
      const progressLog = page.locator('.progress-log');
      if (await progressLog.isVisible().catch(() => false)) {
        const logText = await progressLog.textContent().catch(() => '') || '';
        if (logText.toLowerCase().match(/installation ended|without completion|disconnected|interrupted/i)) {
          errorFound = true;
        }
      }

      // Try checking progress message
      if (!errorFound) {
        const progressMsg = page.locator('.progress-message');
        if (await progressMsg.isVisible().catch(() => false)) {
          const msgText = await progressMsg.textContent().catch(() => '') || '';
          if (msgText.toLowerCase().match(/installation ended|without completion|disconnected|interrupted|error/i)) {
            errorFound = true;
          }
        }
      }
    }

    expect(errorFound).toBe(true);

    // Verify detailed error message is shown in log
    const progressLog = page.locator('.progress-log');
    const logVisible = await progressLog.isVisible().catch(() => false);
    if (logVisible) {
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toContain('installation');
    }
  });

  test('should handle installation timeout scenario', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock install-os endpoint to simulate timeout scenario
    await mockInstallEndpoint(page, InstallationScenarios.timeout());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for timeout error message - can be in progress message or log
    const timeoutError = page.locator('.progress-message.error, .progress-log-entry.error, .progress-log').filter({
      hasText: /timed out|timeout|Operation timed out/i
    });

    // Wait for error with fallback checks
    try {
      await expect(timeoutError.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check if error is in log text
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/timed out|timeout|Operation timed out/i);
    }
  });

  test('should handle installation script crash scenario', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock install-os endpoint to simulate script crash scenario
    await mockInstallEndpoint(page, InstallationScenarios.scriptCrash());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for error message with debug info
    const errorMessage = page.locator('.progress-message.error, .progress-log-entry.error, .progress-log').filter({
      hasText: /Installation failed|exit code/i
    });

    try {
      await expect(errorMessage.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check log directly
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/installation failed|exit code/i);
    }

    // Verify debug information is available in log
    const progressLog = page.locator('.progress-log');
    const logText = await progressLog.textContent().catch(() => '') || '';
    expect(logText.toLowerCase()).toMatch(/debug|returncode|finally block/i);
  });

  test('should handle connection loss during installation', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock connection loss by aborting the install-os request
    await page.route('**/api/install-os', async (route) => {
      const request = route.request();
      if (request.method() === 'POST') {
        await route.abort('failed');
      } else {
        await route.continue();
      }
    });

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for connection error - can be in progress message or log
    const connectionError = page.locator('.progress-message.error, .progress-log-entry.error, .progress-log').filter({
      hasText: /connection|failed|error|Failed to connect/i
    });

    try {
      await expect(connectionError.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check log directly
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/connection|failed|error|Failed to connect/i);
    }
  });

  test('should handle successful installation with final result', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock install-os endpoint to simulate successful installation
    // In a real scenario, this would use the actual endpoint
    await mockInstallEndpoint(page, InstallationScenarios.success());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for success message - can be in progress message or log
    const successMessage = page.locator('.progress-message, .progress-log-entry.success, .progress-log').filter({
      hasText: /successfully|completed|installed successfully|OS installation completed/i
    });

    try {
      await expect(successMessage.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check log directly
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/successfully|completed|installed successfully|OS installation completed/i);
    }

    // Verify progress reached high percentage
    const progressBar = page.locator('.progress-bar');
    await expect(progressBar).toBeVisible({ timeout: 5000 });

    // Check progress percentage from the progress card
    const progressPercent = page.locator('.progress-percent');
    const percentText = await progressPercent.textContent().catch(() => '0') || '0';
    const percentValue = parseInt(percentText.replace('%', '')) || 0;
    expect(percentValue).toBeGreaterThanOrEqual(90);
  });

  test('should display detailed error information when installation fails', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock install-os endpoint to simulate failure with debug info
    await mockInstallEndpoint(page, InstallationScenarios.failureWithDebug());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for error message
    const errorMessage = page.locator('.progress-message.error, .progress-log-entry.error, .progress-log').filter({
      hasText: /Installation failed|Permission denied/i
    });

    try {
      await expect(errorMessage.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check log directly
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/installation failed|Permission denied/i);
    }

    // Verify detailed log shows error information
    const progressLog = page.locator('.progress-log');
    await expect(progressLog).toBeVisible({ timeout: 5000 });

    const logText = await progressLog.textContent().catch(() => '') || '';
    expect(logText.toLowerCase()).toContain('error');
  });

  test('should handle process termination scenario', async ({ page }) => {
    // Setup form using real API endpoints
    const setupSuccess = await setupOSInstallForm(page);
    if (!setupSuccess) {
      test.skip();
      return;
    }

    // Mock install-os endpoint to simulate process termination
    await mockInstallEndpoint(page, InstallationScenarios.processTerminated());

    // Monitor network requests to verify format and install endpoints are called
    const formatRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/format-sdcard') && request.method() === 'POST'
    ).catch(() => null);

    const installRequestPromise = page.waitForRequest(request =>
      request.url().includes('/api/install-os') && request.method() === 'POST'
    ).catch(() => null);

    // Start installation
    const installStarted = await startOSInstallation(page);
    if (!installStarted) {
      test.skip();
      return;
    }

    // Wait for format request to be made (confirms button click worked)
    // Give it time to appear - format happens immediately after button click
    let formatRequest = await formatRequestPromise;
    if (!formatRequest) {
      // Wait a bit more for the request to be made
      try {
        formatRequest = await page.waitForRequest(
          request => request.url().includes('/api/format-sdcard') && request.method() === 'POST',
          { timeout: 10000 }
        );
      } catch {
        // Format request might not have been made - check if button is loading instead
        const buttonText = await page.locator('button.btn-install').textContent().catch(() => '') || '';
        const isLoading = buttonText.includes('Installing') ||
                         await page.locator('button.loading').isVisible().catch(() => false);
        if (!isLoading) {
          // Form didn't submit - check why
          const buttonDisabled = await page.locator('button.btn-install').isDisabled().catch(() => true);
          if (buttonDisabled) {
            throw new Error('Install button is disabled - form validation may have failed');
          }
          throw new Error('Format endpoint was not called and button is not loading');
        }
      }
    }

    // Wait for format to complete and install to start
    // The progress card appears when format/install starts (progress.status !== 'idle')
    // Wait a moment for the format to start processing
    await page.waitForTimeout(2000);

    // Wait for progress card to appear (appears when progress.status !== 'idle')
    const progressCard = page.locator('.progress-card');

    // Wait up to 40 seconds for progress card to appear (includes format + install start time)
    let cardExists = false;
    let hasProgress = false;

    for (let i = 0; i < 80; i++) {
      // Check for progress card
      cardExists = (await progressCard.count().catch(() => 0)) > 0;

      // Also check for progress message
      const progressMessage = page.locator('.progress-message');
      const hasProgressMsg = await progressMessage.isVisible().catch(() => false);

      // Check for progress log
      const progressLog = page.locator('.progress-log');
      const hasLog = await progressLog.count().catch(() => 0) > 0;

      // Check if button is in loading state (form was submitted)
      const loadingButton = page.locator('button.loading, .btn-install.loading');
      const buttonLoading = await loadingButton.isVisible().catch(() => false);

      hasProgress = cardExists || hasProgressMsg || hasLog || buttonLoading;

      if (hasProgress) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (!hasProgress) {
      // Check if there's an error instead
      const errorMsg = page.locator('.progress-message.error, .progress-log-entry.error, .error-message');
      const hasError = await errorMsg.isVisible().catch(() => false);
      if (!hasError) {
        // Installation didn't start - this is a test failure
        throw new Error('Installation did not start - no progress indication found');
      }
    }

    // Wait for termination error message
    const terminationError = page.locator('.progress-message.error, .progress-log-entry.error, .progress-log').filter({
      hasText: /terminated|killed|crashed|terminated unexpectedly/i
    });

    try {
      await expect(terminationError.first()).toBeVisible({ timeout: 30000 });
    } catch {
      // Check log directly
      const progressLog = page.locator('.progress-log');
      const logText = await progressLog.textContent().catch(() => '') || '';
      expect(logText.toLowerCase()).toMatch(/terminated|killed|crashed|terminated unexpectedly/i);
    }
  });
});
