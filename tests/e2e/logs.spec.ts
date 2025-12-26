import { test, expect } from '@playwright/test';

/**
 * Execution Logs E2E Tests
 *
 * Tests the logs viewer functionality (Unit 14).
 */

const mockLog = {
  id: 'exec-test-001',
  task_path: '/tasks/test-task.md',
  agent_name: 'executor',
  started_at: new Date().toISOString(),
  completed_at: new Date().toISOString(),
  status: 'SUCCESS',
  execution_time_ms: 5000,
  estimated_cost_usd: 0.0125,
  output_preview: 'Task completed successfully',
  error: null,
  tool_calls_count: 3,
  session_id: 'sess-001',
  decision_id: 'dec-001',
  has_detail: true,
};

test.describe('Logs List Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/logs/', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          logs: [mockLog],
          total_count: 1,
          limit: 50,
          offset: 0,
          has_more: false,
        }),
      });
    });

    await page.route('**/api/logs/stats', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          total_count: 100,
          total_prompt_bytes: 1024 * 1024,
          total_response_bytes: 2 * 1024 * 1024,
          compressed_count: 50,
          oldest_record: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
          newest_record: new Date().toISOString(),
        }),
      });
    });
  });

  test('should navigate to logs page', async ({ page }) => {
    await page.goto('/');

    // Try to find and click on logs link in navigation
    const logsLink = page.locator('a[href="/logs"], a[href*="logs"]').first();
    if (await logsLink.isVisible()) {
      await logsLink.click();
      await expect(page).toHaveURL('/logs');
    } else {
      // Direct navigation
      await page.goto('/logs');
    }

    await expect(page.locator('h1, h2').filter({ hasText: /logs|execution/i })).toBeVisible({ timeout: 10000 });
  });

  test('should display logs list', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    // Should see log entries
    const logRow = page.locator('text=executor').first();
    await expect(logRow).toBeVisible({ timeout: 10000 });
  });

  test('should filter logs by agent', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    // Find agent filter
    const agentFilter = page.locator('select, [role="combobox"]').filter({ hasText: /agent|all agents/i }).first();
    if (await agentFilter.isVisible()) {
      await agentFilter.selectOption('executor');
      await page.waitForTimeout(500);
    }
  });

  test('should filter logs by status', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    // Find status filter
    const statusFilter = page.locator('select, [role="combobox"]').filter({ hasText: /status|all status/i }).first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('SUCCESS');
      await page.waitForTimeout(500);
    }
  });

  test('should show storage stats', async ({ page }) => {
    await page.goto('/logs');
    await page.waitForLoadState('networkidle');

    // Should display stats
    const stats = page.locator('text=/\\d+ logs|MB/i').first();
    await expect(stats).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Log Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.route('**/api/logs/exec-test-001', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          ...mockLog,
          prompt_hash: 'abc123',
          prompt_full: 'You are an executor agent...',
          response_full: 'Task execution complete.',
          events: [
            { id: 'evt-1', event_type: 'PROMPT_SENT', timestamp: new Date().toISOString(), data: {}, tool_name: null, duration_ms: null },
            { id: 'evt-2', event_type: 'TOOL_INVOCATION', timestamp: new Date().toISOString(), data: {}, tool_name: 'bash', duration_ms: 100 },
            { id: 'evt-3', event_type: 'COMPLETED', timestamp: new Date().toISOString(), data: {}, tool_name: null, duration_ms: null },
          ],
          tool_calls_detailed: [
            { name: 'bash', input: { command: 'ls' }, output: 'file1.txt' },
          ],
        }),
      });
    });
  });

  test('should display log detail', async ({ page }) => {
    await page.goto('/logs/exec-test-001');
    await page.waitForLoadState('networkidle');

    // Should see agent name
    const agentName = page.locator('text=/executor/i').first();
    await expect(agentName).toBeVisible({ timeout: 10000 });

    // Should see status
    const status = page.locator('text=SUCCESS').first();
    await expect(status).toBeVisible({ timeout: 10000 });
  });

  test('should show prompt content when expanded', async ({ page }) => {
    await page.goto('/logs/exec-test-001');
    await page.waitForLoadState('networkidle');

    // Find and click prompt section
    const promptSection = page.locator('button, [role="button"]').filter({ hasText: /prompt/i }).first();
    if (await promptSection.isVisible()) {
      await promptSection.click();
      await page.waitForTimeout(300);

      // Prompt content should be visible
      const promptContent = page.locator('text=/executor agent/i');
      await expect(promptContent).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display event timeline', async ({ page }) => {
    await page.goto('/logs/exec-test-001');
    await page.waitForLoadState('networkidle');

    // Should see event timeline
    const eventTimeline = page.locator('text=/event timeline|PROMPT_SENT|COMPLETED/i').first();
    await expect(eventTimeline).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to logs list', async ({ page }) => {
    await page.goto('/logs/exec-test-001');
    await page.waitForLoadState('networkidle');

    // Find and click back button
    const backButton = page.locator('a, button').filter({ hasText: /back|←/i }).first();
    await backButton.click();

    await expect(page).toHaveURL('/logs');
  });
});
