import { cloudflareTest, readD1Migrations } from '@cloudflare/vitest-plugin';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

// Die Tests laufen in der echten Workers-Laufzeit (workerd) mit lokaler D1.
export default defineConfig({
  plugins: [
    cloudflareTest(async () => {
      const migrations = await readD1Migrations(
        fileURLToPath(new URL('./migrations', import.meta.url)),
      );
      return {
        wrangler: { configPath: './wrangler.jsonc' },
        miniflare: {
          bindings: {
            TEST_MIGRATIONS: migrations,
            TURNSTILE_SECRET: 'test-secret',
            NOTIFY_TO: 'inbox@example.com',
            ENVIRONMENT: 'production',
          },
        },
      };
    }),
  ],
  test: {
    name: 'api',
    include: ['test/**/*.test.ts'],
    setupFiles: ['./test/setup.ts'],
  },
});
