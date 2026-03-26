import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  // Retry on CI to handle flaky focus/selection races
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 2 : undefined,
  reporter: process.env.CI ? 'github' : 'html',

  use: {
    baseURL: 'http://localhost:4000',
    // Capture trace and video on first retry — makes debugging CI failures easy
    trace: 'on-first-retry',
    video: 'on-first-retry',
    screenshot: 'only-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
  ],

  // Serve local-test.html via a static server before tests run
  webServer: {
    command: 'npx --yes http-server . -p 4000 -c-1 --silent',
    port: 4000,
    reuseExistingServer: !process.env.CI,
    timeout: 30_000,
  },
});
