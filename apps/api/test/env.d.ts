import type { D1Migration } from '@cloudflare/vitest-plugin';
import type { Env } from '../src/env.ts';

declare global {
  namespace Cloudflare {
    interface Env extends AppBindings {
      TEST_MIGRATIONS: D1Migration[];
    }
  }
}

type AppBindings = Env;
