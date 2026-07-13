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
  /* E4: with E2E_API=1 the suite runs against the real backend — an
   * ephemeral API server on :4000 plus vite configured to proxy /api
   * to it. Default (mock) mode is unchanged. */
  webServer: process.env.E2E_API
    ? [
        {
          command: 'npm run api',
          url: 'http://localhost:4000/health',
          reuseExistingServer: false,
          timeout: 30_000,
          env: { KRE8TRIX_EPHEMERAL: '1' },
        },
        {
          command: 'npm run dev',
          url: 'http://localhost:3000',
          reuseExistingServer: false,
          timeout: 30_000,
          env: { VITE_API_URL: '/api' },
        },
      ]
    : {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 30_000,
      },
});
