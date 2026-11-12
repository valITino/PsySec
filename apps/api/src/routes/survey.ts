import { surveySubmissionSchema } from '@psyber/survey';
import type { Context } from 'hono';
import type { AppEnv } from '../env.ts';
import { bumpCounterIfChanged } from '../lib/db.ts';
import { fail, isHoneypotFilled, readJson } from '../lib/http.ts';
import { monthStart, swissDay } from '../lib/time.ts';
import { verifyTurnstile } from '../lib/turnstile.ts';

/**
 * POST /v1/survey
 * Speichert eine anonyme Antwort. Eine freiwillige E-Mail landet getrennt in `waitlist`:
 * keine gemeinsame ID, kein Fremdschlüssel; die Antwort trägt nur den Tag, die Warteliste nur
 * den Monat.
 *
 * Schickt der Browser eine `submissionId` mit, ist die Einsendung wiederholbar: Ein zweiter
 * Versuch mit derselben Kennung (nach einer verlorenen Antwort) schreibt und zählt nichts mehr.
 */
export async function postSurvey(c: Context<AppEnv>) {
  const body = await readJson(c);
  if (!body.ok) return fail(c, body.code, body.status);

  // Bots, die das versteckte Feld ausfüllen, bekommen eine freundliche Antwort, aber nichts wird gespeichert.
  if (isHoneypotFilled(body.data)) return c.json({ ok: true });

  const parsed = surveySubmissionSchema.safeParse(body.data);
  if (!parsed.success) return fail(c, 'invalid_payload', 400);
  const { answers, waitlist, quelle, fokus, schemaVersion, turnstileToken, submissionId } =
    parsed.data;

  const turnstile = await verifyTurnstile(c.env, turnstileToken);
  if (turnstile === 'unavailable') return fail(c, 'turnstile_unavailable', 503);
  if (turnstile === 'failed') return fail(c, 'turnstile_failed', 403);

  const day = swissDay();
  const db = c.env.DB;
  const statements: D1PreparedStatement[] = [
    db
      .prepare(
        `INSERT INTO survey_responses (
           id, created_day, schema_version, quelle, fokus,
           q1, q3, q4, q5, q8, q9, q10, q12, q13,
           q2, q6, q7, q14,
           q11_a, q11_b, q11_c, q11_d, q15
         ) VALUES (
           ?1, ?2, ?3, ?4, ?5,
           ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14,
           ?15, ?16, ?17, ?18,
           ?19, ?20, ?21, ?22, ?23
         )
         ON CONFLICT (id) DO NOTHING`,
      )
      .bind(
        submissionId ?? crypto.randomUUID(),
        day,
        schemaVersion,
        quelle,
        fokus ?? null,
        answers.q1,
        answers.q3 ?? null,
        answers.q4,
        answers.q5 ?? null,
        answers.q8 ?? null,
        answers.q9 ?? null,
        answers.q10 ?? null,
        answers.q12 ?? null,
        answers.q13 ?? null,
        JSON.stringify(answers.q2),
        JSON.stringify(answers.q6),
        JSON.stringify(answers.q7),
        answers.q14 ? JSON.stringify(answers.q14) : null,
        answers.q11?.a ?? null,
        answers.q11?.b ?? null,
        answers.q11?.c ?? null,
        answers.q11?.d ?? null,
        answers.q15 ?? null,
      ),
    // Muss direkt auf die Antwort folgen: zählt nur, wenn sie eben geschrieben wurde.
    bumpCounterIfChanged(db, 'survey_completed', day, { s: answers.q4 }),
  ];

  if (waitlist) {
    // Eigene, zufällige ID: nichts verbindet diesen Eintrag mit der Antwort oben.
    statements.push(
      db
        .prepare(
          `INSERT INTO waitlist (id, created_day, email, founding_family) VALUES (?1, ?2, ?3, ?4)
           ON CONFLICT (email) DO UPDATE SET
             founding_family = MAX(founding_family, excluded.founding_family)`,
        )
        .bind(
          crypto.randomUUID(),
          monthStart(day),
          waitlist.email.trim().toLowerCase(),
          waitlist.foundingFamily ? 1 : 0,
        ),
    );
  }

  await db.batch(statements);
  return c.json({ ok: true });
}
