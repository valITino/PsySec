// Baut web und forms ein zweites Mal mit den offiziellen Turnstile-Testkeys von Cloudflare,
// nach apps/<app>/dist-turnstile. So prüfen die E2E-Tests den Weg, den die Produktion nimmt:
// CSP mit Turnstile, Laden des Widgets, Token im Request (e2e/turnstile.spec.ts).
// Wird von «pnpm build» im Wurzelverzeichnis mit aufgerufen; deployt wird nur dist/.
import { spawnSync } from 'node:child_process';
import { TURNSTILE_TEST_KEYS } from '../packages/config/src/sites.mjs';

const BUILDS = [
  { app: 'web', key: TURNSTILE_TEST_KEYS.visible },
  { app: 'forms', key: TURNSTILE_TEST_KEYS.invisible },
];

for (const { app, key } of BUILDS) {
  const result = spawnSync(
    'pnpm',
    ['exec', 'astro', 'build', '--outDir', 'dist-turnstile', '--silent'],
    {
      cwd: `apps/${app}`,
      stdio: 'inherit',
      env: {
        ...process.env,
        PUBLIC_TURNSTILE_SITE_KEY: key,
        PUBLIC_API_BASE: '',
        ASTRO_TELEMETRY_DISABLED: '1',
      },
    },
  );
  if (result.status !== 0) {
    console.error(`✗ Turnstile-Build von ${app} fehlgeschlagen`);
    process.exit(result.status ?? 1);
  }
  console.log(`✓ ${app}: apps/${app}/dist-turnstile (mit Turnstile-Testkey)`);
}
