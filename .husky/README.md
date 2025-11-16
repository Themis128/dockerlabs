# Husky Git Hooks - Lenient Configuration

This project uses Husky with **lenient** (non-blocking) hooks that allow commits and pushes even when checks fail.

## Hook Behavior

### Pre-commit Hook
- ✅ **Non-blocking**: Warnings and errors are shown but don't prevent commits
- ✅ **TypeScript checks**: Runs but allows warnings
- ✅ **Python syntax**: Checks but doesn't block
- ✅ **JSON validation**: Validates but doesn't block

### Pre-push Hook
- ✅ **Non-blocking**: Test failures are shown but don't prevent pushes
- ✅ **Playwright tests**: Runs but doesn't block on failure

## Skipping Hooks

### Option 1: Environment Variable
```bash
# Skip all hooks
SKIP_HOOKS=true git commit -m "message"
SKIP_HOOKS=true git push

# Or disable Husky entirely
HUSKY=0 git commit -m "message"
```

### Option 2: Git Flag
```bash
# Skip pre-commit hook
git commit --no-verify -m "message"

# Skip pre-push hook
git push --no-verify
```

### Option 3: Skip Tests Only
```bash
# Skip tests in pre-push hook
SKIP_TESTS=true git push
```

## Making Hooks Strict Again

If you want to make hooks blocking again, edit the hooks and:
1. Change `exit 0` to `exit 1` on failures
2. Remove the "non-blocking" logic
3. Remove the lenient mode messages

## Current Configuration

- **Pre-commit**: Lenient (warnings allowed, non-blocking)
- **Pre-push**: Lenient (test failures non-blocking)

All hooks can be bypassed with `--no-verify` or environment variables.
