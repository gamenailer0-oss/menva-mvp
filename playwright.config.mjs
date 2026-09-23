// Playwright: diner journeys and capability tiers against the built site (dist/), served with the
// same headers and routing as Netlify (scripts/serve.mjs). Uses the installed Chrome — no download.
// Run: npm run build && npm test
import { defineConfig } from '@playwright/test';

const PORT = Number(process.env.PORT || 8080); // PORT=8090 npm test — to run beside another server

export default defineConfig({
  testDir: 'tests',
  testMatch: '*.spec.mjs',
  timeout: 90_000,
  workers: 2,
  reporter: [['list']],
  use: {
    baseURL: `http://localhost:${PORT}`,
    channel: 'chrome',
    viewport: { width: 390, height: 844 },
    serviceWorkers: 'block', // each test starts clean; the offline test opts back in
    launchOptions: { args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] },
  },
  webServer: {
    command: 'node scripts/serve.mjs',
    port: PORT,
    reuseExistingServer: true,
  },
});
