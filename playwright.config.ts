import { defineConfig, devices } from '@playwright/test';
import os from 'os';

/**
 * Playwright Test Configuration with Horizontal Scaling Support
 * See https://playwright.dev/docs/test-configuration.
 *
 * Horizontal Scaling Features:
 * - Automatic worker count based on CPU cores
 * - Sharding support for multi-machine execution
 * - Environment-aware configuration (local vs CI)
 * - Optimized parallel execution
 */

// Timeout constants - define once for maintainability
const ACTION_TIMEOUT = 30000; // 30 seconds for actions (clicks, fills, etc.)
const NAVIGATION_TIMEOUT = 60000; // 60 seconds for navigation (page loads)
const TEST_TIMEOUT = 60000; // 60 seconds per test
const SERVER_STARTUP_TIMEOUT = 120000; // 2 minutes for Python server
const NUXT_STARTUP_TIMEOUT = 180000; // 3 minutes for Nuxt 4 startup

// Calculate optimal worker count
function getWorkerCount(): number {
  // Check for explicit worker count override
  if (process.env.PLAYWRIGHT_WORKERS) {
    return parseInt(process.env.PLAYWRIGHT_WORKERS, 10);
  }

  // Get CPU core count
  const cpuCount = os.cpus().length;

  // CI environment: use fewer workers to avoid overwhelming the system
  if (process.env.CI) {
    // In CI, use 50% of cores but minimum 2, maximum 4
    return Math.max(2, Math.min(4, Math.floor(cpuCount * 0.5)));
  }

  // Local development: use more workers for faster execution
  // Use 75% of cores but minimum 2, maximum 8
  return Math.max(2, Math.min(8, Math.floor(cpuCount * 0.75)));
}

// Sharding configuration
const shardConfig = process.env.SHARD
  ? {
      total: parseInt(process.env.SHARD_TOTAL || '1', 10),
      current: parseInt(process.env.SHARD || '1', 10),
    }
  : undefined;

// Reporter configuration - use multiple reporters for better visibility
const reporters: Array<['html'] | ['json', { outputFile: string }] | ['junit', { outputFile: string }] | ['list']> = process.env.CI
  ? [
      ['html'],
      ['json', { outputFile: 'test-results/results.json' }],
      ['junit', { outputFile: 'test-results/junit.xml' }],
      ['list'],
    ]
  : [['html'], ['list']];

export default defineConfig({
  testDir: './tests',
  /* Only match test files in the tests directory */
  testMatch: /.*\.spec\.ts$/,
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Dynamic worker count based on CPU cores and environment */
  workers: getWorkerCount(),
  /* Sharding support for horizontal scaling across multiple machines */
  shard: shardConfig,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: reporters,
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

    /* Performance optimizations - disable video in CI to save resources */
    ...(process.env.CI && { video: 'off' }),
  },

  /* Global test timeout - maximum time a test can run */
  timeout: TEST_TIMEOUT,
  /* Maximum time in milliseconds the whole test suite can run */
  globalTimeout: process.env.CI ? 3600000 : 1800000, // 1 hour in CI, 30 min locally
  /* Maximum number of test failures before stopping */
  maxFailures: process.env.CI ? 10 : undefined,
  /* Ignore patterns to prevent scanning system directories */
  testIgnore: [
    '**/node_modules/**',
    '**/.cursor/**',
    '**/.vscode/**',
    '**/.vscode-insiders/**',
    '**/Downloads/**',
    '**/AppData/**',
    '**/.*/**',
    '**/.*',
    '**/../**',
    // Only run tests from the tests directory
    '**/tests/**/*.spec.js', // Exclude .js files (we use .ts)
    // Exclude external worktrees and extensions
    '**/worktrees/**',
    '**/extensions/**',
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
