import { eventSchema } from '@psyber/survey';
import type { Context } from 'hono';
import type { AppEnv } from '../env.ts';
import { bumpCounter } from '../lib/db.ts';
import { fail, readJson } from '../lib/http.ts';
import { swissDay } from '../lib/time.ts';

/**
 * Automatische Abrufe (Suchmaschinen, Vorschau-Dienste, Prüfwerkzeuge) zählen nicht mit.
 * Der User-Agent wird nur für diese eine Prüfung gelesen: nie gespeichert, nie geloggt.
 */
const MACHINE =
  /bot|crawl|spider|slurp|externalhit|preview|headless|lighthouse|pagespeed|gtmetrix|pingdom|uptime|monitor/i;

/**
 * POST /v1/event
 * Anonyme Zähler als Tagessummen. Zur Umfrage: survey_started, survey_step, bait_click,
 * checklist_click. Zur Reichweite: page_view (beim Einstieg zusätzlich visit mit der Herkunft)
 * und cta_click. Alle Werte stammen aus festen Listen. Ohne Turnstile, aber mit Rate Limit.
 */
export async function postEvent(c: Context<AppEnv>) {
  const body = await readJson(c);
  if (!body.ok) return fail(c, body.code, body.status);

  const parsed = eventSchema.safeParse(body.data);
  if (!parsed.success) return fail(c, 'invalid_payload', 400);
  if (MACHINE.test(c.req.header('User-Agent') ?? '')) return c.json({ ok: true });

  const db = c.env.DB;
  const day = swissDay();
  const data = parsed.data;
  switch (data.event) {
    case 'page_view': {
      const statements = [bumpCounter(db, 'page_view', day, { dim: data.page })];
      if (data.source) {
        statements.push(bumpCounter(db, 'visit', day, { dim: `${data.page}:${data.source}` }));
      }
      await db.batch(statements);
      break;
    }
    case 'cta_click':
      await bumpCounter(db, 'cta_click', day, { dim: data.target }).run();
      break;
    case 'survey_step':
      await bumpCounter(db, 'survey_step', day, { dim: data.step }).run();
      break;
    default:
      await bumpCounter(db, data.event, day, { s: data.s }).run();
  }
  return c.json({ ok: true });
}
