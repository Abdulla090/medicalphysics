import { defineConfig } from '@playwright/test';

const externalBaseURL = process.env.XRAY_TEST_BASE_URL;

export default defineConfig({
  testDir: './tests/simulator',
  timeout: 120000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results/simulator',
  use: {
    baseURL: externalBaseURL ?? 'http://127.0.0.1:5174',
    viewport: { width: 1440, height: 960 },
    reducedMotion: 'reduce',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    launchOptions: {
      executablePath: process.env.XRAY_TEST_CHROME_PATH || undefined,
      args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  webServer: externalBaseURL ? undefined : {
    command: 'npm run dev -- --host 127.0.0.1 --port 5174 --strictPort',
    url: 'http://127.0.0.1:5174',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
