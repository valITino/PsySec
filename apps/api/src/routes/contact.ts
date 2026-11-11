import { contactSchema, interessen, type ContactPayload } from '@psyber/survey';
import type { Context } from 'hono';
import type { AppEnv, Env } from '../env.ts';
import { fail, isHoneypotFilled, readJson } from '../lib/http.ts';
import { CONTACT_RETENTION_DAYS } from '../lib/time.ts';
import { verifyTurnstile } from '../lib/turnstile.ts';

/** Nur einfacher Text: Zeilenumbrüche in einzeiligen Feldern entfernen. */
const oneLine = (value: string) => value.replace(/[\r\n]+/g, ' ').trim();

function notificationText(data: ContactPayload): string {
  return [
    'Neue Anfrage über psyber.tech',
    '',
    `Name:        ${oneLine(data.name)}`,
    `E-Mail:      ${data.email}`,
    ...(data.phone ? [`Telefon:     ${oneLine(data.phone)}`] : []),
    `PLZ und Ort: ${oneLine(data.plzOrt)}`,
    `Interesse:   ${interessen[data.interesse]}`,
    ...(data.ref ? [`Herkunft:    ${data.ref}`] : []),
    '',
    'Nachricht:',
    data.nachricht ?? '(keine)',
    '',
    `Diese Anfrage wird nach ${CONTACT_RETENTION_DAYS} Tagen automatisch gelöscht.`,
  ].join('\n');
}

/** Benachrichtigung per send_email-Binding. Fehler hier dürfen die Anfrage nicht scheitern lassen. */
async function notify(env: Env, data: ContactPayload): Promise<void> {
  if (!env.NOTIFY || !env.NOTIFY_TO || !env.NOTIFY_FROM) {
    // Die Anfrage ist gespeichert, aber niemand erfährt davon: Das soll in den Logs auffallen.
    console.error('notify_not_configured');
    return;
  }
  try {
    await env.NOTIFY.send({
      from: { email: env.NOTIFY_FROM, name: 'PSYber Website' },
      to: env.NOTIFY_TO,
      replyTo: { email: data.email, name: oneLine(data.name) },
      subject: `Neue Kontaktanfrage: ${interessen[data.interesse]}`,
      text: notificationText(data),
    });
  } catch (error) {
    // Nur der Fehlercode, nie Inhalte der Anfrage.
    const code = (error as { code?: unknown }).code;
    console.error('notify_failed', typeof code === 'string' ? code : 'unknown');
  }
}

/**
 * POST /v1/contact
 * Speichert die Kontaktanfrage und benachrichtigt per E-Mail.
 */
export async function postContact(c: Context<AppEnv>) {
  const body = await readJson(c);
  if (!body.ok) return fail(c, body.code, body.status);
  if (isHoneypotFilled(body.data)) return c.json({ ok: true });

  const parsed = contactSchema.safeParse(body.data);
  if (!parsed.success) return fail(c, 'invalid_payload', 400);
  const data = parsed.data;

  const turnstile = await verifyTurnstile(c.env, data.turnstileToken);
  if (turnstile === 'unavailable') return fail(c, 'turnstile_unavailable', 503);
  if (turnstile === 'failed') return fail(c, 'turnstile_failed', 403);

  await c.env.DB.prepare(
    `INSERT INTO contact_requests (id, created_at, name, email, phone, plz_ort, interesse, nachricht, ref)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)`,
  )
    .bind(
      crypto.randomUUID(),
      new Date().toISOString(),
      data.name,
      data.email,
      data.phone ?? null,
      data.plzOrt,
      data.interesse,
      data.nachricht ?? null,
      data.ref ?? null,
    )
    .run();

  // Die Antwort wartet nicht auf den Mailversand.
  c.executionCtx.waitUntil(notify(c.env, data));
  return c.json({ ok: true });
}
