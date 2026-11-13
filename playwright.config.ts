import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  // Software-rendered WebGL is heavy: more than two pages at once starve each other.
  workers: 2,
  use: {
    baseURL: 'http://localhost:4173',
    // The start star pulses forever, which Playwright never sees as "stable".
    contextOptions: { reducedMotion: 'reduce' },
    // Headless Chromium has no GPU; software GL keeps the canvas alive.
    launchOptions: {
      args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    },
  },
  projects: [
    { name: 'laptop', use: { ...devices['Desktop Chrome'] } },
    { name: 'phone', use: { ...devices['Pixel 7 landscape'] } },
  ],
  webServer: {
    command: 'npm run build && npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
