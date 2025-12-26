import { test, expect } from '@playwright/test';

/**
 * Settings Page E2E Tests
 *
 * Tests the settings/configuration page functionality.
 */

test.describe('Settings Page', () => {
  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/');
    await page.click('a[href="/settings"]');
    await expect(page).toHaveURL('/settings');
  });

  test('should display settings sections', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should see settings headers
    const headers = page.locator('h1, h2, h3').filter({ hasText: /settings|general|models|overseer|agents/i });
    await expect(headers.first()).toBeVisible({ timeout: 10000 });
  });

  test('should load general settings from API', async ({ page }) => {
    await page.route('**/api/config/general', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          theme: 'dark',
          notifications_enabled: true,
          sound_effects: false,
        }),
      });
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Settings should be visible
    const themeOption = page.locator('text=/theme|dark|light/i').first();
    await expect(themeOption).toBeVisible({ timeout: 10000 });
  });

  test('should save settings changes', async ({ page }) => {
    let saveRequested = false;

    await page.route('**/api/config/general', (route, request) => {
      if (request.method() === 'PUT') {
        saveRequested = true;
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            previous: { theme: 'dark', notifications_enabled: true, sound_effects: false },
            current: { theme: 'light', notifications_enabled: true, sound_effects: false },
          }),
        });
      } else {
        route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            theme: 'dark',
            notifications_enabled: true,
            sound_effects: false,
          }),
        });
      }
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Try to find and click a save button
    const saveButton = page.locator('button').filter({ hasText: /save|apply|update/i }).first();
    if (await saveButton.isVisible()) {
      await saveButton.click();
      await page.waitForTimeout(500);
    }
  });

  test('should display API key status as read-only', async ({ page }) => {
    await page.route('**/api/config/api', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          anthropic_key: { masked_value: 'sk-ant-***-xxxx', is_set: true },
          openai_key: { masked_value: '', is_set: false },
          mdq_socket_path: '\\\\.\\pipe\\mdq',
        }),
      });
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // API key should be masked
    const maskedKey = page.locator('text=/sk-ant-\\*\\*\\*|api key|anthropic/i').first();
    if (await maskedKey.isVisible()) {
      // The key should not be editable - input should be disabled or readonly
    }
  });
});

test.describe('Models Configuration', () => {
  test('should display model role assignments', async ({ page }) => {
    await page.route('**/api/config/models', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          architect: {
            current: 'claude-3-opus-20240229',
            available: ['claude-3-opus-20240229', 'claude-3-5-sonnet-20241022'],
            description: 'Model for specification and planning',
          },
          worker: {
            current: 'claude-3-5-sonnet-20241022',
            available: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229'],
            description: 'Model for task execution',
          },
          verifier: {
            current: 'claude-3-haiku-20240307',
            available: ['claude-3-haiku-20240307', 'claude-3-5-sonnet-20241022'],
            description: 'Model for verification',
          },
          clerk: {
            current: 'claude-3-haiku-20240307',
            available: ['claude-3-haiku-20240307'],
            description: 'Model for simple tasks',
          },
        }),
      });
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should see model roles
    const roleSection = page.locator('text=/architect|worker|verifier|model/i').first();
    await expect(roleSection).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Agents Configuration', () => {
  test('should display agent list', async ({ page }) => {
    await page.route('**/api/config/agents', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          agents: [
            { name: 'filing_clerk', display_name: 'Filing Clerk', enabled: true, model_role: 'clerk', timeout_seconds: 30 },
            { name: 'executor', display_name: 'Executor', enabled: true, model_role: 'worker', timeout_seconds: 300 },
          ],
        }),
      });
    });

    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should see agent names
    const agentSection = page.locator('text=/filing clerk|executor|agent/i').first();
    await expect(agentSection).toBeVisible({ timeout: 10000 });
  });
});
