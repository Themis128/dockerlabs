/**
 * Helper functions for page interactions
 */

import type { Page, Locator } from '@playwright/test';

/**
 * Wait for element to be visible and stable
 */
export async function waitForElementStable(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<Locator> {
  const element = page.locator(selector);
  await element.waitFor({ state: 'visible', timeout });
  // Wait a bit more for any animations or transitions
  await page.waitForTimeout(200);
  return element;
}

/**
 * Check if element exists and is visible
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  const element = page.locator(selector);
  const count = await element.count();
  if (count === 0) return false;
  return await element.first().isVisible();
}

/**
 * Get text content safely (returns empty string if not found)
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  const element = page.locator(selector);
  const count = await element.count();
  if (count === 0) return '';
  return (await element.first().textContent()) || '';
}

/**
 * Click button and wait for action to complete
 */
export async function clickAndWait(
  page: Page,
  selector: string,
  waitForSelector?: string
): Promise<void> {
  await page.click(selector);
  if (waitForSelector) {
    await page.waitForSelector(waitForSelector, { state: 'visible', timeout: 5000 });
  }
  // Small delay to ensure action completes
  await page.waitForTimeout(300);
}

/**
 * Fill form field safely
 */
export async function fillField(page: Page, selector: string, value: string): Promise<void> {
  const field = page.locator(selector);
  await field.waitFor({ state: 'visible', timeout: 5000 });
  await field.fill(value);
}

/**
 * Check if component is rendered
 */
export async function isComponentRendered(page: Page, componentName: string): Promise<boolean> {
  // Check for component by looking for common Vue component patterns
  // This is a simple check - can be enhanced based on actual component structure
  const selectors = [
    `[data-component="${componentName}"]`,
    `.${componentName.toLowerCase()}`,
    `#${componentName.toLowerCase()}`,
  ];

  for (const selector of selectors) {
    if (await isElementVisible(page, selector)) {
      return true;
    }
  }
  return false;
}
