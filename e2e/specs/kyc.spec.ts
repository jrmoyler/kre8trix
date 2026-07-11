import { test, expect } from '@playwright/test';
import { login } from '../fixtures/auth';
import path from 'path';
import fs from 'fs';
import os from 'os';

async function fillPersonalInfo(page: import('@playwright/test').Page, legalName: string) {
  await page.getByRole('button', { name: /Individual Creator/i }).click();
  await page.locator('#kyc-legal-name').fill(legalName);
  await page.locator('#kyc-dob').fill('1990-01-01');
  await page.locator('#kyc-ssn').fill('1234');
  await page.locator('#kyc-address').fill('123 Main St');
  await page.locator('#kyc-country').fill('USA');
  await page.getByRole('button', { name: 'Continue' }).click();
}

test.describe('KYC/KYB identity verification', () => {
  test('submits successfully and eventually shows verified', async ({ page }) => {
    await login(page);
    await page.goto('/kyc');
    await expect(page.getByRole('heading', { name: /identity verification/i })).toBeVisible();

    await fillPersonalInfo(page, 'Alex Chen');

    // Document upload — metadata only, no real file processing.
    await expect(page.getByRole('heading', { name: /upload documents/i })).toBeVisible();
    const tmpFile = path.join(os.tmpdir(), 'kre8trix-e2e-id.txt');
    fs.writeFileSync(tmpFile, 'fake id contents');
    await page.locator('input[type="file"]').setInputFiles(tmpFile);
    await expect(page.getByText('kre8trix-e2e-id.txt')).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Selfie match — "Simulate Capture", never a real camera prompt.
    await expect(page.getByRole('heading', { name: /selfie match/i })).toBeVisible();
    await page.getByRole('button', { name: /simulate capture/i }).click();
    await expect(page.getByText(/match confirmed/i)).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();

    // Review & submit.
    await expect(page.getByRole('heading', { name: /review & submit/i })).toBeVisible();
    await page.getByRole('button', { name: /submit for verification/i }).click();
    await expect(page.getByRole('heading', { name: /verification in progress/i })).toBeVisible();

    // The mock backend auto-clears an in_review submission ~6s after
    // submission (see KYC_REVIEW_MS in src/lib/mock/handlers.ts).
    await page.waitForTimeout(6500);
    await page.reload();
    await expect(page.getByRole('heading', { name: /identity verified/i })).toBeVisible();
  });

  test('rejects submissions with a deterministic "test-reject" legal name', async ({ page }) => {
    await login(page);
    await page.goto('/kyc');

    await fillPersonalInfo(page, 'Jane Test-Reject');

    const tmpFile = path.join(os.tmpdir(), 'kre8trix-e2e-id-2.txt');
    fs.writeFileSync(tmpFile, 'fake id contents');
    await page.locator('input[type="file"]').setInputFiles(tmpFile);
    await page.getByRole('button', { name: 'Continue' }).click();

    await page.getByRole('button', { name: /simulate capture/i }).click();
    await expect(page.getByText(/match confirmed/i)).toBeVisible();
    await page.getByRole('button', { name: 'Continue' }).click();
    await page.getByRole('button', { name: /submit for verification/i }).click();

    await expect(page.getByRole('heading', { name: /verification rejected/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /try again/i })).toBeVisible();
  });
});
