/**
 * Jest Configuration
 *
 * NOTE: This project uses Playwright for testing, not Jest.
 * This config exists only to prevent Jest from scanning the project
 * when invoked by VS Code/Cursor extensions.
 */

module.exports = {
  // Don't run any tests
  testMatch: [],
  // Ignore all files
  testPathIgnorePatterns: ['**/*'],
  // Don't collect coverage
  collectCoverage: false,
  // Don't transform anything
  transform: {},
  // Don't use any preset
  preset: undefined,
  // Explicitly tell Jest this project doesn't use Jest
  projects: [],
};


