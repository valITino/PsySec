/**
 * api.psyber.tech: Cloudflare Worker für Umfrage, Kontaktanfragen und anonyme Zähler.
 *
 * Datenschutz by Design: keine IP-Adressen, keine User-Agents, keine Fingerprints in der
 * Datenbank; Request-Bodies werden nie geloggt. Die IP dient nur flüchtig dem Rate Limiting.
 */
import { Hono } from 'hono';
import type { AppEnv, Env } from './env.ts';
import { budget, cors, fail, rateLimit, securityHeaders } from './lib/http.ts';
import { postContact } from './routes/contact.ts';
import { postEvent } from './routes/event.ts';
import { postSurvey } from './routes/survey.ts';
import { purgeOldContacts } from './scheduled.ts';

const app = new Hono<AppEnv>();

app.use('*', securityHeaders);
app.use('/v1/*', cors);

app.get('/v1/health', (c) => c.json({ ok: true }));
app.post('/v1/survey', rateLimit('RL_FORMS'), postSurvey);
app.post('/v1/contact', rateLimit('RL_FORMS'), postContact);
app.post('/v1/event', rateLimit('RL_EVENTS'), budget('RL_EVENTS_ALL'), postEvent);

app.notFound((c) => fail(c, 'not_found', 404));
app.onError((error, c) => {
  // Nur die Art des Fehlers, nie Inhalte der Anfrage.
  console.error('unhandled_error', error.name);
  return fail(c, 'internal', 500);
});

export default {
  fetch: app.fetch,
  async scheduled(_controller, env, ctx) {
    ctx.waitUntil(purgeOldContacts(env).then((count) => console.log('contacts_purged', count)));
  },
} satisfies ExportedHandler<Env>;
