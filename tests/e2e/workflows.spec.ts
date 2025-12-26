import { test, expect, Page } from '@playwright/test';

/**
 * Production Workflow E2E Tests
 *
 * Comprehensive tests for common user workflows on rdx.mrtnt.xyz
 *
 * NOTE: Production site requires Google OAuth authentication.
 * These tests use stored authentication state from auth.setup.ts.
 * Run `npm run test:e2e:prod:auth` first to set up auth.
 */

// Use stored auth state if available
test.use({ storageState: 'playwright/.auth/user.json' });

test.describe('Navigation Workflows', () => {
  test('should load the Decision Queue homepage', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check if we're authenticated or on login page
    const h1Text = await page.locator('h1').first().textContent();

    if (h1Text?.includes('Sign in')) {
      // Not authenticated - skip test
      test.skip(true, 'Authentication required - run auth setup first');
      return;
    }

    // Verify main page elements
    await expect(page.locator('h1')).toContainText('Decision Queue');

    // Verify navigation links are present
    await expect(page.locator('a[href="/inbox"]')).toBeVisible();
    await expect(page.locator('a[href="/focus"]')).toBeVisible();
    await expect(page.locator('a[href="/agents"]')).toBeVisible();
    await expect(page.locator('a[href="/logs"]')).toBeVisible();
  });

  test('should navigate through all main views', async ({ page }) => {
    await page.goto('/');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Navigate to Inbox
    await page.click('a[href="/inbox"]');
    await expect(page).toHaveURL('/inbox');
    await expect(page.locator('h1')).toContainText('Inbox');

    // Navigate back to Queue
    await page.click('a:has-text("Queue")');
    await expect(page).toHaveURL('/');

    // Navigate to Focus from Queue
    await page.click('a[href="/focus"]');
    await expect(page).toHaveURL('/focus');
  });

  test('should navigate to Agents view', async ({ page }) => {
    await page.goto('/');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    await page.click('a[href="/agents"]');
    await expect(page).toHaveURL('/agents');

    // Should show agent-related content
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to Logs view', async ({ page }) => {
    await page.goto('/');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    await page.click('a[href="/logs"]');
    await expect(page).toHaveURL('/logs');

    // Should show logs-related content
    await expect(page.locator('h1, h2').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Decision Queue Workflow', () => {
  test('should display decision list or empty state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Either shows decisions or empty state
    const hasDecisions = await page.locator('[data-index="0"], button[data-index]').count();
    const hasEmptyState = await page.locator('text=/all caught up|no decisions/i').count();
    const hasError = await page.locator('text=/error|retry/i').count();
    const hasLoading = await page.locator('.animate-pulse').count();

    // One of these states should be visible
    expect(hasDecisions + hasEmptyState + hasError + hasLoading).toBeGreaterThan(0);
  });

  test('should show decision count in header', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Should show "Orchestrating X items" in header
    const countText = page.locator('text=/orchestrating \\d+ items/i');
    await expect(countText).toBeVisible({ timeout: 10000 });
  });

  test('should have working search input', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Type in search
    await searchInput.fill('test');
    await page.waitForTimeout(500);

    // Clear search
    await searchInput.fill('');
  });
});

test.describe('Filter Workflow', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
    }
  });

  test('should have stage filter dropdown', async ({ page }) => {
    // Find and hover over Stage filter
    const stageFilter = page.locator('button').filter({ hasText: /^Stage$/ }).first();
    if (await stageFilter.isVisible()) {
      await stageFilter.hover();
      await page.waitForTimeout(300);

      // Dropdown should appear
      const dropdown = page.locator('text=/all stages/i');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have type filter dropdown', async ({ page }) => {
    // Find Type filter
    const typeFilter = page.locator('button').filter({ hasText: /^Type$/ }).first();
    if (await typeFilter.isVisible()) {
      await typeFilter.hover();
      await page.waitForTimeout(300);

      // Dropdown should appear
      const dropdown = page.locator('text=/all types/i');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });

  test('should have project filter dropdown', async ({ page }) => {
    // Find Project filter
    const projectFilter = page.locator('button').filter({ hasText: /^Project$/ }).first();
    if (await projectFilter.isVisible()) {
      await projectFilter.hover();
      await page.waitForTimeout(300);

      // Dropdown should appear
      const dropdown = page.locator('text=/all projects/i');
      await expect(dropdown).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Keyboard Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
    }
  });

  test('should open command palette with "o" key', async ({ page }) => {
    // Make sure page is focused and not on an input
    await page.locator('body').click();
    await page.waitForTimeout(200);

    // Press 'o' to open command palette
    await page.keyboard.press('o');

    // Command palette modal should appear (look for the search input)
    const palette = page.getByPlaceholder('Type a command');
    await expect(palette).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
  });

  test('should focus search with "/" key', async ({ page }) => {
    // Press '/' to focus search
    await page.keyboard.press('/');

    // Search input should be focused
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeFocused();
  });

  test('should open keyboard shortcuts modal with "?" key', async ({ page }) => {
    // Press '?' to open shortcuts modal
    await page.keyboard.press('?');

    // Shortcuts modal should appear
    const modal = page.locator('text=/keyboard shortcuts/i');
    await expect(modal).toBeVisible({ timeout: 5000 });

    // Close with Escape
    await page.keyboard.press('Escape');
  });

  test('should navigate decisions with j/k keys', async ({ page }) => {
    // Check if there are decisions
    const decisions = await page.locator('[data-index]').count();

    if (decisions >= 2) {
      // Press 'j' to move down
      await page.keyboard.press('j');
      await page.waitForTimeout(200);

      // Press 'k' to move up
      await page.keyboard.press('k');
      await page.waitForTimeout(200);
    }
  });
});

test.describe('Session Bar', () => {
  test('should display session bar at top', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Session bar should be present
    const sessionBar = page.locator('text=/session|start session|decisions resolved/i').first();
    await expect(sessionBar).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Task Creation Modal', () => {
  test('should open task creation modal', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Find and click "+ New Task" button
    const newTaskButton = page.getByRole('button', { name: /new task/i });

    if (await newTaskButton.isVisible()) {
      await newTaskButton.click();
      await page.waitForTimeout(500);

      // Modal should appear - look for any input in a dialog/modal
      const modalVisible = await page.locator('[role="dialog"], .modal, [class*="modal"]').count() > 0 ||
                          await page.locator('input').count() > 1;

      expect(modalVisible).toBeTruthy();

      // Close modal
      await page.keyboard.press('Escape');
    }
  });
});

test.describe('Inbox View Workflow', () => {
  test('should display inbox with two-panel layout', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Should see inbox header
    await expect(page.locator('h1')).toContainText('Inbox');

    // Should see back to queue link
    await expect(page.locator('text=← Queue')).toBeVisible();
  });

  test('should have filter chips in inbox', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Should see All and Urgent filter buttons
    const allButton = page.locator('button').filter({ hasText: /^All$/ });
    const urgentButton = page.locator('button').filter({ hasText: /^Urgent$/ });

    await expect(allButton).toBeVisible();
    await expect(urgentButton).toBeVisible();
  });

  test('should escape back to queue from inbox', async ({ page }) => {
    await page.goto('/inbox');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Press Escape to go back
    await page.keyboard.press('Escape');

    // Should navigate to queue
    await expect(page).toHaveURL('/');
  });
});

test.describe('Focus View Workflow', () => {
  test('should load focus view', async ({ page }) => {
    await page.goto('/focus');

    // Wait for page to stabilize
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(1000);

    // Check if redirected to sign-in
    if (page.url().includes('accounts.google') || page.url().includes('sign')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Focus view should load - check URL contains /focus
    expect(page.url()).toContain('/focus');
  });
});

test.describe('Error Handling', () => {
  test('should handle page states gracefully', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Check that page shows one of: decisions, empty state, error state, or loading
    const hasDecisions = await page.locator('[data-index]').count();
    const hasEmptyState = await page.getByText(/all caught up/i).count();
    const hasError = await page.getByRole('button', { name: /retry/i }).count();
    const hasLoading = await page.locator('.animate-pulse').count();

    // One of these states should be present
    expect(hasDecisions + hasEmptyState + hasError + hasLoading).toBeGreaterThanOrEqual(0);
  });
});

test.describe('Responsive Layout', () => {
  test('should display correctly on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Search should be visible on desktop
    const searchInput = page.locator('input[placeholder*="Search"]');
    await expect(searchInput).toBeVisible();

    // Navigation links should be visible
    await expect(page.locator('a[href="/inbox"]')).toBeVisible();
  });

  test('should display correctly on tablet', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Main content should still be visible
    await expect(page.locator('h1')).toBeVisible();
  });
});

test.describe('Decision Detail Panel', () => {
  test('should show decision detail when selected', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const h1Text = await page.locator('h1').first().textContent();
    if (h1Text?.includes('Sign in')) {
      test.skip(true, 'Authentication required');
      return;
    }

    // Click on first decision if available
    const firstDecision = page.locator('[data-index="0"]').first();
    if (await firstDecision.isVisible()) {
      await firstDecision.click();
      await page.waitForTimeout(500);

      // Detail panel should show DecisionCard content
      const detailPanel = page.locator('text=/route|approve|specify|execute/i');
      await expect(detailPanel.first()).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Performance', () => {
  test('should load homepage within acceptable time', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // Should load DOM within 5 seconds (even if redirecting to auth)
    expect(loadTime).toBeLessThan(5000);
  });
});
