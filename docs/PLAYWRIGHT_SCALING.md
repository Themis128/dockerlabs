# Playwright Horizontal Scaling Guide

This guide explains how to use the horizontal scaling features in the Playwright test configuration to speed up test execution.

## Features

- **Automatic Worker Detection**: Automatically calculates optimal worker count based on CPU cores
- **Sharding Support**: Split tests across multiple machines/processes for parallel execution
- **Environment-Aware**: Different configurations for local development vs CI/CD
- **Performance Optimizations**: Disables video recording in CI to save resources

## Automatic Worker Configuration

The configuration automatically detects your CPU cores and sets an optimal worker count:

- **Local Development**: Uses 75% of CPU cores (min 2, max 8)
- **CI Environment**: Uses 50% of CPU cores (min 2, max 4)

You can override this by setting the `PLAYWRIGHT_WORKERS` environment variable:

```bash
# Windows PowerShell
$env:PLAYWRIGHT_WORKERS = "4"
npm test

# Linux/Mac
PLAYWRIGHT_WORKERS=4 npm test
```

## Sharding (Horizontal Scaling)

Sharding allows you to split your test suite across multiple machines or processes, dramatically reducing execution time.

### Basic Sharding

Split tests into 4 shards and run shard 1:

```bash
# Windows PowerShell
npm run test:shard
# Or manually:
npx playwright test --shard=1/4

# Linux/Mac
SHARD=1 SHARD_TOTAL=4 npm test
```

### Using the PowerShell Helper Script

```powershell
# Run with 4 shards (shard 1)
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 1

# Run with 4 shards (shard 2) with 4 workers
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 2 -Workers 4

# Run all shards in parallel (requires multiple terminals)
# Terminal 1:
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 1

# Terminal 2:
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 2

# Terminal 3:
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 3

# Terminal 4:
.\scripts\powershell\run-tests-sharded.ps1 -ShardTotal 4 -Shard 4
```

### CI/CD Integration

#### GitHub Actions Example

```yaml
name: Playwright Tests

on: [push, pull_request]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        shard: [1, 2, 3, 4]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - uses: actions/setup-python@v4
      - name: Install dependencies
        run: |
          npm ci
          npx playwright install --with-deps
      - name: Run Playwright tests
        run: npx playwright test --shard=${{ matrix.shard }}/4
      - uses: actions/upload-artifact@v3
        if: always()
        with:
          name: playwright-report-${{ matrix.shard }}
          path: playwright-report/
          retention-days: 30
```

#### GitLab CI Example

```yaml
test:
  parallel:
    matrix:
      - SHARD: [1, 2, 3, 4]
  script:
    - npm ci
    - npx playwright install --with-deps
    - npx playwright test --shard=$SHARD/4
  artifacts:
    when: always
    paths:
      - playwright-report/
    expire_in: 1 week
```

#### Jenkins Example

```groovy
pipeline {
    agent any
    stages {
        stage('Test') {
            parallel {
                stage('Shard 1/4') {
                    steps {
                        sh 'npx playwright test --shard=1/4'
                    }
                }
                stage('Shard 2/4') {
                    steps {
                        sh 'npx playwright test --shard=2/4'
                    }
                }
                stage('Shard 3/4') {
                    steps {
                        sh 'npx playwright test --shard=3/4'
                    }
                }
                stage('Shard 4/4') {
                    steps {
                        sh 'npx playwright test --shard=4/4'
                    }
                }
            }
        }
    }
}
```

## NPM Scripts

The following scripts are available for different scaling scenarios:

```bash
# Standard test run (auto-detects workers)
npm test

# Use 50% of CPU cores
npm run test:parallel

# Use 100% of CPU cores (maximum parallelization)
npm run test:max

# Run a specific shard (requires SHARD and SHARD_TOTAL env vars)
npm run test:shard
```

## Performance Tips

1. **Start Small**: Begin with 2-4 shards and increase based on your infrastructure
2. **Monitor Resources**: Watch CPU and memory usage - too many workers can slow things down
3. **Balance Shards**: Each shard should have roughly the same number of tests
4. **Use CI Parallelism**: Most CI systems support matrix builds for easy sharding
5. **Combine Strategies**: Use both sharding and workers for maximum speed

## Example: Scaling from 8 minutes to 2 minutes

**Before (Single Machine, 2 Workers):**
- Total time: ~8 minutes
- Tests: 100 tests across 3 browsers = 300 total

**After (4 Shards, 2 Workers Each):**
- Shard 1: ~2 minutes (75 tests)
- Shard 2: ~2 minutes (75 tests)
- Shard 3: ~2 minutes (75 tests)
- Shard 4: ~2 minutes (75 tests)
- **Total time: ~2 minutes** (all shards run in parallel)

## Troubleshooting

### Tests are flaky with high worker counts
- Reduce worker count: `PLAYWRIGHT_WORKERS=2 npm test`
- Check for shared resources (database, API rate limits)
- Ensure tests are properly isolated

### Shards have uneven test distribution
- Playwright automatically balances tests, but you can manually specify test files per shard
- Use `--grep` to filter tests if needed

### Out of memory errors
- Reduce worker count
- Reduce number of shards
- Increase CI machine memory

## Configuration Reference

Key configuration options in `playwright.config.ts`:

- `workers`: Auto-calculated based on CPU cores
- `shard`: Set via `SHARD` and `SHARD_TOTAL` environment variables
- `fullyParallel: true`: Enables parallel test execution
- `globalTimeout`: Maximum time for entire test suite
- `maxFailures`: Stop after N failures (CI only)

## Best Practices

1. **Test Isolation**: Ensure tests don't depend on execution order
2. **Resource Management**: Use test fixtures for shared resources
3. **Error Handling**: Use retries for flaky tests
4. **Reporting**: Combine reports from all shards for complete coverage
5. **Monitoring**: Track test execution times to optimize shard distribution

