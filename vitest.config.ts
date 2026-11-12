import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'unit',
          environment: 'node',
          include: ['packages/*/test/**/*.test.ts', 'scripts/**/*.test.ts'],
        },
      },
      // API-Tests in der Workers-Laufzeit (eigene Konfiguration mit lokaler D1)
      'apps/api/vitest.config.ts',
    ],
  },
});
