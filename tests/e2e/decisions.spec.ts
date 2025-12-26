import { test, expect } from '@playwright/test';

/**
 * Decision List E2E Tests
 *
 * Tests the main decision queue functionality.
 */

test.describe('Decision Queue', () => {
  test('should load the main queue page', async ({ page }) => {
    await page.goto('/');

    // Should see the page title or header
    await expect(page.locator('h1, h2').first()).toBeVisible();
  });

  test('should display loading state while fetching decisions', async ({ page }) => {
    await page.goto('/');

    // Either shows loading skeleton or the decision list
    const hasContent = await page.locator('[data-testid="decision-list"], .animate-pulse').count();
    expect(hasContent).toBeGreaterThan(0);
  });

  test('should show empty state when no decisions', async ({ page }) => {
    // Mock empty response
    await page.route('**/api/decisions/**', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ decisions: [], total: 0, limit: 50, offset: 0 }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show empty state message
    const emptyState = page.locator('text=/all caught up|no decisions/i');
    await expect(emptyState).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to inbox view', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/inbox"]');
    await expect(page).toHaveURL('/inbox');
  });

  test('should navigate to focus view', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/focus"]');
    await expect(page).toHaveURL('/focus');
  });
});

test.describe('Decision Filtering', () => {
  test('should filter by decision type', async ({ page }) => {
    await page.goto('/');

    // Look for filter controls
    const filterButton = page.locator('button, select').filter({ hasText: /type|filter|stage/i }).first();
    if (await filterButton.isVisible()) {
      await filterButton.click();
      // Select a filter option if dropdown appears
      const option = page.locator('option, [role="option"]').first();
      if (await option.isVisible()) {
        await option.click();
      }
    }
  });
});

test.describe('Error Handling', () => {
  test('should show error state when API fails', async ({ page }) => {
    // Mock error response
    await page.route('**/api/decisions/**', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'DE-SVC-001', message: 'Service unavailable' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should show error state with retry button
    const errorState = page.locator('text=/error|failed|retry/i');
    await expect(errorState).toBeVisible({ timeout: 10000 });
  });

  test('should show retry button on error', async ({ page }) => {
    await page.route('**/api/decisions/**', (route) => {
      route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ code: 'DE-SVC-001', message: 'Service unavailable' }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const retryButton = page.locator('button').filter({ hasText: /retry|try again/i });
    await expect(retryButton).toBeVisible({ timeout: 10000 });
  });
});
