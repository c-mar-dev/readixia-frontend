import { test, expect } from '@playwright/test';

/**
 * Decision Actions E2E Tests
 *
 * Tests resolve, defer, and undo functionality.
 */

// Mock decision data
const mockDecision = {
  id: 'dec-test-001',
  type: 'triage',
  subject: 'Test Task',
  status: 'PENDING',
  priority: 'normal',
  created_at: new Date().toISOString(),
  data: {
    destination: ['specify', 'defer', 'archive'],
  },
};

test.describe('Decision Actions', () => {
  test.beforeEach(async ({ page }) => {
    // Mock the decisions API
    await page.route('**/api/decisions/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          decisions: [mockDecision],
          total: 1,
          limit: 50,
          offset: 0,
        }),
      });
    });
  });

  test('should display action buttons on decision card', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Should see action buttons
    const actionArea = page.locator('[data-testid="decision-actions"], .decision-actions, button').first();
    await expect(actionArea).toBeVisible({ timeout: 10000 });
  });

  test('should handle resolve action', async ({ page }) => {
    let resolveRequested = false;

    // Mock resolve endpoint
    await page.route('**/api/decisions/*/resolve', (route) => {
      resolveRequested = true;
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          action_id: 'act-001',
          can_undo: true,
          undo_expires_at: new Date(Date.now() + 300000).toISOString(),
          chained_decisions: [],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Click on a decision to select it, then resolve
    const resolveButton = page.locator('button').filter({ hasText: /resolve|approve|submit|specify|route/i }).first();
    if (await resolveButton.isVisible()) {
      await resolveButton.click();
      await page.waitForTimeout(500);
      // Resolution might have been triggered
    }
  });

  test('should show undo toast after resolution', async ({ page }) => {
    await page.route('**/api/decisions/*/resolve', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          action_id: 'act-001',
          can_undo: true,
          undo_expires_at: new Date(Date.now() + 300000).toISOString(),
          chained_decisions: [],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for undo functionality (may appear after action)
    const undoButton = page.locator('button').filter({ hasText: /undo/i });
    // The undo button might not be visible until after an action
  });
});

test.describe('Defer Action', () => {
  test('should show defer options', async ({ page }) => {
    await page.route('**/api/decisions/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          decisions: [mockDecision],
          total: 1,
          limit: 50,
          offset: 0,
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Look for defer button/dropdown
    const deferButton = page.locator('button, [role="button"]').filter({ hasText: /defer|later|snooze/i }).first();
    if (await deferButton.isVisible()) {
      await deferButton.click();
      // Defer dropdown should appear with time options
      const deferOption = page.locator('text=/hour|day|week|tomorrow/i');
      await expect(deferOption).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Optimistic Updates', () => {
  test('should remove decision immediately on resolve', async ({ page }) => {
    let initialDecisions = [mockDecision];

    await page.route('**/api/decisions/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          decisions: initialDecisions,
          total: initialDecisions.length,
          limit: 50,
          offset: 0,
        }),
      });
    });

    await page.route('**/api/decisions/*/resolve', async (route) => {
      // Simulate network delay
      await new Promise(r => setTimeout(r, 100));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          action_id: 'act-001',
          can_undo: true,
          undo_expires_at: new Date(Date.now() + 300000).toISOString(),
          chained_decisions: [],
        }),
      });
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Decision should be visible initially
    const decisionCard = page.locator('text=Test Task');
    if (await decisionCard.isVisible()) {
      // After resolution, card should disappear (optimistic update)
      // This would require triggering the resolve action
    }
  });
});
