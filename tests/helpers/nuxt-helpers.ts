/**
 * Helper functions for Nuxt-specific testing
 */

import type { Page, Locator } from '@playwright/test';

export const NUXT_BASE_URL = 'http://localhost:3001';

/**
 * Default timeout values (in milliseconds)
 */
const DEFAULT_TIMEOUTS = {
  navigation: 60000,
  layoutReady: 30000,
  tabVisible: 15000,
  tabClick: 5000,
  uiUpdate: 200,
} as const;

/**
 * Wait for Nuxt app to be ready
 * @param page - Playwright page instance
 * @param timeout - Optional timeout override (default: 30000ms)
 */
export async function waitForNuxtReady(
  page: Page,
  timeout: number = DEFAULT_TIMEOUTS.layoutReady
): Promise<void> {
  // Wait for the main layout container - use shorter timeout
  const layoutContainer = page.locator('.layout-container');
  await layoutContainer.waitFor({ state: 'visible', timeout: Math.min(timeout, 15000) }); // Cap at 15s

  // Wait for at least one tab button to be visible - reduced timeout
  const tabButton = page.locator('.tab-button').first();
  await tabButton.waitFor({ state: 'visible', timeout: 5000 }); // Reduced from 10s to 5s

  // Wait for page to be interactive - already loaded with domcontentloaded
  // No need to wait again
}

/**
 * Navigate to Nuxt app and wait for it to be ready
 * @param page - Playwright page instance
 * @param path - Path to navigate to (default: '/')
 * @param timeout - Optional navigation timeout override (default: 60000ms)
 */
export async function navigateToNuxtApp(
  page: Page,
  path: string = '/',
  timeout: number = DEFAULT_TIMEOUTS.navigation
): Promise<void> {
  // Use domcontentloaded instead of networkidle for faster, more reliable tests
  await page.goto(`${NUXT_BASE_URL}${path}`, {
    waitUntil: 'domcontentloaded',
    timeout: Math.min(timeout, 30000), // Cap at 30s for faster tests
  });
  await waitForNuxtReady(page);
}

/**
 * Get the locator for a tab button by label
 * Uses filter() instead of :has-text() selector for better reliability
 * @param page - Playwright page instance
 * @param tabLabel - Label text of the tab
 * @returns Locator for the tab button
 */
function getTabLocator(page: Page, tabLabel: string): Locator {
  return page.locator('.tab-button').filter({ hasText: tabLabel });
}

/**
 * Get active tab name
 * @param page - Playwright page instance
 * @returns The text content of the active tab, or null if no active tab found
 */
export async function getActiveTab(page: Page): Promise<string | null> {
  const activeTab = page.locator('.tab-button.active').first();
  const count = await activeTab.count();

  if (count === 0) {
    return null;
  }

  const text = await activeTab.textContent();
  return text?.trim() || null;
}

/**
 * Click on a tab by label and wait for it to become active
 * @param page - Playwright page instance
 * @param tabLabel - Label text of the tab to click
 * @param options - Optional configuration
 * @param options.timeout - Timeout for waiting for tab to be visible (default: 15000ms)
 * @param options.retryDelay - Delay between retries (default: 300ms)
 * @throws Error if tab is not found or does not become active
 */
export async function clickTab(
  page: Page,
  tabLabel: string,
  options: { timeout?: number; retryDelay?: number } = {}
): Promise<void> {
  const { timeout = DEFAULT_TIMEOUTS.tabVisible, retryDelay = 300 } = options;
  const tab = getTabLocator(page, tabLabel);

  // Wait for tab to be visible
  await tab.waitFor({ state: 'visible', timeout });

  // Click the tab with retry logic
  try {
    await tab.click({ timeout: DEFAULT_TIMEOUTS.tabClick });
  } catch (error) {
    // If click fails, try with force option
    await tab.click({ force: true, timeout: DEFAULT_TIMEOUTS.tabClick });
  }

  // Wait for tab to become active with polling
  const maxRetries = 5;
  let isActive = false;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    isActive = await isTabActive(page, tabLabel);
    if (isActive) {
      break;
    }
    // Wait before next attempt (except on last attempt) - reduced retry delay
    if (attempt < maxRetries - 1) {
      await page.waitForTimeout(Math.min(retryDelay, 200)); // Cap at 200ms
    }
  }

  if (!isActive) {
    const currentActiveTab = await getActiveTab(page);
    throw new Error(
      `Tab "${tabLabel}" did not become active after clicking (checked ${maxRetries} times). ` +
      `Current active tab: ${currentActiveTab || 'none'}`
    );
  }

  // Small delay to ensure UI updates complete - reduced from 200ms to 50ms
  await page.waitForTimeout(50);
}

/**
 * Check if a tab is active
 * @param page - Playwright page instance
 * @param tabLabel - Label text of the tab to check
 * @returns True if the tab is active, false otherwise
 */
export async function isTabActive(page: Page, tabLabel: string): Promise<boolean> {
  const tab = getTabLocator(page, tabLabel);
  const count = await tab.count();

  if (count === 0) {
    return false;
  }

  const classes = await tab.first().getAttribute('class');
  return classes?.includes('active') ?? false;
}
