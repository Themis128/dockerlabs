# Code Quality Analysis Report

**Generated:** 2025-11-18T18:00:20.999Z

## Summary

- **Files Analyzed:** 1
- **Average Score:** 85.0/100
- **Total Issues:** 2
  - Errors: 0
  - Warnings: 2
  - Info: 0

## Files

### D:\Nuxt Projects\dockerlabs\tests\helpers\os-install-helpers.ts

**Score:** 85/100

**Summary:** The code has a few minor issues that could be improved for better test reliability and clarity.

#### Issues

- **WARNING** (Best Practices) - Line 27: Using `page.waitForTimeout` for waiting can lead to flaky tests. Consider using `page.locator().waitForElementState()` instead.
- **WARNING** (Code Clarity) - Line 34: The `evaluate` function is used to interact with the DOM, but it's not clear what the purpose of this code is. Ensure that the logic inside the `evaluate` function is necessary and correctly implemented.


---

