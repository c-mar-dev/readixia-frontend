import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright E2E Test Configuration for Production
 *
 * Tests against https://rdx.mrtnt.xyz/
 *
 * Run tests:
 *   npm run test:e2e:prod:auth   # Set up authentication (run once)
 *   npm run test:e2e:prod        # Run production tests
 *   npm run test:e2e:prod:ui     # Run with UI mode
 */
export default defineConfig({
  testDir: './tests/e2e',
  testMatch: ['**/workflows.spec.ts', '**/production.spec.ts', '**/auth*.setup.ts'],

  // Run tests in parallel
  fullyParallel: true,

  // Fail the build on CI if you accidentally left test.only in the source code
  forbidOnly: !!process.env.CI,

  // Retry on CI only (not in auth setup)
  retries: process.env.CI ? 2 : 0,

  // Single worker for production tests to avoid rate limiting
  workers: 1,

  // Reporter to use
  reporter: [
    ['html', { open: 'never', outputFolder: 'playwright-report-production' }],
    ['list'],
  ],

  // Shared settings for all projects
  use: {
    // Base URL for production
    baseURL: 'https://rdx.mrtnt.xyz',

    // Collect trace when retrying the failed test
    trace: 'on-first-retry',

    // Screenshot on failure
    screenshot: 'only-on-failure',

    // Longer timeout for production (network latency)
    actionTimeout: 15000,
    navigationTimeout: 30000,

    // Video on failure for debugging
    video: 'on-first-retry',
  },

  // Global timeout per test
  timeout: 60000,

  // Configure projects for different browsers
  projects: [
    // Auth setup project - run this first to authenticate
    // Uses real Chrome to bypass Google's "insecure browser" detection
    {
      name: 'auth-setup',
      testMatch: /auth\.setup\.ts/,
      use: {
        channel: 'chrome', // Use installed Chrome, not Playwright Chromium
      },
    },
    // Manual auth - uses existing Chrome profile
    {
      name: 'auth-manual',
      testMatch: /auth-manual\.setup\.ts/,
      use: {
        channel: 'chrome',
      },
    },
    // Main tests with stored auth
    {
      name: 'chromium',
      testMatch: /workflows\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
        // Use stored auth state
        storageState: 'playwright/.auth/user.json',
      },
    },
    // Standalone tests that handle auth themselves
    {
      name: 'chromium-standalone',
      testMatch: /workflows\.spec\.ts/,
      use: {
        ...devices['Desktop Chrome'],
      },
    },
  ],

  // No webServer - we're testing against production
});
