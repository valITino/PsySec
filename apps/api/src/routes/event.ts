import { eventSchema } from '@psyber/survey';
import type { Context } from 'hono';
import type { AppEnv } from '../env.ts';
import { bumpCounter } from '../lib/db.ts';
import { fail, readJson } from '../lib/http.ts';
import { swissDay } from '../lib/time.ts';

/**
 * POST /v1/event
 * Anonyme Zähler als Tagessummen: survey_started, bait_click, checklist_click.
 * Ohne Turnstile, aber mit Rate Limit.
 */
export async function postEvent(c: Context<AppEnv>) {
  const body = await readJson(c);
  if (!body.ok) return fail(c, body.code, body.status);

  const parsed = eventSchema.safeParse(body.data);
  if (!parsed.success) return fail(c, 'invalid_payload', 400);

  await bumpCounter(c.env.DB, parsed.data.event, swissDay(), parsed.data.s).run();
  return c.json({ ok: true });
}
