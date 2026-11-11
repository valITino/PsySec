import type { Env } from './env.ts';
import { CONTACT_RETENTION_DAYS, DAY_MS } from './lib/time.ts';

/** Cron, täglich: Kontaktanfragen löschen, die älter als 180 Tage sind. */
export async function purgeOldContacts(env: Env, now: Date = new Date()): Promise<number> {
  const cutoff = new Date(now.getTime() - CONTACT_RETENTION_DAYS * DAY_MS).toISOString();
  const result = await env.DB.prepare('DELETE FROM contact_requests WHERE created_at < ?1')
    .bind(cutoff)
    .run();
  return result.meta.changes ?? 0;
}
