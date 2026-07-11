import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test('logs in and lands on the dashboard', async ({ page }) => {
  await login(page);
  await expect(page).toHaveURL(/\/dashboard$/);
  await expect(page.getByRole('heading', { name: /dashboard/i }).first()).toBeVisible();
});

test('redirects unauthenticated visitors to login', async ({ page }) => {
  await page.goto('/wallet');
  await expect(page).toHaveURL(/\/login/);
});
