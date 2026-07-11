import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';

test.describe('Compliance Console', () => {
  test('AML Monitoring loads with seeded alert data', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await login(page);
    await page.goto('/compliance/aml');

    await expect(page.getByRole('heading', { name: 'AML Monitoring', level: 2 })).toBeVisible();
    await expect(page.getByText(/internal compliance ops view/i)).toBeVisible();
    await expect(page.getByText('OPEN ALERTS')).toBeVisible();
    // Seeded alerts (see seedAmlAlerts in src/lib/mock/state.ts).
    await expect(page.getByText(/round-trip conversion flagged for review/i)).toBeVisible();

    expect(errors).toEqual([]);
  });

  test('AML alert detail panel supports notes and status changes', async ({ page }) => {
    await login(page);
    await page.goto('/compliance/aml');

    await page.getByText(/round-trip conversion flagged for review/i).click();
    await expect(page.getByText('RELATED TRANSACTIONS')).toBeVisible();

    await page.getByLabel('Add a note').fill('Reviewed during E2E test run.');
    await page.getByRole('button', { name: 'Add' }).click();
    await expect(page.getByText('Reviewed during E2E test run.')).toBeVisible();
  });

  test('Audit Log loads and verifies its hash chain', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));

    await login(page);
    await page.goto('/compliance/audit-log');

    await expect(page.getByRole('heading', { name: 'Audit Log', level: 2 })).toBeVisible();
    await page.getByRole('button', { name: /verify chain integrity/i }).click();
    await expect(page.getByText('Chain verified', { exact: true })).toBeVisible();

    expect(errors).toEqual([]);
  });
});
