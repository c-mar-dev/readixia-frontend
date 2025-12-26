# Unit 13: E2E Integration Testing

End-to-end testing infrastructure for the Readixia frontend.

## Overview

This unit provides Playwright-based E2E tests for critical user workflows and a comprehensive manual integration test plan for validating the full Engine ↔ Frontend ↔ MDQ stack.

## Installation

Playwright was added to the project:

```bash
npm install -D @playwright/test
```

Install browsers (first time only):

```bash
npx playwright install
```

## Running Tests

### Automated E2E Tests

```bash
# Run all E2E tests
npm run test:e2e

# Run with Playwright UI (interactive)
npm run test:e2e:ui

# Run in headed mode (visible browser)
npm run test:e2e:headed

# Run specific test file
npx playwright test tests/e2e/decisions.spec.ts

# Run tests matching pattern
npx playwright test -g "should load"
```

### Manual Integration Tests

See `docs/INTEGRATION-TEST-PLAN.md` for the complete manual test checklist.

## Test Structure

```
tests/e2e/
├── decisions.spec.ts    # Decision queue loading, filtering
├── actions.spec.ts      # Resolve, defer, undo workflows
├── settings.spec.ts     # Settings page functionality
└── logs.spec.ts         # Execution logs viewer
```

## Writing New Tests

### Basic Test Structure

```typescript
import { test, expect } from '@playwright/test';

test.describe('Feature Name', () => {
  test('should do something', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1')).toBeVisible();
  });
});
```

### Mocking API Responses

```typescript
test('should handle API response', async ({ page }) => {
  await page.route('**/api/decisions/', (route) => {
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ decisions: [], total: 0 }),
    });
  });

  await page.goto('/');
  // Test with mocked response...
});
```

### Testing Real-Time Features

```typescript
test('should show connection status', async ({ page }) => {
  await page.goto('/');
  const indicator = page.locator('[data-testid="connection-indicator"]');
  await expect(indicator).toBeVisible();
});
```

## Configuration

See `playwright.config.ts` for full configuration:

- Base URL: `http://localhost:5173`
- Web server: Auto-starts `npm run dev`
- Screenshots: On failure only
- Traces: On first retry

## CI Integration

To add to CI, create `.github/workflows/e2e.yml`:

```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
      - run: npm ci
      - run: npx playwright install --with-deps
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```
