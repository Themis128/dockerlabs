# Prioritized Action Plan - Code Quality Improvements

Based on the Ollama code analysis report, here's a prioritized action plan to improve code quality, security, and maintainability.

## ✅ Already Fixed/Verified

1. **Type Checking**: ✅ **ENABLED** in `nuxt.config.ts` (line 56: `typeCheck: true`)
   - The report incorrectly stated this was disabled
   - Current status: Working correctly

2. **Playwright Timeouts**: ✅ **ALREADY USING CONSTANTS**
   - Timeouts are defined as constants in `playwright.config.ts` (lines 9-13)
   - Current status: Best practice already implemented

3. **Environment Variables**: ✅ **PROPERLY CONFIGURED**
   - Using environment variables with sensible defaults
   - Comments indicate HTTPS for production
   - Current status: Good for development, ready for production

## 🔴 High Priority (Security & Critical Issues)

### 1. Production HTTPS Configuration
**Status**: Development uses HTTP (acceptable), Production needs HTTPS

**Action Items**:
- [ ] Create `.env.production` template with HTTPS URLs
- [ ] Add validation to ensure HTTPS in production builds
- [ ] Update deployment documentation

**Files to Update**:
- `nuxt.config.ts` - Add production URL validation
- `.env.example` - Add production examples
- `docs/DEPLOYMENT.md` - Document HTTPS requirements

**Code Example**:
```typescript
// In nuxt.config.ts
runtimeConfig: {
  public: {
    apiBase: process.env.API_BASE_URL || '/api',
    pythonServerUrl: process.env.PYTHON_SERVER_URL ||
      (process.env.NODE_ENV === 'production'
        ? 'https://api.yourdomain.com'
        : 'http://localhost:3000'),
  },
}
```

### 2. Input Validation & Sanitization
**Status**: Needs review

**Action Items**:
- [ ] Review API endpoints for input validation
- [ ] Add sanitization for user inputs
- [ ] Implement rate limiting for API calls

**Files to Review**:
- `server/api/*.ts` - All API endpoints
- `composables/useApi.ts` - API client

## 🟡 Medium Priority (Code Quality)

### 3. Constants Organization
**Status**: Partially implemented

**Action Items**:
- [ ] Review `utils/constants.ts` for completeness
- [ ] Move magic strings from config files to constants
- [ ] Document all constants

**Files to Update**:
- `nuxt.config.ts` - Extract magic strings
- `utils/constants.ts` - Add missing constants

### 4. Documentation Improvements
**Status**: Good, but can be enhanced

**Action Items**:
- [ ] Add JSDoc comments to complex functions
- [ ] Document API endpoints
- [ ] Add inline comments for complex logic

**Files to Update**:
- `composables/*.ts` - Add function documentation
- `server/api/*.ts` - Document endpoints
- `components/*.vue` - Add component documentation

### 5. Type Definition Cleanup
**Status**: Generated files (`.nuxt/*.d.ts`) - Low priority

**Action Items**:
- [ ] Note: `.nuxt/*.d.ts` files are auto-generated
- [ ] Focus on custom type definitions in `types/*.ts`
- [ ] Review and simplify custom types

**Files to Review**:
- `types/*.ts` - Custom type definitions

## 🟢 Low Priority (Nice to Have)

### 6. Test Configuration Optimization
**Status**: Already optimized

**Current Configuration**:
- Retries: 2 in CI (reasonable)
- Timeouts: Defined as constants (good)
- Workers: 2 (balanced)

**Optional Improvements**:
- [ ] Add test stability checks
- [ ] Implement flaky test detection
- [ ] Add performance benchmarks

### 7. Code Organization
**Status**: Well organized

**Optional Improvements**:
- [ ] Group related exports in declaration files
- [ ] Organize imports alphabetically
- [ ] Add barrel exports where appropriate

## 📋 Implementation Checklist

### Week 1: Security & Critical
- [ ] Day 1-2: Production HTTPS configuration
- [ ] Day 3-4: Input validation review
- [ ] Day 5: Security audit

### Week 2: Code Quality
- [ ] Day 1-2: Constants organization
- [ ] Day 3-4: Documentation improvements
- [ ] Day 5: Type definition cleanup

### Week 3: Polish
- [ ] Day 1-2: Test optimization
- [ ] Day 3-4: Code organization
- [ ] Day 5: Final review

## 🎯 Quick Wins (Can Do Now)

1. **Add Production Environment Template**
   ```bash
   # Create .env.production.example
   cp .env.example .env.production.example
   # Update with HTTPS URLs
   ```

2. **Add URL Validation Helper**
   ```typescript
   // utils/validation.ts
   export function validateProductionUrl(url: string): boolean {
     if (process.env.NODE_ENV === 'production') {
       return url.startsWith('https://');
     }
     return true;
   }
   ```

3. **Document Constants**
   ```typescript
   // utils/constants.ts
   /**
    * Default API base URL
    * Uses relative path in production, absolute in development
    */
   export const DEFAULT_API_BASE = '/api';
   ```

## 📊 Progress Tracking

- **High Priority**: 0/2 completed
- **Medium Priority**: 0/3 completed
- **Low Priority**: 0/2 completed

**Overall Progress**: 0/7 items

## 🔍 Next Analysis

Run analysis on specific files:
```bash
# Analyze a specific file
npm run analyze:ollama -- -FilePath "server/api/pis.ts"

# Analyze composables
npm run analyze:ollama -- -FilePath "composables/useApi.ts"

# Analyze components
npm run analyze:ollama -- -FilePath "components/DashboardTab.vue"
```

## 📝 Notes

- The initial analysis report had some inaccuracies (type checking was already enabled)
- Most critical issues are production-related, not development blockers
- Code quality is generally good, improvements are incremental
- Focus on security and documentation for maximum impact

