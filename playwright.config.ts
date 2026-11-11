import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke-Tests gegen die gebauten Sites (vorher `pnpm build`; das baut auch die Variante
 * mit Turnstile-Testkey nach apps/<app>/dist-turnstile).
 * Die API wird in den Tests gemockt; es geht kein Request ins Netz.
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

const server = (dir: string, port: number, path = '/') => ({
  command: `node scripts/serve.mjs ${dir} --port ${port}`,
  url: `http://127.0.0.1:${port}${path}`,
  reuseExistingServer: !process.env.CI,
  timeout: 30_000,
});

export const WEB = 'http://127.0.0.1:4321';
export const FORMS = 'http://127.0.0.1:4322';
export const SURPRISE = 'http://127.0.0.1:4323';
/** Zweiter Build von web und forms mit Turnstile-Testkey (scripts/build-turnstile.mjs) */
export const WEB_TURNSTILE = 'http://127.0.0.1:4331';
export const FORMS_TURNSTILE = 'http://127.0.0.1:4332';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
    trace: 'off',
    launchOptions: { executablePath },
  },
  projects: [
    {
      name: 'desktop',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 } },
    },
    {
      name: 'mobile',
      use: { ...devices['Pixel 7'], viewport: { width: 390, height: 844 } },
    },
  ],
  webServer: [
    server('apps/web/dist', 4321),
    server('apps/forms/dist', 4322),
    server('apps/surprise/dist', 4323, '/gewinn'),
    server('apps/web/dist-turnstile', 4331),
    server('apps/forms/dist-turnstile', 4332),
  ],
});
