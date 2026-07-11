import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { login } from '../fixtures/auth';

/*
 * D4/D6 — automated accessibility gate. Scans each route for
 * serious/critical WCAG violations; moderate/minor findings (mostly
 * color-contrast nits on decorative elements) are left for manual
 * review rather than blocking the suite.
 */
const ROUTES = [
  '/dashboard',
  '/wallet',
  '/settings',
  '/kyc',
  '/compliance/aml',
  '/compliance/audit-log',
];

for (const route of ROUTES) {
  test(`no serious accessibility violations on ${route}`, async ({ page }) => {
    await login(page);
    await page.goto(route);
    // Let API data load AND the page's entrance (framer-motion) animations
    // settle — mid-animation opacity elements otherwise read as
    // false-positive contrast failures to axe. Dashboard's CCS score card
    // alone chains mock latency (up to ~1.2s) + a 1.8s-delayed tier-badge
    // fade-in + its own 0.4s duration, so this needs real headroom.
    await page.waitForTimeout(4000);

    const results = await new AxeBuilder({ page })
      .include('body')
      .exclude('[data-sonner-toaster]')
      .analyze();

    const serious = results.violations.filter((v) => v.impact === 'serious' || v.impact === 'critical');
    expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
  });
}
