# Jest Conflict Resolution

## Problem

Jest was being invoked by VS Code/Cursor extensions and attempting to run Playwright tests, causing conflicts:

```
Playwright Test needs to be invoked via 'npx playwright test' and excluded from Jest test runs.
```

Jest was also scanning external directories like:
- `.cursor/extensions/`
- `.cursor/worktrees/`
- `.vscode-insiders/extensions/`

## Solution

### 1. Created `.jestignore`
Tells Jest to ignore all files since this project uses Playwright, not Jest.

### 2. Created `jest.config.js`
Minimal Jest configuration that:
- Disables all test matching
- Ignores all paths
- Prevents Jest from running any tests
- Explicitly indicates this project doesn't use Jest

### 3. Updated `playwright.config.ts`
Enhanced `testIgnore` patterns to exclude:
- `.vscode-insiders/` directories
- External worktrees
- External extensions
- JavaScript test files (we only use TypeScript)

## Configuration Details

### Playwright Configuration
- **testDir:** `./tests` - Only scans the tests directory
- **testMatch:** `/.*\.spec\.ts$/` - Only matches TypeScript spec files
- **testIgnore:** Comprehensive list of excluded directories

### Jest Configuration
- **testMatch:** `[]` - No tests to match
- **testPathIgnorePatterns:** `['**/*']` - Ignore everything
- **collectCoverage:** `false` - Don't collect coverage
- **projects:** `[]` - No projects to run

## Result

- Jest will no longer attempt to run tests
- Playwright tests will run correctly via `npm test` or `npx playwright test`
- External directories are properly excluded
- No conflicts between Jest and Playwright

## Usage

To run tests, use:
```bash
npm test              # Runs Playwright tests
npx playwright test   # Direct Playwright invocation
```

Jest should no longer interfere with test execution.


