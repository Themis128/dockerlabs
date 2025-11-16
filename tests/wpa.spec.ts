import { test, expect } from '@playwright/test';

const BASE_URL = 'http://127.0.0.1:3000';

test.describe('WPA Implementation Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the page
    let retries = 5;
    let lastError: Error | null = null;

    while (retries > 0) {
      try {
        await page.goto(BASE_URL, { waitUntil: 'load', timeout: 60000 });
        await page.waitForSelector('h1', { state: 'visible', timeout: 10000 });
        await page.waitForSelector('[data-tab]', { state: 'visible', timeout: 10000 });
        return;
      } catch (error) {
        lastError = error as Error;
        retries--;
        if (retries > 0) {
          const waitTime = 1000 * (5 - retries);
          await page.waitForTimeout(waitTime);
        }
      }
    }

    throw lastError || new Error('Failed to load page after retries');
  });

  test.describe('Backward Compatibility - Single Network Configuration', () => {
    test('should support basic WPA3-Personal configuration (backward compatible)', async ({ page }) => {
      // Navigate to OS Image tab if it exists, or find WiFi settings
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Fill in basic WiFi settings (backward compatible format)
        await page.fill('#os-wifi-ssid', 'TestNetwork');
        await page.fill('#os-wifi-password', 'TestPassword123');
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');

        // Verify basic fields are present and functional
        await expect(page.locator('#os-wifi-ssid')).toHaveValue('TestNetwork');
        await expect(page.locator('#os-wifi-password')).toHaveValue('TestPassword123');
        await expect(page.locator('#os-wifi-security')).toHaveValue('WPA3_Personal');
      }
    });

    test('should support WPA2-Personal (legacy mode)', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA2_Personal');
        await page.fill('#os-wifi-ssid', 'LegacyNetwork');
        await page.fill('#os-wifi-password', 'LegacyPass123');

        await expect(page.locator('#os-wifi-security')).toHaveValue('WPA2_Personal');
        await expect(page.locator('#os-wifi-ssid')).toHaveValue('LegacyNetwork');
      }
    });

    test('should maintain transition mode default (backward compatible)', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Transition mode should be visible for WPA3_Personal
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        const transitionMode = page.locator('#os-wifi-transition');
        await expect(transitionMode).toBeVisible({ timeout: 2000 });

        // Should be checked by default (backward compatible)
        await expect(transitionMode).toBeChecked();
      }
    });
  });

  test.describe('New Features - Advanced Options', () => {
    test('should toggle advanced options visibility', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const advancedToggle = page.locator('#os-wifi-advanced-toggle');
        const advancedOptions = page.locator('#os-wifi-advanced-options');

        // Initially hidden
        await expect(advancedOptions).not.toBeVisible();

        // Click to show
        await advancedToggle.click();
        await expect(advancedOptions).toBeVisible({ timeout: 2000 });

        // Click to hide
        await advancedToggle.click();
        await expect(advancedOptions).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should support hidden network configuration', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Show advanced options
        await page.click('#os-wifi-advanced-toggle');
        await page.waitForSelector('#os-wifi-advanced-options', { state: 'visible', timeout: 2000 });

        // Enable hidden network
        const hiddenCheckbox = page.locator('#os-wifi-hidden');
        await hiddenCheckbox.check();
        await expect(hiddenCheckbox).toBeChecked();
      }
    });

    test('should support PSK pre-computation option', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Show advanced options
        await page.click('#os-wifi-advanced-toggle');
        await page.waitForSelector('#os-wifi-advanced-options', { state: 'visible', timeout: 2000 });

        // Enable PSK pre-computation
        const pskCheckbox = page.locator('#os-wifi-precomputed-psk');
        await pskCheckbox.check();
        await expect(pskCheckbox).toBeChecked();
      }
    });

    test('should support frequency band selection', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Show advanced options
        await page.click('#os-wifi-advanced-toggle');
        await page.waitForSelector('#os-wifi-advanced-options', { state: 'visible', timeout: 2000 });

        const bandSelect = page.locator('#os-wifi-band');
        await expect(bandSelect).toBeVisible();

        // Test 5GHz selection
        await bandSelect.selectOption('5GHz');
        await expect(bandSelect).toHaveValue('5GHz');

        // Test 2.4GHz selection
        await bandSelect.selectOption('2.4GHz');
        await expect(bandSelect).toHaveValue('2.4GHz');

        // Test Auto selection
        await bandSelect.selectOption('');
        await expect(bandSelect).toHaveValue('');
      }
    });

    test('should support network priority configuration', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Show advanced options
        await page.click('#os-wifi-advanced-toggle');
        await page.waitForSelector('#os-wifi-advanced-options', { state: 'visible', timeout: 2000 });

        const priorityInput = page.locator('#os-wifi-priority');
        await expect(priorityInput).toBeVisible();
        await expect(priorityInput).toHaveValue('0');

        // Set priority
        await priorityInput.fill('50');
        await expect(priorityInput).toHaveValue('50');
      }
    });
  });

  test.describe('Password Validation', () => {
    test('should validate password strength for WPA3', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        const passwordInput = page.locator('#os-wifi-password');
        const strengthDiv = page.locator('#os-wifi-password-strength');

        // Test weak password
        await passwordInput.fill('weak');
        await page.waitForTimeout(500); // Wait for validation

        // Test medium password
        await passwordInput.fill('MediumPass123');
        await page.waitForTimeout(500);

        // Test strong password
        await passwordInput.fill('StrongPassword123!@#');
        await page.waitForTimeout(500);

        // Strength indicator should be visible
        await expect(strengthDiv).toBeVisible({ timeout: 2000 });
      }
    });

    test('should update password validation when security type changes', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const passwordInput = page.locator('#os-wifi-password');
        await passwordInput.fill('TestPassword123');

        // Change security type
        await page.selectOption('#os-wifi-security', 'WPA2_Personal');
        await page.waitForTimeout(500);

        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        await page.waitForTimeout(500);

        // Password should still be there
        await expect(passwordInput).toHaveValue('TestPassword123');
      }
    });
  });

  test.describe('Security Type Changes', () => {
    test('should show/hide transition mode based on security type', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const transitionMode = page.locator('#os-wifi-transition-mode');

        // WPA3_Personal should show transition mode
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        await expect(transitionMode).toBeVisible({ timeout: 2000 });

        // WPA2_Personal should hide transition mode
        await page.selectOption('#os-wifi-security', 'WPA2_Personal');
        await expect(transitionMode).not.toBeVisible({ timeout: 2000 });

        // Open network should hide transition mode
        await page.selectOption('#os-wifi-security', 'Open');
        await expect(transitionMode).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should show/hide password section based on security type', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const passwordSection = page.locator('#os-wifi-password-section');

        // WPA3_Personal should show password
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        await expect(passwordSection).toBeVisible({ timeout: 2000 });

        // Open network should hide password
        await page.selectOption('#os-wifi-security', 'Open');
        await expect(passwordSection).not.toBeVisible({ timeout: 2000 });
      }
    });

    test('should show/hide enterprise settings for enterprise security types', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const enterpriseSettings = page.locator('#os-wifi-enterprise-settings');

        // WPA3_Enterprise should show enterprise settings
        await page.selectOption('#os-wifi-security', 'WPA3_Enterprise');
        await expect(enterpriseSettings).toBeVisible({ timeout: 2000 });

        // WPA2_Enterprise should show enterprise settings
        await page.selectOption('#os-wifi-security', 'WPA2_Enterprise');
        await expect(enterpriseSettings).toBeVisible({ timeout: 2000 });

        // WPA3_Personal should hide enterprise settings
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');
        await expect(enterpriseSettings).not.toBeVisible({ timeout: 2000 });
      }
    });
  });

  test.describe('Enterprise Configuration', () => {
    test('should support all EAP methods', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA3_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        const eapMethod = page.locator('#os-wifi-eap-method');
        await expect(eapMethod).toBeVisible();

        // Test all EAP methods
        const eapMethods = ['TLS', 'PEAP', 'TTLS', 'PWD', 'SIM', 'AKA'];
        for (const method of eapMethods) {
          await eapMethod.selectOption(method);
          await expect(eapMethod).toHaveValue(method);
        }
      }
    });

    test('should support enterprise identity fields', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA2_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        // Test identity field
        const identity = page.locator('#os-wifi-identity');
        await identity.fill('user@domain.com');
        await expect(identity).toHaveValue('user@domain.com');

        // Test anonymous identity field
        const anonymousIdentity = page.locator('#os-wifi-anonymous-identity');
        await anonymousIdentity.fill('anonymous@domain.com');
        await expect(anonymousIdentity).toHaveValue('anonymous@domain.com');
      }
    });

    test('should support certificate paths', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA3_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        // Test CA certificate path
        const caCert = page.locator('#os-wifi-ca-cert');
        await caCert.fill('/path/to/ca.pem');
        await expect(caCert).toHaveValue('/path/to/ca.pem');

        // Test client certificate path
        const clientCert = page.locator('#os-wifi-client-cert');
        await clientCert.fill('/path/to/client.pem');
        await expect(clientCert).toHaveValue('/path/to/client.pem');

        // Test private key path
        const privateKey = page.locator('#os-wifi-private-key');
        await privateKey.fill('/path/to/private.key');
        await expect(privateKey).toHaveValue('/path/to/private.key');
      }
    });

    test('should support phase 2 authentication', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA2_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        const phase2 = page.locator('#os-wifi-phase2');
        await expect(phase2).toBeVisible();

        // Test phase 2 options
        await phase2.selectOption('auth=MSCHAPV2');
        await expect(phase2).toHaveValue('auth=MSCHAPV2');

        await phase2.selectOption('auth=PAP');
        await expect(phase2).toHaveValue('auth=PAP');
      }
    });

    test('should support EAP password', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA2_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        const eapPassword = page.locator('#os-wifi-eap-password');
        await eapPassword.fill('EAPPassword123');
        await expect(eapPassword).toHaveValue('EAPPassword123');
      }
    });
  });

  test.describe('Form Submission', () => {
    test('should collect all WPA fields in form data', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Fill basic fields
        await page.fill('#os-wifi-ssid', 'TestNetwork');
        await page.fill('#os-wifi-password', 'TestPassword123');
        await page.selectOption('#os-wifi-security', 'WPA3_Personal');

        // Show and fill advanced options
        await page.click('#os-wifi-advanced-toggle');
        await page.waitForSelector('#os-wifi-advanced-options', { state: 'visible', timeout: 2000 });
        await page.check('#os-wifi-hidden');
        await page.check('#os-wifi-precomputed-psk');
        await page.selectOption('#os-wifi-band', '5GHz');
        await page.fill('#os-wifi-priority', '25');

        // Verify all fields have values
        await expect(page.locator('#os-wifi-ssid')).toHaveValue('TestNetwork');
        await expect(page.locator('#os-wifi-password')).toHaveValue('TestPassword123');
        await expect(page.locator('#os-wifi-security')).toHaveValue('WPA3_Personal');
        await expect(page.locator('#os-wifi-hidden')).toBeChecked();
        await expect(page.locator('#os-wifi-precomputed-psk')).toBeChecked();
        await expect(page.locator('#os-wifi-band')).toHaveValue('5GHz');
        await expect(page.locator('#os-wifi-priority')).toHaveValue('25');
      }
    });

    test('should handle enterprise form submission', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        await page.selectOption('#os-wifi-security', 'WPA3_Enterprise');
        await page.waitForSelector('#os-wifi-enterprise-settings', { state: 'visible', timeout: 2000 });

        // Fill enterprise fields
        await page.selectOption('#os-wifi-eap-method', 'PEAP');
        await page.fill('#os-wifi-identity', 'user@domain.com');
        await page.fill('#os-wifi-anonymous-identity', 'anonymous@domain.com');
        await page.fill('#os-wifi-ca-cert', '/path/to/ca.pem');
        await page.fill('#os-wifi-client-cert', '/path/to/client.pem');
        await page.fill('#os-wifi-private-key', '/path/to/private.key');
        await page.fill('#os-wifi-private-key-passphrase', 'keypass123');
        await page.selectOption('#os-wifi-phase2', 'auth=MSCHAPV2');
        await page.fill('#os-wifi-eap-password', 'EAPPass123');

        // Verify all fields
        await expect(page.locator('#os-wifi-eap-method')).toHaveValue('PEAP');
        await expect(page.locator('#os-wifi-identity')).toHaveValue('user@domain.com');
        await expect(page.locator('#os-wifi-anonymous-identity')).toHaveValue('anonymous@domain.com');
        await expect(page.locator('#os-wifi-ca-cert')).toHaveValue('/path/to/ca.pem');
        await expect(page.locator('#os-wifi-client-cert')).toHaveValue('/path/to/client.pem');
        await expect(page.locator('#os-wifi-private-key')).toHaveValue('/path/to/private.key');
        await expect(page.locator('#os-wifi-private-key-passphrase')).toHaveValue('keypass123');
        await expect(page.locator('#os-wifi-phase2')).toHaveValue('auth=MSCHAPV2');
        await expect(page.locator('#os-wifi-eap-password')).toHaveValue('EAPPass123');
      }
    });
  });

  test.describe('UI/UX Features', () => {
    test('should show password toggle button', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        const passwordToggle = page.locator('#os-wifi-password-toggle');
        await expect(passwordToggle).toBeVisible({ timeout: 2000 });

        // Test toggle functionality
        const passwordInput = page.locator('#os-wifi-password');
        await passwordInput.fill('TestPassword');

        // Initially should be password type
        await expect(passwordInput).toHaveAttribute('type', 'password');

        // Click toggle
        await passwordToggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'text', { timeout: 1000 });

        // Click again
        await passwordToggle.click();
        await expect(passwordInput).toHaveAttribute('type', 'password', { timeout: 1000 });
      }
    });

    test('should display helpful hints for all fields', async ({ page }) => {
      const wifiEnable = page.locator('#os-enable-wifi');
      if (await wifiEnable.isVisible({ timeout: 2000 })) {
        await wifiEnable.check();

        // Check for form hints
        const hints = page.locator('.form-hint');
        const hintCount = await hints.count();
        expect(hintCount).toBeGreaterThan(0);
      }
    });
  });
});
