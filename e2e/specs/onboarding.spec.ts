import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test('walks through onboarding: connect a platform, payout method, verify step, complete', async ({ page }) => {
  await login(page);
  await page.goto('/onboarding');

  // Step 0 — Connect Platforms. Shopify has no OAuth redirect (unlike
  // YouTube/TikTok/Stripe), so it's the simplest platform to toggle here.
  await expect(page.getByRole('heading', { name: /connect platforms/i })).toBeVisible();
  await page.getByRole('button', { name: /Shopify/i }).click();
  await expect(page.getByText('Connected').first()).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 1 — Payout method (defaults to "Kre8trix Balance", already selected).
  await expect(page.getByRole('heading', { name: /how you get paid/i })).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 2 — Verify Identity: live KYC status summary (D1), non-blocking.
  await expect(page.getByRole('heading', { name: /verify identity/i })).toBeVisible();
  await expect(page.getByText('Start Verification')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();

  // Step 3 — complete.
  await expect(page.getByText(/you're all set/i)).toBeVisible();
  await page.getByRole('button', { name: /go to dashboard/i }).click();
  await expect(page).toHaveURL(/\/dashboard$/);
});
