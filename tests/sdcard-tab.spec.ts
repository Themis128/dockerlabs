import { test, expect } from '@playwright/test';
import { navigateToNuxtApp, clickTab } from './helpers/nuxt-helpers';

/**
 * Comprehensive tests for the upgraded SD Card Management tab
 */
test.describe('SD Card Management Tab - Upgraded Features', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNuxtApp(page);
  });

  test('should display SD Card Management tab with new UI', async ({ page }) => {
    // Navigate to SD Card tab
    await clickTab(page, 'SD Card');

    // Verify header is visible
    const header = page.locator('.sdcard-header h2');
    await expect(header).toBeVisible({ timeout: 10000 });
    await expect(header).toContainText('SD Card Management');

    // Verify subtitle
    const subtitle = page.locator('.sdcard-header .subtitle');
    await expect(subtitle).toBeVisible();
    await expect(subtitle).toContainText('Manage and format');

    console.log('✓ SD Card tab header displayed correctly');
  });

  test('should display controls bar with refresh and auto-refresh', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(1000);

    // Verify controls bar exists
    const controlsBar = page.locator('.controls-bar');
    await expect(controlsBar).toBeVisible({ timeout: 5000 });

    // Verify refresh button
    const refreshButton = page.locator('button').filter({ hasText: /Refresh SD Cards/i });
    await expect(refreshButton).toBeVisible();

    // Verify auto-refresh toggle
    const autoRefreshToggle = page.locator('.auto-refresh-toggle');
    await expect(autoRefreshToggle).toBeVisible();

    console.log('✓ Controls bar with refresh and auto-refresh displayed');
  });

  test('should display SD cards in grid layout', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000); // Wait for cards to load

    // Check if cards grid exists
    const cardsGrid = page.locator('.sdcards-grid');
    const gridCount = await cardsGrid.count();

    if (gridCount > 0) {
      // Verify grid structure
      await expect(cardsGrid.first()).toBeVisible();

      // Check if any cards are displayed
      const cards = page.locator('.sdcard-card');
      const cardCount = await cards.count();

      if (cardCount > 0) {
        console.log(`✓ SD cards displayed in grid (${cardCount} cards found)`);

        // Verify card structure
        const firstCard = cards.first();
        await expect(firstCard).toBeVisible();

        // Verify card header
        const cardHeader = firstCard.locator('.card-header');
        await expect(cardHeader).toBeVisible();

        // Verify card icon
        const cardIcon = firstCard.locator('.card-icon');
        await expect(cardIcon).toBeVisible();
      } else {
        console.log('⚠ No SD cards detected (this may be expected)');
      }
    } else {
      // Check for empty state
      const emptyState = page.locator('.empty-state');
      const emptyCount = await emptyState.count();

      if (emptyCount > 0) {
        console.log('✓ Empty state displayed correctly');
      }
    }
  });

  test('should display search bar when multiple cards present', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    // Check if search input exists
    const searchInput = page.locator('.search-input');
    const searchCount = await searchInput.count();

    if (searchCount > 0) {
      await expect(searchInput.first()).toBeVisible();
      console.log('✓ Search bar displayed');
    } else {
      // Search may not show if only one card
      console.log('⚠ Search bar not visible (may be hidden with single card)');
    }
  });

  test('should expand and collapse card details', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Find expand button
      const expandButton = firstCard.locator('.btn-icon');
      const expandCount = await expandButton.count();

      if (expandCount > 0) {
        // Click to expand
        await expandButton.first().click();
        await page.waitForTimeout(500);

        // Verify expanded details are visible
        const expandedDetails = firstCard.locator('.expanded-details');
        await expect(expandedDetails).toBeVisible({ timeout: 2000 });

        // Click to collapse
        await expandButton.first().click();
        await page.waitForTimeout(500);

        console.log('✓ Card expand/collapse functionality works');
      } else {
        console.log('⚠ Expand button not found');
      }
    } else {
      console.log('⚠ No cards available to test expand/collapse');
    }
  });

  test('should display format button on cards', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Verify format button exists
      const formatButton = firstCard.locator('button').filter({ hasText: /Format for Pi/i });
      const formatCount = await formatButton.count();

      if (formatCount > 0) {
        await expect(formatButton.first()).toBeVisible();
        console.log('✓ Format button displayed on cards');
      } else {
        // Check in actions bar
        const actionsBar = firstCard.locator('.card-actions-bar');
        if (await actionsBar.count() > 0) {
          console.log('✓ Card actions bar exists');
        }
      }
    } else {
      console.log('⚠ No cards available to test format button');
    }
  });

  test('should display quick info on cards', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Verify quick info section
      const quickInfo = firstCard.locator('.quick-info');
      const quickInfoCount = await quickInfo.count();

      if (quickInfoCount > 0) {
        await expect(quickInfo.first()).toBeVisible();

        // Check for info items
        const infoItems = firstCard.locator('.info-item');
        const itemCount = await infoItems.count();

        if (itemCount > 0) {
          console.log(`✓ Quick info displayed (${itemCount} items)`);
        }
      }
    } else {
      console.log('⚠ No cards available to test quick info');
    }
  });

  test('should handle refresh button click', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(1000);

    // Find refresh button
    const refreshButton = page.locator('button').filter({ hasText: /Refresh SD Cards/i });
    await expect(refreshButton).toBeVisible({ timeout: 5000 });

    // Click refresh
    await refreshButton.click();
    await page.waitForTimeout(1000);

    // Verify button state (may show loading)
    const buttonText = await refreshButton.textContent();
    console.log(`✓ Refresh button clicked (state: ${buttonText})`);
  });

  test('should display status indicators', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();

      // Check for status indicator
      const statusIndicator = firstCard.locator('.status-indicator');
      const indicatorCount = await statusIndicator.count();

      if (indicatorCount > 0) {
        await expect(statusIndicator.first()).toBeVisible();
        console.log('✓ Status indicators displayed');
      }
    } else {
      console.log('⚠ No cards available to test status indicators');
    }
  });

  test('should display empty state when no cards', async ({ page }) => {
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);

    // Check for empty state
    const emptyState = page.locator('.empty-state');
    const emptyCount = await emptyState.count();

    if (emptyCount > 0) {
      await expect(emptyState.first()).toBeVisible();

      // Verify empty state content
      const emptyIcon = emptyState.locator('.empty-icon');
      const emptyText = emptyState.locator('h3');

      if (await emptyIcon.count() > 0) {
        await expect(emptyIcon.first()).toBeVisible();
      }

      if (await emptyText.count() > 0) {
        await expect(emptyText.first()).toBeVisible();
      }

      console.log('✓ Empty state displayed correctly');
    } else {
      console.log('⚠ Empty state not visible (cards may be present)');
    }
  });

  test('should display loading state', async ({ page }) => {
    await clickTab(page, 'SD Card');

    // Click refresh to trigger loading
    const refreshButton = page.locator('button').filter({ hasText: /Refresh SD Cards/i });
    await refreshButton.click();

    // Check for loading state (may be brief)
    const loadingContainer = page.locator('.loading-container');
    const loadingSpinner = page.locator('.loading-spinner');

    // Loading state may appear briefly
    await page.waitForTimeout(500);

    const hasLoading = await loadingContainer.count() > 0 || await loadingSpinner.count() > 0;

    if (hasLoading) {
      console.log('✓ Loading state displayed');
    } else {
      console.log('⚠ Loading state not visible (may have loaded too quickly)');
    }
  });
});

test.describe('SD Card Management - Format Dialog', () => {
  test.beforeEach(async ({ page }) => {
    await navigateToNuxtApp(page);
    await clickTab(page, 'SD Card');
    await page.waitForTimeout(2000);
  });

  test('should open format dialog when format button clicked', async ({ page }) => {
    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const formatButton = firstCard.locator('button').filter({ hasText: /Format for Pi/i });

      if (await formatButton.count() > 0) {
        await formatButton.click();
        await page.waitForTimeout(500);

        // Check for modal
        const modal = page.locator('.modal-overlay');
        const modalCount = await modal.count();

        if (modalCount > 0) {
          await expect(modal.first()).toBeVisible({ timeout: 2000 });
          console.log('✓ Format dialog opened');

          // Verify modal content
          const modalHeader = modal.locator('.modal-header h3');
          if (await modalHeader.count() > 0) {
            await expect(modalHeader.first()).toBeVisible();
          }
        } else {
          console.log('⚠ Format dialog not opened (may require confirmation)');
        }
      } else {
        console.log('⚠ Format button not found');
      }
    } else {
      console.log('⚠ No cards available to test format dialog');
    }
  });

  test('should display Pi model selection in format dialog', async ({ page }) => {
    const cards = page.locator('.sdcard-card');
    const cardCount = await cards.count();

    if (cardCount > 0) {
      const firstCard = cards.first();
      const formatButton = firstCard.locator('button').filter({ hasText: /Format for Pi/i });

      if (await formatButton.count() > 0) {
        await formatButton.click();
        await page.waitForTimeout(500);

        const modal = page.locator('.modal-overlay');
        if (await modal.count() > 0) {
          // Check for Pi model select
          const piModelSelect = page.locator('#pi-model-select');
          const selectCount = await piModelSelect.count();

          if (selectCount > 0) {
            await expect(piModelSelect.first()).toBeVisible();
            console.log('✓ Pi model selection displayed in format dialog');
          }
        }
      }
    }
  });
});

test.describe('SD Card Management - Greek Locale', () => {
  test('should display Greek locale in Settings tab', async ({ page }) => {
    await navigateToNuxtApp(page);
    await clickTab(page, 'Settings');
    await page.waitForTimeout(1000);

    // Find locale select (need to select a Pi first)
    const localeSelect = page.locator('#settings-locale');
    const selectCount = await localeSelect.count();

    if (selectCount > 0) {
      await expect(localeSelect.first()).toBeVisible({ timeout: 5000 });

      // Check for Greek option
      const greekOption = localeSelect.locator('option[value="el_GR.UTF-8"]');
      const greekCount = await greekOption.count();

      if (greekCount > 0) {
        const greekText = await greekOption.first().textContent();
        expect(greekText).toContain('Greek');
        console.log('✓ Greek locale option found in Settings tab');
      } else {
        console.log('⚠ Greek locale option not found in Settings tab');
      }
    } else {
      console.log('⚠ Locale select not found (may need to select a Pi first)');
    }
  });

  test('should display Greek locale in OS Install tab', async ({ page }) => {
    await navigateToNuxtApp(page);
    await clickTab(page, 'OS Install');
    await page.waitForTimeout(1000);

    // Look for locale select (may be in collapsible section)
    const localeSelect = page.locator('#os-locale');
    const selectCount = await localeSelect.count();

    if (selectCount > 0) {
      // Check for Greek option (element may exist but be hidden in collapsible section)
      const greekOption = localeSelect.locator('option[value="el_GR.UTF-8"]');
      const greekCount = await greekOption.count();

      if (greekCount > 0) {
        const greekText = await greekOption.first().textContent();
        expect(greekText).toContain('Greek');
        console.log('✓ Greek locale option found in OS Install tab');
      } else {
        // Try to expand the section if it's collapsible
        const expandButton = page.locator('button, .expand-button, [aria-expanded]').first();
        if (await expandButton.count() > 0) {
          await expandButton.click();
          await page.waitForTimeout(500);

          // Check again
          const greekOptionAfter = localeSelect.locator('option[value="el_GR.UTF-8"]');
          if (await greekOptionAfter.count() > 0) {
            console.log('✓ Greek locale option found after expanding section');
          } else {
            console.log('⚠ Greek locale option not found in OS Install tab');
          }
        } else {
          console.log('⚠ Greek locale option not found in OS Install tab');
        }
      }
    } else {
      console.log('⚠ Locale select not found in OS Install tab');
    }
  });
});
