import { test, expect } from '@playwright/test';

/*
 * E4 — smoke test against the REAL backend (server/index.ts).
 *
 * Runs only via `npm run test:e2e:api` (E2E_API=1), which boots an
 * ephemeral API server on :4000 and vite with VITE_API_URL=/api. The
 * rest of the suite keeps running against the in-browser mock, where
 * seeded fixture data (Alex Chen) is guaranteed.
 */

test.describe('real API smoke', () => {
  test.skip(!process.env.E2E_API, 'requires the real API server — use npm run test:e2e:api');

  // The wrong-password test needs the account the first test provisions.
  test.describe.configure({ mode: 'serial' });

  // Unique per run so re-runs against a persistent server also pass.
  const email = `smoke-${Date.now()}@kre8trix.dev`;
  const password = 'secret123';

  test('provisions an account, sends money, and persists across reload', async ({ page }) => {
    // First login auto-provisions the account (demo mode).
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(email);
    await page.getByLabel(/password/i).fill(password);
    await page.locator('button[type="submit"]').click();
    await page.waitForURL('**/dashboard');

    // Send $50 to a seeded creator through the real API.
    await page.goto('/wallet?action=send');
    await page.getByLabel('Amount to send').fill('50');
    await page.getByLabel('Recipient').fill('@zaravibes');
    await page.getByRole('button', { name: /^send money$/i }).click();
    await expect(
      page.locator('[data-sonner-toast]').filter({ hasText: /sent \$50 to @zaravibes/i }),
    ).toBeVisible();

    // Reload: the JWT re-authenticates via /auth/me and the transaction
    // comes back from server-side state, not browser storage.
    await page.reload();
    await page.goto('/wallet?action=history');
    await expect(page.getByText('Sent to @zaravibes').first()).toBeVisible();
  });

  test('rejects a wrong password for an existing account', async ({ page }) => {
    const response = await page.request.post('/api/auth/login', {
      data: { email, password: 'not-the-password' },
    });
    expect(response.status()).toBe(401);
    const body = (await response.json()) as { message: string };
    expect(body.message).toMatch(/invalid email or password/i);
  });

  test('rejects requests with a forged token', async ({ page }) => {
    const response = await page.request.get('/api/wallet/balances', {
      headers: { Authorization: 'Bearer not.a.jwt' },
    });
    expect(response.status()).toBe(401);
  });
});
