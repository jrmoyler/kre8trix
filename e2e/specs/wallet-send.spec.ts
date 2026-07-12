import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Wallet — creator-to-creator sends', () => {
  test('sends by @handle', async ({ page }) => {
    await login(page);
    await page.goto('/wallet?action=send');

    await page.getByLabel('Amount to send').fill('50');
    await page.getByLabel('Recipient').fill('@zaravibes');
    await expect(page.getByText(/sends to zara okafor/i)).toBeVisible();

    await page.getByRole('button', { name: /^send money$/i }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /sent \$50 to @zaravibes/i })).toBeVisible();
  });

  test('sends by raw deposit ID', async ({ page }) => {
    await login(page);
    await page.goto('/wallet?action=send');

    await page.getByLabel('Amount to send').fill('25');
    // A known seed creator deposit ID (@mikeplays) — routes as a raw-ID send.
    await page.getByLabel('Recipient').fill('qRv9rH2V29wEKcjaocc6G5uyEpDR529MYzRPMdR2kSqA');
    await page.getByRole('button', { name: /^send money$/i }).click();
    await expect(page.locator('[data-sonner-toast]').filter({ hasText: /sent \$25/i })).toBeVisible();
  });

  test('soft-gates sends of $1,000+ behind identity verification', async ({ page }) => {
    await login(page);
    await page.goto('/wallet?action=send');

    await page.getByLabel('Amount to send').fill('2000');
    await page.getByLabel('Recipient').fill('@zaravibes');

    await expect(page.getByText(/require identity verification/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /^send money$/i })).toBeDisabled();
  });
});
