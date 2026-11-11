import { createExecutionContext, waitOnExecutionContext } from 'cloudflare:test';
import { env } from 'cloudflare:workers';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Env } from '../src/env.ts';
import worker from '../src/index.ts';
import { MAX_BODY_BYTES } from '../src/lib/http.ts';
import { swissDay } from '../src/lib/time.ts';
import { purgeOldContacts } from '../src/scheduled.ts';

const FORMS = 'https://forms.psyber.tech';
const WEB = 'https://psyber.tech';
const SURPRISE = 'https://surprise.psyber.tech';
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// ---------------------------------------------------------------- Hilfen

interface CallOptions {
  method?: string;
  body?: unknown;
  origin?: string | null;
  headers?: Record<string, string>;
  env?: Partial<Env>;
}

/** Standard in den Tests: kein Limit. Das echte Limit prüft ein eigener Test. */
const open: Partial<Env> = {
  RL_FORMS: { limit: () => Promise.resolve({ success: true }) },
  RL_EVENTS: { limit: () => Promise.resolve({ success: true }) },
};

async function call(path: string, options: CallOptions = {}): Promise<Response> {
  const { method = 'POST', body, origin = FORMS, headers = {} } = options;
  const patch = { ...open, ...options.env };
  const init: RequestInit = {
    method,
    headers: {
      ...(origin ? { Origin: origin } : {}),
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      'CF-Connecting-IP': '203.0.113.77',
      ...headers,
    },
  };
  if (body !== undefined) init.body = typeof body === 'string' ? body : JSON.stringify(body);
  const ctx = createExecutionContext();
  const response = await worker.fetch(
    new Request(`https://api.psyber.tech${path}`, init),
    { ...env, ...patch } as Env,
    ctx,
  );
  await waitOnExecutionContext(ctx);
  return response;
}

const errorOf = async (response: Response) => ((await response.json()) as { error?: string }).error;

const validSurvey = (patch: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  quelle: 'website',
  fokus: 'vor',
  answers: {
    q1: 'stadt_zh',
    q2: ['kinder_10_15', 'erwachsene'],
    q3: 'ab_und_zu',
    q4: 3,
    q6: {
      phishing: 5,
      anlagebetrug: 2,
      romance: 1,
      cybermobbing: 4,
      heimnetz: 4,
      privatsphaere: 3,
    },
    q7: ['session_zuhause', 'vortrag'],
    q11: { a: 200, b: 400, c: 600, d: 900 },
    q12: 'chf_15_24',
    q13: 'chf_50_69',
    q14: ['vertrauen', 'preis'],
    q15: 'Ich weiss nicht, mit wem mein Kind online chattet.',
  },
  turnstileToken: 'token',
  ...patch,
});

const validContact = (patch: Record<string, unknown> = {}) => ({
  name: 'Familie Muster',
  email: 'familie@example.ch',
  phone: '+41 44 000 00 00',
  plzOrt: '8000 Zürich',
  interesse: 'familien_session',
  nachricht: 'Wir haben drei Kinder und viele Geräte.',
  datenschutz: true,
  turnstileToken: 'token',
  ...patch,
});

const rows = async <T = Record<string, unknown>>(sql: string) =>
  (await env.DB.prepare(sql).all<T>()).results;

const count = async (table: string) =>
  (await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table}`).first<{ n: number }>())?.n ?? 0;

/** Turnstile-Prüfung simulieren; jeder andere ausgehende Request wäre ein Fehler. */
let turnstile: 'ok' | 'failed' | 'down' = 'ok';
let outbound: string[] = [];

beforeEach(() => {
  turnstile = 'ok';
  outbound = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    outbound.push(url);
    if (!url.startsWith('https://challenges.cloudflare.com/turnstile/v0/siteverify')) {
      throw new Error(`Unerwarteter Request: ${url}`);
    }
    if (turnstile === 'down') throw new Error('network');
    return Response.json({ success: turnstile === 'ok' });
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------- Tests

describe('Grundlagen', () => {
  it('GET /v1/health antwortet mit ok und Security-Headern', async () => {
    const response = await call('/v1/health', { method: 'GET', origin: null });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(response.headers.get('Content-Security-Policy')).toContain("default-src 'none'");
    expect(response.headers.get('Strict-Transport-Security')).toContain('max-age=31536000');
  });

  it('meldet unbekannte Routen als { error: "not_found" }', async () => {
    const response = await call('/v1/gibt-es-nicht', { method: 'GET', origin: null });
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: 'not_found' });
  });
});

describe('CORS', () => {
  it('erlaubt genau die drei eigenen Websites', async () => {
    for (const origin of [WEB, FORMS, SURPRISE]) {
      const response = await call('/v1/event', { origin, body: { event: 'survey_started' } });
      expect(response.status, origin).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(origin);
      expect(response.headers.get('Vary')).toContain('Origin');
    }
  });

  it('lehnt fremde und fehlende Origins bei POST ab', async () => {
    for (const origin of ['https://evil.example', 'https://psyber.tech.evil.example', null]) {
      const response = await call('/v1/event', { origin, body: { event: 'survey_started' } });
      expect(response.status, String(origin)).toBe(403);
      expect(await errorOf(response)).toBe('origin_not_allowed');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBeNull();
    }
    expect(await count('counters')).toBe(0);
  });

  it('beantwortet den Preflight nur für erlaubte Origins', async () => {
    const allowed = await call('/v1/survey', { method: 'OPTIONS', origin: FORMS });
    expect(allowed.status).toBe(204);
    expect(allowed.headers.get('Access-Control-Allow-Origin')).toBe(FORMS);
    expect(allowed.headers.get('Access-Control-Allow-Methods')).toContain('POST');
    expect(allowed.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');

    const denied = await call('/v1/survey', { method: 'OPTIONS', origin: 'https://evil.example' });
    expect(denied.status).toBe(403);
  });

  it('erlaubt localhost nur im Dev-Modus', async () => {
    const body = { event: 'survey_started' };
    const origin = 'http://localhost:4322';
    expect((await call('/v1/event', { origin, body })).status).toBe(403);
    const dev = await call('/v1/event', { origin, body, env: { ENVIRONMENT: 'development' } });
    expect(dev.status).toBe(200);
    expect(dev.headers.get('Access-Control-Allow-Origin')).toBe(origin);
  });

  it('erlaubt zusätzliche Origins aus ALLOWED_ORIGINS', async () => {
    const origin = 'https://valitino.github.io';
    const response = await call('/v1/event', {
      origin,
      body: { event: 'survey_started' },
      env: { ALLOWED_ORIGINS: `https://example.org, ${origin}` },
    });
    expect(response.status).toBe(200);
  });
});

describe('POST /v1/survey', () => {
  it('speichert eine gültige Antwort', async () => {
    const response = await call('/v1/survey', { body: validSurvey() });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });

    const [row] = await rows('SELECT * FROM survey_responses');
    expect(row).toMatchObject({
      schema_version: 1,
      quelle: 'website',
      fokus: 'vor',
      q1: 'stadt_zh',
      q3: 'ab_und_zu',
      q4: 3,
      q5: null,
      q12: 'chf_15_24',
      q13: 'chf_50_69',
      q11_a: 200,
      q11_b: 400,
      q11_c: 600,
      q11_d: 900,
      q15: 'Ich weiss nicht, mit wem mein Kind online chattet.',
    });
    expect(JSON.parse(String(row?.q2))).toEqual(['kinder_10_15', 'erwachsene']);
    expect(JSON.parse(String(row?.q6))).toMatchObject({ phishing: 5, heimnetz: 4 });
    expect(JSON.parse(String(row?.q7))).toEqual(['session_zuhause', 'vortrag']);
    expect(JSON.parse(String(row?.q14))).toEqual(['vertrauen', 'preis']);
    expect(String(row?.id)).toMatch(/^[0-9a-f-]{36}$/);
  });

  it('zählt survey_completed mit der Selbsteinschätzung aus Frage 4', async () => {
    await call('/v1/survey', { body: validSurvey() });
    await call('/v1/survey', { body: validSurvey() });
    expect(await rows('SELECT event, s_bucket, count FROM counters')).toEqual([
      { event: 'survey_completed', s_bucket: 3, count: 2 },
    ]);
  });

  it('speichert in Umfrage und Warteliste nur das Datum, keine Uhrzeit', async () => {
    await call('/v1/survey', {
      body: validSurvey({ waitlist: { email: 'familie@example.ch', foundingFamily: true } }),
    });
    const [response] = await rows('SELECT * FROM survey_responses');
    const [entry] = await rows('SELECT * FROM waitlist');
    expect(String(response?.created_day)).toMatch(DAY);
    expect(String(entry?.created_day)).toMatch(DAY);
    expect(response?.created_day).toBe(swissDay());

    // Kein Wert in beiden Zeilen sieht nach Uhrzeit oder Zeitstempel aus.
    const values = [...Object.values(response ?? {}), ...Object.values(entry ?? {})].map(String);
    for (const value of values) {
      expect(value).not.toMatch(/\d{2}:\d{2}/);
      expect(value).not.toMatch(/^\d{10,13}$/);
    }
  });

  it('trennt die Warteliste vollständig von den Antworten', async () => {
    const result = await call('/v1/survey', {
      body: validSurvey({ waitlist: { email: 'Familie@Example.ch', foundingFamily: true } }),
    });
    expect(result.status).toBe(200);
    const [response] = await rows('SELECT * FROM survey_responses');
    const [entry] = await rows('SELECT * FROM waitlist');

    // Warteliste: genau vier Spalten, E-Mail normalisiert
    expect(Object.keys(entry ?? {}).sort()).toEqual(
      ['created_day', 'email', 'founding_family', 'id'].sort(),
    );
    expect(entry).toMatchObject({ email: 'familie@example.ch', founding_family: 1 });

    // Keine gemeinsame ID, keine E-Mail bei den Antworten
    expect(entry?.id).not.toBe(response?.id);
    expect(Object.keys(response ?? {})).not.toContain('email');
    expect(JSON.stringify(response)).not.toContain('example.ch');
    expect(JSON.stringify(response)).not.toContain(String(entry?.id));

    // Kein Fremdschlüssel und keine fortlaufende Zeilennummer im Schema
    const schema = await rows<{ name: string; sql: string }>(
      "SELECT name, sql FROM sqlite_master WHERE type = 'table' AND name IN ('survey_responses', 'waitlist')",
    );
    expect(schema).toHaveLength(2);
    for (const table of schema) {
      expect(table.sql.toUpperCase()).not.toContain('REFERENCES');
      expect(table.sql.toUpperCase()).toContain('WITHOUT ROWID');
    }
  });

  it('legt ohne E-Mail keinen Eintrag in der Warteliste an', async () => {
    await call('/v1/survey', { body: validSurvey() });
    expect(await count('survey_responses')).toBe(1);
    expect(await count('waitlist')).toBe(0);
  });

  it('speichert dieselbe E-Mail nur einmal', async () => {
    await call('/v1/survey', {
      body: validSurvey({ waitlist: { email: 'familie@example.ch', foundingFamily: false } }),
    });
    await call('/v1/survey', {
      body: validSurvey({ waitlist: { email: 'FAMILIE@example.ch', foundingFamily: true } }),
    });
    expect(await rows('SELECT email, founding_family FROM waitlist')).toEqual([
      { email: 'familie@example.ch', founding_family: 1 },
    ]);
    expect(await count('survey_responses')).toBe(2);
  });

  it('lehnt ungültige Eingaben mit invalid_payload ab', async () => {
    const base = validSurvey();
    const cases: Record<string, unknown> = {
      'unbekanntes Feld': { ...base, ip: '203.0.113.77' },
      'unbekannte Antwort': { ...base, answers: { ...base.answers, q99: 'x' } },
      'Pflichtfrage fehlt': { ...base, answers: { ...base.answers, q1: undefined } },
      'Matrix unvollständig': {
        ...base,
        answers: { ...base.answers, q6: { phishing: 5 } },
      },
      'Skala ausserhalb': { ...base, answers: { ...base.answers, q4: 6 } },
      'q13 trotz Sprung': { ...base, answers: { ...base.answers, q12: 'nicht_buchen' } },
      'Van Westendorp fällt': {
        ...base,
        answers: { ...base.answers, q11: { a: 500, b: 400, c: 600, d: 900 } },
      },
      'Van Westendorp unvollständig': {
        ...base,
        answers: { ...base.answers, q11: { a: 200, b: 400 } },
      },
      'drei Antworten bei q14': {
        ...base,
        answers: { ...base.answers, q14: ['vertrauen', 'preis', 'datenschutz'] },
      },
      'Quelle nicht in der Liste': { ...base, quelle: 'newsletter' },
      'E-Mail ungültig': { ...base, waitlist: { email: 'keine-adresse', foundingFamily: false } },
      'Token fehlt': { ...base, turnstileToken: undefined },
      'falsche Schema-Version': { ...base, schemaVersion: 2 },
      'kein Objekt': ['q1'],
    };
    for (const [name, body] of Object.entries(cases)) {
      const response = await call('/v1/survey', { body });
      expect(response.status, name).toBe(400);
      expect(await errorOf(response), name).toBe('invalid_payload');
    }
    expect(await count('survey_responses')).toBe(0);
    expect(await count('counters')).toBe(0);
    // Ungültige Eingaben lösen gar keine Turnstile-Prüfung aus.
    expect(outbound).toEqual([]);
  });

  it('prüft Format und Grösse des Bodys', async () => {
    const invalid = await call('/v1/survey', { body: '{"kaputt": ' });
    expect(invalid.status).toBe(400);
    expect(await errorOf(invalid)).toBe('invalid_json');

    const wrongType = await call('/v1/survey', {
      body: JSON.stringify(validSurvey()),
      headers: { 'Content-Type': 'text/plain' },
    });
    expect(wrongType.status).toBe(415);
    expect(await errorOf(wrongType)).toBe('unsupported_media_type');

    const tooLarge = await call('/v1/survey', {
      body: validSurvey({ answers: { q15: 'x'.repeat(MAX_BODY_BYTES) } }),
    });
    expect(tooLarge.status).toBe(413);
    expect(await errorOf(tooLarge)).toBe('payload_too_large');
    expect(await count('survey_responses')).toBe(0);
  });

  it('verwirft Einsendungen mit ausgefülltem Honeypot still', async () => {
    const response = await call('/v1/survey', {
      body: validSurvey({ website: 'https://spam.example' }),
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await count('survey_responses')).toBe(0);
    expect(await count('counters')).toBe(0);
    expect(outbound).toEqual([]);
  });

  it('verlangt ein gültiges Turnstile-Token', async () => {
    turnstile = 'failed';
    const failed = await call('/v1/survey', { body: validSurvey() });
    expect(failed.status).toBe(403);
    expect(await errorOf(failed)).toBe('turnstile_failed');

    turnstile = 'down';
    const down = await call('/v1/survey', { body: validSurvey() });
    expect(down.status).toBe(503);
    expect(await errorOf(down)).toBe('turnstile_unavailable');

    const noSecret = await call('/v1/survey', {
      body: validSurvey(),
      env: { TURNSTILE_SECRET: '' },
    });
    expect(noSecret.status).toBe(503);
    expect(await count('survey_responses')).toBe(0);
  });
});

describe('Rate Limit', () => {
  const blocked: Partial<Env> = {
    RL_FORMS: { limit: () => Promise.resolve({ success: false }) },
    RL_EVENTS: { limit: () => Promise.resolve({ success: false }) },
  };

  it('antwortet mit 429 und rate_limited', async () => {
    for (const [path, body] of [
      ['/v1/survey', validSurvey()],
      ['/v1/contact', validContact()],
      ['/v1/event', { event: 'survey_started' }],
    ] as const) {
      const response = await call(path, { body, env: blocked });
      expect(response.status, path).toBe(429);
      expect(await errorOf(response)).toBe('rate_limited');
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe(FORMS);
    }
    expect(await count('survey_responses')).toBe(0);
    expect(await count('contact_requests')).toBe(0);
    expect(await count('counters')).toBe(0);
  });

  it('nutzt getrennte Limits für Formulare und Zähler, je Pfad und IP', async () => {
    const forms = vi.fn(() => Promise.resolve({ success: true }));
    const events = vi.fn(() => Promise.resolve({ success: true }));
    const limits: Partial<Env> = { RL_FORMS: { limit: forms }, RL_EVENTS: { limit: events } };

    await call('/v1/survey', { body: validSurvey(), env: limits });
    await call('/v1/event', { body: { event: 'bait_click', s: 2 }, env: limits });
    expect(forms).toHaveBeenCalledExactlyOnceWith({ key: '/v1/survey:203.0.113.77' });
    expect(events).toHaveBeenCalledExactlyOnceWith({ key: '/v1/event:203.0.113.77' });
  });

  it('greift mit dem echten Binding nach fünf Formular-Requests pro Minute und IP', async () => {
    const real: Partial<Env> = { RL_FORMS: env.RL_FORMS!, RL_EVENTS: env.RL_EVENTS! };
    const headers = { 'CF-Connecting-IP': '198.51.100.23' };
    const statuses: number[] = [];
    for (let index = 0; index < 7; index++) {
      const response = await call('/v1/contact', {
        origin: WEB,
        body: validContact(),
        env: real,
        headers,
      });
      statuses.push(response.status);
    }
    expect(statuses).toEqual([200, 200, 200, 200, 200, 429, 429]);
    expect(await count('contact_requests')).toBe(5);

    // Eine andere IP ist davon nicht betroffen.
    const other = await call('/v1/contact', {
      origin: WEB,
      body: validContact(),
      env: real,
      headers: { 'CF-Connecting-IP': '198.51.100.24' },
    });
    expect(other.status).toBe(200);
  });

  it('speichert die IP-Adresse nirgends', async () => {
    await call('/v1/survey', {
      body: validSurvey({ waitlist: { email: 'familie@example.ch', foundingFamily: false } }),
    });
    await call('/v1/contact', { body: validContact() });
    await call('/v1/event', { body: { event: 'checklist_click' } });
    const everything = JSON.stringify([
      await rows('SELECT * FROM survey_responses'),
      await rows('SELECT * FROM waitlist'),
      await rows('SELECT * FROM contact_requests'),
      await rows('SELECT * FROM counters'),
    ]);
    expect(everything).not.toContain('203.0.113.77');
  });
});

describe('POST /v1/event', () => {
  it('erhöht die Zähler per UPSERT, aufgeteilt nach Selbsteinschätzung', async () => {
    await call('/v1/event', { body: { event: 'survey_started' } });
    await call('/v1/event', { body: { event: 'survey_started' } });
    await call('/v1/event', { origin: SURPRISE, body: { event: 'bait_click', s: 4 } });
    await call('/v1/event', { origin: SURPRISE, body: { event: 'bait_click', s: 4 } });
    await call('/v1/event', { origin: SURPRISE, body: { event: 'bait_click' } });
    await call('/v1/event', { origin: WEB, body: { event: 'checklist_click' } });

    const result = await rows(
      'SELECT event, s_bucket, day, count FROM counters ORDER BY event, s_bucket',
    );
    const day = swissDay();
    expect(result).toEqual([
      { event: 'bait_click', s_bucket: 0, day, count: 1 },
      { event: 'bait_click', s_bucket: 4, day, count: 2 },
      { event: 'checklist_click', s_bucket: 0, day, count: 1 },
      { event: 'survey_started', s_bucket: 0, day, count: 2 },
    ]);
    // Zähler brauchen kein Turnstile.
    expect(outbound).toEqual([]);
  });

  it('lehnt unbekannte Ereignisse und Felder ab', async () => {
    for (const body of [
      { event: 'survey_completed' },
      { event: 'bait_click', s: 6 },
      { event: 'bait_click', s: 0 },
      { event: 'bait_click', user: 'abc' },
      {},
    ]) {
      const response = await call('/v1/event', { body });
      expect(response.status).toBe(400);
      expect(await errorOf(response)).toBe('invalid_payload');
    }
    expect(await count('counters')).toBe(0);
  });
});

describe('POST /v1/contact', () => {
  const mailbox = () => {
    const sent: Record<string, unknown>[] = [];
    const binding = {
      send: (message: unknown) => {
        sent.push(message as Record<string, unknown>);
        return Promise.resolve({ messageId: 'test' });
      },
    } as unknown as SendEmail;
    return { sent, binding };
  };

  it('speichert die Anfrage und benachrichtigt per E-Mail', async () => {
    const { sent, binding } = mailbox();
    const response = await call('/v1/contact', {
      origin: WEB,
      body: validContact({ ref: 'surprise' }),
      env: { NOTIFY: binding },
    });
    expect(response.status).toBe(200);

    const [row] = await rows('SELECT * FROM contact_requests');
    expect(row).toMatchObject({
      name: 'Familie Muster',
      email: 'familie@example.ch',
      phone: '+41 44 000 00 00',
      plz_ort: '8000 Zürich',
      interesse: 'familien_session',
      nachricht: 'Wir haben drei Kinder und viele Geräte.',
      ref: 'surprise',
    });
    expect(String(row?.created_at)).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({
      to: 'inbox@example.com',
      from: { email: 'hallo@psyber.tech' },
      replyTo: { email: 'familie@example.ch', name: 'Familie Muster' },
      subject: 'Neue Kontaktanfrage: Familien-Session',
    });
    expect(String(sent[0]?.text)).toContain('PLZ und Ort: 8000 Zürich');
    expect(String(sent[0]?.text)).toContain('Wir haben drei Kinder und viele Geräte.');
    expect(sent[0]).not.toHaveProperty('html');
  });

  it('akzeptiert die Anfrage auch, wenn der Mailversand scheitert', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const binding = {
      send: () => Promise.reject(Object.assign(new Error('boom'), { code: 'E_TEST' })),
    } as unknown as SendEmail;
    const response = await call('/v1/contact', {
      origin: WEB,
      body: validContact(),
      env: { NOTIFY: binding },
    });
    expect(response.status).toBe(200);
    expect(await count('contact_requests')).toBe(1);
    // Im Log steht nur der Fehlercode, kein Inhalt der Anfrage.
    expect(error).toHaveBeenCalledWith('notify_failed', 'E_TEST');
    expect(JSON.stringify(error.mock.calls)).not.toContain('Muster');
  });

  it('lässt optionale Felder leer', async () => {
    await call('/v1/contact', {
      origin: WEB,
      body: validContact({ phone: undefined, nachricht: undefined }),
    });
    expect(await rows('SELECT phone, nachricht, ref FROM contact_requests')).toEqual([
      { phone: null, nachricht: null, ref: null },
    ]);
  });

  it('lehnt ungültige Anfragen ab', async () => {
    const cases: Record<string, unknown> = {
      'ohne Einwilligung': validContact({ datenschutz: false }),
      'E-Mail ungültig': validContact({ email: 'keine-adresse' }),
      'Interesse unbekannt': validContact({ interesse: 'gratis' }),
      'Nachricht zu lang': validContact({ nachricht: 'x'.repeat(2001) }),
      'unbekanntes Feld': validContact({ admin: true }),
      'ref unbekannt': validContact({ ref: 'newsletter' }),
    };
    for (const [name, body] of Object.entries(cases)) {
      const response = await call('/v1/contact', { origin: WEB, body });
      expect(response.status, name).toBe(400);
      expect(await errorOf(response), name).toBe('invalid_payload');
    }
    expect(await count('contact_requests')).toBe(0);
  });

  it('verwirft Honeypot-Treffer und verlangt Turnstile', async () => {
    const spam = await call('/v1/contact', {
      origin: WEB,
      body: validContact({ website: 'https://spam.example' }),
    });
    expect(spam.status).toBe(200);
    expect(await count('contact_requests')).toBe(0);

    turnstile = 'failed';
    const failed = await call('/v1/contact', { origin: WEB, body: validContact() });
    expect(failed.status).toBe(403);
    expect(await count('contact_requests')).toBe(0);
  });
});

describe('Cron: Löschfrist', () => {
  it('löscht Kontaktanfragen, die älter als 180 Tage sind', async () => {
    const now = new Date('2026-11-11T03:17:00Z');
    const insert = (id: string, createdAt: string) =>
      env.DB.prepare(
        `INSERT INTO contact_requests (id, created_at, name, email, plz_ort, interesse)
         VALUES (?1, ?2, 'Test', 'test@example.ch', '8000 Zürich', 'anderes')`,
      ).bind(id, createdAt);
    await env.DB.batch([
      insert('alt', '2026-05-01T10:00:00.000Z'),
      insert('grenze-alt', '2026-05-15T03:16:59.000Z'),
      insert('grenze-neu', '2026-05-15T03:17:01.000Z'),
      insert('neu', '2026-11-10T10:00:00.000Z'),
    ]);

    expect(await purgeOldContacts(env, now)).toBe(2);
    expect(
      (await rows<{ id: string }>('SELECT id FROM contact_requests ORDER BY id')).map(
        (row) => row.id,
      ),
    ).toEqual(['grenze-neu', 'neu']);
  });

  it('läuft über den scheduled-Handler', async () => {
    await env.DB.prepare(
      `INSERT INTO contact_requests (id, created_at, name, email, plz_ort, interesse)
       VALUES ('uralt', '2020-01-01T00:00:00.000Z', 'Test', 'test@example.ch', '8000 Zürich', 'anderes')`,
    ).run();
    vi.spyOn(console, 'log').mockImplementation(() => undefined);
    const ctx = createExecutionContext();
    await worker.scheduled({ cron: '17 3 * * *', scheduledTime: Date.now() } as never, env, ctx);
    await waitOnExecutionContext(ctx);
    expect(await count('contact_requests')).toBe(0);
  });
});
