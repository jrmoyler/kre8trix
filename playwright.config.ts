import { defineConfig, devices } from '@playwright/test';

/*
 * D6 — E2E test config. This sandbox only has Chromium pre-installed
 * (PLAYWRIGHT_BROWSERS_PATH), so a single chromium project is
 * intentional here, not an oversight — do not add firefox/webkit
 * projects without confirming their browsers are available, and never
 * run `playwright install`. The installed @playwright/test version's
 * bundled browser revision doesn't match what's pre-installed here, so
 * pin the executable explicitly rather than relying on auto-discovery.
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        launchOptions: { executablePath: '/opt/pw-browsers/chromium' },
      },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
