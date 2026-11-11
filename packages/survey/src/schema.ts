/**
 * Zod-Schemas für Umfrage, Kontaktformular und Zähler. Unbekannte Felder werden abgelehnt.
 * Die API prüft damit jede Einsendung, das Kontaktformular prüft damit schon im Browser.
 * Die Umfrage prüft im Browser Frage für Frage mit `validateQuestion()` (logic.ts); die fertige
 * Einsendung muss diesem Schema genügen (Tests in packages/survey halten beides deckungsgleich).
 *
 * Wir nutzen `zod/mini` (Teil von Zod 4): gleiche Schemas, aber so gebaut, dass der Bundler
 * Ungenutztes entfernt. Das spart im Browser rund 20 KB (gzip) gegenüber der klassischen API.
 */
import * as z from 'zod/mini';
import {
  CONTACT_REFS,
  EVENTS,
  FOKUS,
  Q14_MAX,
  Q15_MAX_LENGTH,
  QUELLEN_STORED,
  VW_MAX,
  VW_MIN,
  interessen,
  q10Options,
  q12Options,
  q13Options,
  q14Options,
  q1Options,
  q2Options,
  q3Options,
  q5Options,
  q7Options,
} from './questions.ts';

/** Version des Antwortschemas; wird mit jeder Antwort gespeichert. */
export const SCHEMA_VERSION = 1;

const keys = <T extends Record<string, string>>(options: T) =>
  Object.keys(options) as [keyof T & string, ...(keyof T & string)[]];

const unique = (values: readonly string[]) => new Set(values).size === values.length;

/** Mehrfachauswahl: 1 bis `max` verschiedene Werte aus den Optionen */
const multi = <T extends Record<string, string>>(options: T, max = keys(options).length) =>
  z
    .array(z.enum(keys(options)))
    .check(z.minLength(1), z.maxLength(max), z.refine(unique, { error: 'duplicate' }));

const scale = z.int().check(z.gte(1), z.lte(5));
const chf = z.int().check(z.gte(VW_MIN), z.lte(VW_MAX));
const token = z.string().check(z.minLength(1), z.maxLength(2048));
/**
 * Zufällige Kennung einer Einsendung (UUID). Der Browser erzeugt sie einmal pro Umfrage: Geht die
 * Antwort der API verloren und jemand sendet erneut, entsteht so keine zweite Zeile. Sie ist
 * reiner Zufall und verbindet die Antwort mit nichts (die Warteliste bekommt eine eigene ID).
 */
const submissionId = z.optional(
  z.string().check(z.regex(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/)),
);
/** Honeypot: Menschen lassen das Feld leer. Die API verwirft befüllte Einsendungen still. */
const honeypot = z.optional(z.string().check(z.maxLength(200)));
const text = (min: number, max: number) =>
  z.string().check(z.trim(), z.minLength(min), z.maxLength(max));

// ---------------------------------------------------------------- Umfrage

export const vanWestendorpSchema = z.strictObject({ a: chf, b: chf, c: chf, d: chf }).check(
  z.refine((value) => value.a <= value.b && value.b <= value.c && value.c <= value.d, {
    error: 'vw_order',
  }),
);

export const answersSchema = z
  .strictObject({
    q1: z.enum(keys(q1Options)),
    q2: multi(q2Options),
    q3: z.optional(z.enum(keys(q3Options))),
    q4: scale,
    q5: z.optional(z.enum(keys(q5Options))),
    // Pflicht: jede Zeile muss beantwortet sein
    q6: z.strictObject({
      phishing: scale,
      anlagebetrug: scale,
      romance: scale,
      cybermobbing: scale,
      heimnetz: scale,
      privatsphaere: scale,
    }),
    q7: multi(q7Options),
    q8: z.optional(scale),
    q9: z.optional(scale),
    q10: z.optional(z.enum(keys(q10Options))),
    q11: z.optional(vanWestendorpSchema),
    q12: z.optional(z.enum(keys(q12Options))),
    q13: z.optional(z.enum(keys(q13Options))),
    q14: z.optional(multi(q14Options, Q14_MAX)),
    q15: z.optional(text(1, Q15_MAX_LENGTH)),
  })
  .check(
    // Sprunglogik: Wer das Abo nicht buchen würde, bekommt die Folgefrage nicht gestellt.
    z.refine((answers) => !(answers.q12 === 'nicht_buchen' && answers.q13 !== undefined), {
      path: ['q13'],
      error: 'skipped_question_answered',
    }),
  );

export const emailSchema = z.email().check(z.maxLength(254));

export const waitlistSchema = z.strictObject({
  email: emailSchema,
  foundingFamily: z.boolean(),
});

export const surveySubmissionSchema = z.strictObject({
  schemaVersion: z.literal(SCHEMA_VERSION),
  submissionId,
  quelle: z.enum(QUELLEN_STORED),
  fokus: z.optional(z.enum(FOKUS)),
  answers: answersSchema,
  waitlist: z.optional(waitlistSchema),
  turnstileToken: token,
  website: honeypot,
});

export type SurveySubmission = z.infer<typeof surveySubmissionSchema>;
export type ValidAnswers = z.infer<typeof answersSchema>;

// ---------------------------------------------------------------- Zähler

export const eventSchema = z.strictObject({
  event: z.enum(EVENTS),
  s: z.optional(scale),
});

export type EventPayload = z.infer<typeof eventSchema>;

// ---------------------------------------------------------------- Kontaktformular

export const CONTACT_LIMITS = {
  name: { min: 2, max: 120 },
  email: { max: 254 },
  phone: { max: 40 },
  plzOrt: { min: 3, max: 120 },
  nachricht: { max: 2000 },
} as const;

export const contactSchema = z.strictObject({
  name: text(CONTACT_LIMITS.name.min, CONTACT_LIMITS.name.max),
  email: emailSchema,
  phone: z.optional(
    z
      .string()
      .check(z.trim(), z.maxLength(CONTACT_LIMITS.phone.max), z.regex(/^\+?[0-9 ()/.-]{6,}$/)),
  ),
  plzOrt: text(CONTACT_LIMITS.plzOrt.min, CONTACT_LIMITS.plzOrt.max),
  interesse: z.enum(keys(interessen)),
  nachricht: z.optional(text(1, CONTACT_LIMITS.nachricht.max)),
  datenschutz: z.literal(true),
  ref: z.optional(z.enum(CONTACT_REFS)),
  turnstileToken: token,
  website: honeypot,
});

export type ContactPayload = z.infer<typeof contactSchema>;

/** Felder des Kontaktformulars, die Menschen ausfüllen */
export type ContactField =
  'name' | 'email' | 'phone' | 'plzOrt' | 'interesse' | 'nachricht' | 'datenschutz';

/** Verständliche Meldungen fürs Kontaktformular (Sie-Form) */
export const contactMessages: Record<ContactField, string> = {
  name: 'Bitte geben Sie Ihren Namen ein.',
  email: 'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
  phone: 'Bitte prüfen Sie die Telefonnummer oder lassen Sie das Feld leer.',
  plzOrt: 'Bitte geben Sie PLZ und Ort ein.',
  interesse: 'Bitte wählen Sie aus, wofür Sie sich interessieren.',
  nachricht: 'Die Nachricht darf höchstens 2000 Zeichen lang sein.',
  datenschutz: 'Bitte bestätigen Sie, dass Sie die Datenschutzerklärung gelesen haben.',
};

/** Rohwerte aus dem Formular */
export interface ContactInput {
  name: string;
  email: string;
  phone: string;
  plzOrt: string;
  interesse: string;
  nachricht: string;
  datenschutz: boolean;
  ref?: string | null | undefined;
}

/** Trimmt die Eingaben und lässt leere optionale Felder weg. */
export function normalizeContact(input: ContactInput) {
  const phone = input.phone.trim();
  const nachricht = input.nachricht.trim();
  const ref = (CONTACT_REFS as readonly string[]).includes(input.ref ?? '')
    ? (input.ref as (typeof CONTACT_REFS)[number])
    : undefined;
  return {
    name: input.name.trim(),
    email: input.email.trim(),
    ...(phone ? { phone } : {}),
    plzOrt: input.plzOrt.trim(),
    interesse: input.interesse,
    ...(nachricht ? { nachricht } : {}),
    datenschutz: input.datenschutz,
    ...(ref ? { ref } : {}),
  };
}

/**
 * Prüft die Eingaben des Kontaktformulars und liefert Meldungen je Feld.
 * Turnstile-Token und Honeypot werden hier nicht bewertet.
 */
export function validateContact(input: ContactInput): Partial<Record<ContactField, string>> {
  const result = contactSchema.safeParse({ ...normalizeContact(input), turnstileToken: 'x' });
  const errors: Partial<Record<ContactField, string>> = {};
  if (result.success) return errors;
  for (const issue of result.error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && field in contactMessages) {
      errors[field as ContactField] ??= contactMessages[field as ContactField];
    }
  }
  return errors;
}
