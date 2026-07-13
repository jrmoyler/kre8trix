import type { Page } from '@playwright/test';

/**
 * The mock backend accepts any well-formed email + a password of 6+
 * characters (see registerRoute('POST', '/auth/login', ...) in
 * src/backend/handlers.ts) — there's no real credential store to
 * seed, so any consistent fake identity works for every test run.
 */
export const TEST_EMAIL = 'alex@kre8trix.app';
export const TEST_PASSWORD = 'password123';

export async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  // The login/signup mode toggle is also a "Sign In"-labeled button —
  // scope to the actual form submit button to avoid ambiguity.
  await page.locator('button[type="submit"]').click();
  await page.waitForURL('**/dashboard');
}
