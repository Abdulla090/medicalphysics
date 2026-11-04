import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/labs', timeout: 60000, expect: { timeout: 12000 }, workers: 1,
  reporter: 'list', outputDir: 'test-results/labs',
  use: { baseURL: 'http://127.0.0.1:5175', viewport: { width: 1440, height: 1100 }, reducedMotion: 'reduce', screenshot: 'only-on-failure' },
  webServer: { command: 'npm run dev -- --host 127.0.0.1 --port 5175 --strictPort', url: 'http://127.0.0.1:5175', reuseExistingServer: !process.env.CI, timeout: 60000 },
});
