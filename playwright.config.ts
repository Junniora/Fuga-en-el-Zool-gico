import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './e2e',
  timeout: 60000,
  workers: 1,
  reporter: 'list',
  use: {
    browserName: 'chromium',
    channel: process.platform === 'win32' ? 'msedge' : undefined,
    baseURL: 'http://127.0.0.1:5175',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev -w server',
      url: 'http://127.0.0.1:3011/health',
      env: { PORT: '3011', CLIENT_URL: 'http://127.0.0.1:5175' },
      timeout: 30000,
    },
    {
      command:
        'npm run dev -w client -- --host 127.0.0.1 --port 5175 --strictPort',
      url: 'http://127.0.0.1:5175',
      env: { VITE_SERVER_URL: 'http://127.0.0.1:3011' },
      timeout: 30000,
    },
  ],
});
