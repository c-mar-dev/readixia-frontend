import { test as setup, expect } from '@playwright/test';

/**
 * Manual Authentication Setup
 *
 * Opens the site and waits for you to complete authentication.
 * Uses real Chrome browser to avoid Google's security blocks.
 *
 * Usage:
 *   npm run test:e2e:prod:auth-manual
 */

const authFile = 'playwright/.auth/user.json';

setup('authenticate manually', async ({ page, context }) => {
  console.log('\n');
  console.log('='.repeat(60));
  console.log('MANUAL AUTHENTICATION');
  console.log('='.repeat(60));
  console.log('');
  console.log('1. Browser will open to rdx.mrtnt.xyz');
  console.log('2. Complete the Google OAuth login manually');
  console.log('3. Once you see Decision Queue, auth will be saved');
  console.log('');
  console.log('Navigating to site...');

  // Navigate to the site
  await page.goto('https://rdx.mrtnt.xyz/');
  await page.waitForLoadState('load');

  console.log('Page loaded. Current URL:', page.url());

  // Check current state
  const h1 = page.locator('h1').first();
  await h1.waitFor({ timeout: 10000 });
  const h1Text = await h1.textContent();

  console.log('Page header:', h1Text);

  if (h1Text?.includes('Decision Queue')) {
    console.log('Already authenticated!');
  } else {
    console.log('');
    console.log('Waiting for you to complete login...');
    console.log('(You have 2 minutes)');
    console.log('');

    // Wait for authentication to complete
    await page.waitForSelector('h1:has-text("Decision Queue")', {
      timeout: 120000,
    });

    console.log('Authentication successful!');
  }

  // Save auth state
  await context.storageState({ path: authFile });

  console.log('');
  console.log('Auth state saved to:', authFile);
  console.log('');
  console.log('You can now run: npm run test:e2e:prod:authed');
  console.log('');
});
