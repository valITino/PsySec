import { applyD1Migrations } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { beforeEach } from 'vitest';

// Migrationen einmal anwenden (die Funktion überspringt bereits angewendete).
await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);

// Jeder Test startet mit leeren Tabellen.
beforeEach(async () => {
  await env.DB.batch([
    env.DB.prepare('DELETE FROM survey_responses'),
    env.DB.prepare('DELETE FROM waitlist'),
    env.DB.prepare('DELETE FROM contact_requests'),
    env.DB.prepare('DELETE FROM counters'),
  ]);
});
