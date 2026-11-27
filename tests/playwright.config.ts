import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export default defineConfig({
  testDir: path.resolve(__dirname, './e2e'),
  timeout: 30_000,
  expect: { timeout: 5000 },
  fullyParallel: true,
  workers: process.env.CI ? 2 : undefined,
  reporter: [
    ['list'], 
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['junit', { outputFile: 'test-results/junit.xml' }]
  ],
  globalSetup: path.resolve(__dirname, './e2e/global-setup'),
  globalTeardown: path.resolve(__dirname, './e2e/global-teardown'),
  projects: [
      { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ],
  use: {
    headless: true,
  }
});
