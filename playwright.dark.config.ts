import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests-dark',
  testMatch: 'dark-mode.spec.ts',
  reporter: 'line',
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } }
  ],
  webServer: {
    command: 'npm start -- --port 4317',
    url: 'http://localhost:4317',
    reuseExistingServer: false
  }
});
