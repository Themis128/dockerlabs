import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Test Configuration
 * See https://playwright.dev/docs/test-configuration.
 */

// Timeout constants - define once for maintainability
const ACTION_TIMEOUT = 30000; // 30 seconds for actions (clicks, fills, etc.)
const NAVIGATION_TIMEOUT = 60000; // 60 seconds for navigation (page loads)
const TEST_TIMEOUT = 60000; // 60 seconds per test
const SERVER_STARTUP_TIMEOUT = 120000; // 2 minutes for Python server
const NUXT_STARTUP_TIMEOUT = 180000; // 3 minutes for Nuxt 4 startup

export default defineConfig({
  testDir: './tests',
  /* Only match test files in the tests directory */
  testMatch: /.*\.spec\.ts$/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0, // Reduced from 2 to 0 to prevent infinite retry loops
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : 2, // Reduced from 4 to 2 to prevent overwhelming the API
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: 'http://localhost:3001', // Nuxt frontend

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Timeout for actions (clicks, fills, etc.) */
    actionTimeout: ACTION_TIMEOUT,
    /* Timeout for navigation (page loads, redirects) */
    navigationTimeout: NAVIGATION_TIMEOUT,
  },

  /* Global test timeout - maximum time a test can run */
  timeout: TEST_TIMEOUT,
  /* Ignore patterns to prevent scanning system directories */
  testIgnore: [
    '**/node_modules/**',
    '**/.cursor/**',
    '**/.vscode/**',
    '**/Downloads/**',
    '**/AppData/**',
    '**/.*/**',
    '**/.*',
    '**/../**',
  ],

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  /* Run your local dev servers before starting the tests */
  webServer: [
    {
      command: 'python web-gui/server.py',
      url: 'http://localhost:3000',
      reuseExistingServer: true,
      timeout: SERVER_STARTUP_TIMEOUT,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      command: 'npx nuxt dev --port 3001',
      url: 'http://localhost:3001',
      reuseExistingServer: true,
      timeout: NUXT_STARTUP_TIMEOUT,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
});
