import type { Context, MiddlewareHandler } from 'hono';
import type { AppEnv } from '../env.ts';

/** Fehler der API haben immer die Form { "error": "<code>" }. */
export type ErrorCode =
  | 'not_found'
  | 'method_not_allowed'
  | 'origin_not_allowed'
  | 'unsupported_media_type'
  | 'payload_too_large'
  | 'invalid_json'
  | 'invalid_payload'
  | 'turnstile_failed'
  | 'turnstile_unavailable'
  | 'rate_limited'
  | 'internal';

export const fail = (
  c: Context<AppEnv>,
  code: ErrorCode,
  status: 400 | 403 | 404 | 405 | 413 | 415 | 429 | 500 | 503,
) => c.json({ error: code }, status);

/** Höchstgrösse eines Request-Bodys */
export const MAX_BODY_BYTES = 32 * 1024;

/** Die drei Websites; im Dev-Modus zusätzlich localhost. */
const PRODUCTION_ORIGINS = [
  'https://psyber.tech',
  'https://forms.psyber.tech',
  'https://surprise.psyber.tech',
];
const LOCALHOST = /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/;

export function isAllowedOrigin(origin: string | undefined, env: AppEnv['Bindings']): boolean {
  if (!origin) return false;
  if (PRODUCTION_ORIGINS.includes(origin)) return true;
  if (env.ENVIRONMENT === 'development' && LOCALHOST.test(origin)) return true;
  const extra = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  return extra.includes(origin);
}

/** Security-Header für jede Antwort der API */
export const securityHeaders: MiddlewareHandler<AppEnv> = async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Cache-Control', 'no-store');
  c.header('Referrer-Policy', 'no-referrer');
  c.header('Content-Security-Policy', "default-src 'none'; frame-ancestors 'none'");
  c.header(
    'Strict-Transport-Security',
    `max-age=31536000; includeSubDomains${c.env.HSTS_PRELOAD === 'true' ? '; preload' : ''}`,
  );
};

/**
 * CORS nur für die eigenen Websites. POST-Requests ohne erlaubten Origin werden abgelehnt:
 * Browser senden den Header bei Cross-Origin-POSTs immer mit.
 */
export const cors: MiddlewareHandler<AppEnv> = async (c, next) => {
  const origin = c.req.header('Origin');
  const allowed = isAllowedOrigin(origin, c.env);

  if (c.req.method === 'OPTIONS') {
    if (!allowed) return fail(c, 'origin_not_allowed', 403);
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': origin!,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
        Vary: 'Origin',
      },
    });
  }

  if (c.req.method === 'POST' && !allowed) return fail(c, 'origin_not_allowed', 403);

  await next();
  if (allowed) {
    c.header('Access-Control-Allow-Origin', origin!);
    c.header('Vary', 'Origin');
  }
  return undefined;
};

/**
 * Schlüssel eines Anschlusses für das Rate Limit. Ein IPv6-Anschluss bekommt in der Regel ein
 * ganzes /64-Netz: Wer darin die Adresse wechselt, bliebe sonst unter jedem Limit. Bei IPv6
 * zählt darum nur das Netz, bei IPv4 die Adresse.
 */
export function clientKey(ip: string | undefined): string {
  if (!ip) return 'unknown';
  if (!ip.includes(':')) return ip;
  // IPv4 in IPv6-Schreibweise (::ffff:203.0.113.7)
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(ip);
  if (mapped?.[1]) return mapped[1];
  const [head = '', tail = ''] = ip.toLowerCase().split('::');
  const left = head ? head.split(':') : [];
  const right = tail ? tail.split(':') : [];
  const missing = ip.includes('::') ? Math.max(0, 8 - left.length - right.length) : 0;
  const groups = [...left, ...Array<string>(missing).fill('0'), ...right];
  const network = groups.slice(0, 4).map((group) => group.replace(/^0+(?=.)/, ''));
  return `${network.join(':')}::/64`;
}

/** Fehlt ein Limit in Produktion, soll das auffallen: Die API läuft sonst still ohne Schutz. */
function reportMissingLimit(c: Context<AppEnv>, binding: string): void {
  if (c.env.ENVIRONMENT === 'production') console.error('rate_limit_not_configured', binding);
}

const tooMany = (c: Context<AppEnv>) => {
  c.header('Retry-After', '60');
  return fail(c, 'rate_limited', 429);
};

/**
 * Rate Limit pro Anschluss. Die IP dient nur als flüchtiger Schlüssel und wird nirgends
 * gespeichert.
 */
export const rateLimit =
  (binding: 'RL_FORMS' | 'RL_EVENTS'): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const limiter = c.env[binding];
    if (limiter) {
      const key = `${c.req.path}:${clientKey(c.req.header('CF-Connecting-IP'))}`;
      const { success } = await limiter.limit({ key });
      if (!success) return tooMany(c);
    } else {
      reportMissingLimit(c, binding);
    }
    await next();
    return undefined;
  };

/**
 * Gesamtbudget eines Pfads, unabhängig vom Anschluss. Für die Zähler ohne Turnstile: Auch eine
 * Flut aus sehr vielen Adressen kann so weder die Statistik noch das Schreibkontingent der
 * Datenbank aufbrauchen.
 */
export const budget =
  (binding: 'RL_EVENTS_ALL'): MiddlewareHandler<AppEnv> =>
  async (c, next) => {
    const limiter = c.env[binding];
    if (limiter) {
      const { success } = await limiter.limit({ key: c.req.path });
      if (!success) return tooMany(c);
    } else {
      reportMissingLimit(c, binding);
    }
    await next();
    return undefined;
  };

export type JsonBody =
  { ok: true; data: unknown } | { ok: false; code: ErrorCode; status: 400 | 413 | 415 };

/** Liest den JSON-Body mit hartem Grössenlimit (32 KB). */
export async function readJson(c: Context<AppEnv>): Promise<JsonBody> {
  const type = c.req.header('Content-Type') ?? '';
  if (!type.toLowerCase().startsWith('application/json')) {
    return { ok: false, code: 'unsupported_media_type', status: 415 };
  }
  const declared = Number(c.req.header('Content-Length') ?? '0');
  if (declared > MAX_BODY_BYTES) return { ok: false, code: 'payload_too_large', status: 413 };

  // Auch ohne (oder mit falschem) Content-Length nie mehr als das Limit lesen.
  const reader = c.req.raw.body?.getReader();
  if (!reader) return { ok: false, code: 'invalid_json', status: 400 };
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return { ok: false, code: 'payload_too_large', status: 413 };
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return { ok: true, data: JSON.parse(new TextDecoder().decode(bytes)) as unknown };
  } catch {
    return { ok: false, code: 'invalid_json', status: 400 };
  }
}

/** Honeypot: Menschen lassen das Feld `website` leer. */
export function isHoneypotFilled(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const value = (data as Record<string, unknown>).website;
  return typeof value === 'string' && value.trim() !== '';
}
