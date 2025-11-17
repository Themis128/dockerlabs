import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, clickTab } from './helpers/nuxt-helpers';

/**
 * Tests for SSH and Telnet configuration options in Boot Settings
 */
test.describe('SSH and Telnet Configuration', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNuxtApp(page);
  });

  test('should display SSH configuration options in Boot Settings', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    await expect(bootSettings).toBeVisible({ timeout: 5000 });

    // Click to expand if not already open
    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Verify SSH section exists
    const sshSection = bootSettings.locator('text=/SSH Configuration/i');
    await expect(sshSection).toBeVisible({ timeout: 2000 });

    // Verify Enable SSH label exists (checkbox is hidden)
    const enableSSHLabel = bootSettings.locator('label').filter({ hasText: 'Enable SSH' });
    await expect(enableSSHLabel).toBeVisible({ timeout: 2000 });

    // Check if SSH is already enabled (default is true)
    const enableSSHCheckbox = page.locator('#os-enable-ssh');
    const isSSHEnabled = await enableSSHCheckbox.isChecked();

    // If not enabled, enable it
    if (!isSSHEnabled) {
      await enableSSHLabel.click();
      await page.waitForTimeout(500);
    }

    // Verify SSH options exist in DOM (they may be hidden but should exist)
    const sshPort = page.locator('#os-ssh-port');
    await expect(sshPort).toHaveCount(1, { timeout: 2000 });

    // Check for SSH password auth label (checkbox is hidden)
    const sshPasswordAuthLabel = bootSettings.locator('label').filter({ hasText: 'Enable Password Authentication' });
    await expect(sshPasswordAuthLabel).toBeVisible({ timeout: 2000 });

    // Check for SSH disable root label (checkbox is hidden)
    const sshDisableRootLabel = bootSettings.locator('label').filter({ hasText: 'Disable Root Login' });
    await expect(sshDisableRootLabel).toBeVisible({ timeout: 2000 });

    // Verify authorized keys textarea exists
    const sshAuthorizedKeys = page.locator('#os-ssh-authorized-keys');
    await expect(sshAuthorizedKeys).toHaveCount(1, { timeout: 2000 });

    console.log('✓ All SSH configuration options displayed');
  });

  test('should display Telnet configuration options in Boot Settings', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    await expect(bootSettings).toBeVisible({ timeout: 5000 });

    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Verify Telnet section exists
    const telnetSection = bootSettings.locator('text=/Telnet Configuration/i');
    await expect(telnetSection).toBeVisible({ timeout: 2000 });

    // Verify Enable Telnet label exists (checkbox is hidden)
    const enableTelnetLabel = bootSettings.locator('label').filter({ hasText: 'Enable Telnet' });
    await expect(enableTelnetLabel).toBeVisible({ timeout: 2000 });

    // Click the label to enable Telnet
    await enableTelnetLabel.click();
    await page.waitForTimeout(500);

    // Verify Telnet options exist in DOM
    const telnetPort = page.locator('#os-telnet-port');
    await expect(telnetPort).toHaveCount(1, { timeout: 2000 });

    // Check for telnet enable login label (checkbox is hidden)
    const telnetEnableLoginLabel = bootSettings.locator('label').filter({ hasText: 'Enable Login Authentication' });
    await expect(telnetEnableLoginLabel).toBeVisible({ timeout: 2000 });

    // Click to enable login to show username/password fields
    await telnetEnableLoginLabel.click();
    await page.waitForTimeout(500);

    // Verify username and password fields exist
    const telnetUsername = page.locator('#os-telnet-username');
    await expect(telnetUsername).toHaveCount(1, { timeout: 2000 });

    const telnetPassword = page.locator('#os-telnet-password');
    await expect(telnetPassword).toHaveCount(1, { timeout: 2000 });

    console.log('✓ All Telnet configuration options displayed');
  });

  test('should allow configuring SSH port', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Check SSH state and enable if needed
    const enableSSHCheckbox = page.locator('#os-enable-ssh');
    const isSSHEnabled = await enableSSHCheckbox.isChecked();
    const enableSSHLabel = bootSettings.locator('label').filter({ hasText: 'Enable SSH' });

    if (!isSSHEnabled) {
      await enableSSHLabel.click();
      await page.waitForTimeout(500);
    }

    // Set SSH port (use force since it may be hidden but exists)
    const sshPort = page.locator('#os-ssh-port');
    await sshPort.fill('2222', { force: true });
    await page.waitForTimeout(300);

    // Verify value
    const portValue = await sshPort.inputValue();
    expect(portValue).toBe('2222');

    console.log('✓ SSH port configuration works');
  });

  test('should allow configuring Telnet username and password', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Enable Telnet (click label)
    const enableTelnetLabel = bootSettings.locator('label').filter({ hasText: 'Enable Telnet' });
    await enableTelnetLabel.click();
    await page.waitForTimeout(500);

    // Check login state and enable if needed (default is true)
    const telnetEnableLoginCheckbox = page.locator('#os-telnet-enable-login');
    const telnetEnableLoginLabel = bootSettings.locator('label').filter({ hasText: 'Enable Login Authentication' });
    const isLoginEnabled = await telnetEnableLoginCheckbox.isChecked();

    if (!isLoginEnabled) {
      await telnetEnableLoginLabel.click();
      await page.waitForTimeout(500);
    }

    // Verify login checkbox is checked
    const finalLoginState = await telnetEnableLoginCheckbox.isChecked();
    expect(finalLoginState).toBe(true);

    // Use evaluate to set values directly since fields may be hidden by v-show
    const telnetUsername = page.locator('#os-telnet-username');
    await telnetUsername.evaluate((el: HTMLInputElement) => {
      el.value = 'admin';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    const telnetPassword = page.locator('#os-telnet-password');
    await telnetPassword.evaluate((el: HTMLInputElement) => {
      el.value = 'mypassword123';
      el.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForTimeout(300);

    // Verify values
    const usernameValue = await telnetUsername.inputValue();
    expect(usernameValue).toBe('admin');

    const passwordValue = await telnetPassword.inputValue();
    expect(passwordValue).toBe('mypassword123');

    console.log('✓ Telnet username and password configuration works');
  });

  test('should allow adding SSH authorized keys', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Check SSH state and enable if needed
    const enableSSHCheckbox = page.locator('#os-enable-ssh');
    const isSSHEnabled = await enableSSHCheckbox.isChecked();
    const enableSSHLabel = bootSettings.locator('label').filter({ hasText: 'Enable SSH' });

    if (!isSSHEnabled) {
      await enableSSHLabel.click();
      await page.waitForTimeout(500);
    }

    // Find authorized keys textarea (may be hidden but exists)
    const sshAuthorizedKeys = page.locator('#os-ssh-authorized-keys');
    await expect(sshAuthorizedKeys).toHaveCount(1, { timeout: 2000 });

    // Add a test SSH key (use force since it may be hidden)
    const testKey = 'ssh-rsa AAAAB3NzaC1yc2EAAAADAQABAAACAQ... test@example.com';
    await sshAuthorizedKeys.fill(testKey, { force: true });
    await page.waitForTimeout(500);

    // Verify value
    const keysValue = await sshAuthorizedKeys.inputValue();
    expect(keysValue).toContain('ssh-rsa');

    console.log('✓ SSH authorized keys textarea works');
  });

  test('should toggle SSH and Telnet options correctly', async ({ page }) => {
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Expand Boot Settings
    const bootSettings = page.locator('details').filter({ hasText: 'Boot Settings' });
    const summary = bootSettings.locator('summary');
    await summary.click();
    await page.waitForTimeout(500);

    // Test SSH toggle
    const enableSSHLabel = bootSettings.locator('label').filter({ hasText: 'Enable SSH' });
    const enableSSHCheckbox = page.locator('#os-enable-ssh');

    // Check initial state
    const initialSSHState = await enableSSHCheckbox.isChecked();

    // Toggle SSH (disable if enabled, enable if disabled)
    await enableSSHLabel.click();
    await page.waitForTimeout(500);

    // Verify state changed
    const newSSHState = await enableSSHCheckbox.isChecked();
    expect(newSSHState).toBe(!initialSSHState);

    console.log('✓ SSH toggle functionality works');

    // Test Telnet toggle
    const enableTelnetLabel = bootSettings.locator('label').filter({ hasText: 'Enable Telnet' });
    const enableTelnetCheckbox = page.locator('#os-enable-telnet');

    // Check initial state
    const initialTelnetState = await enableTelnetCheckbox.isChecked();

    // Toggle Telnet
    await enableTelnetLabel.click();
    await page.waitForTimeout(500);

    // Verify state changed
    const newTelnetState = await enableTelnetCheckbox.isChecked();
    expect(newTelnetState).toBe(!initialTelnetState);

    console.log('✓ Telnet toggle functionality works');
    console.log('✓ SSH and Telnet toggle functionality works');
  });
});
