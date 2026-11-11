/**
 * Sprunglogik, Validierung je Frage, versteckte Felder und Auswahl der Schwerpunkte.
 * Alles ohne DOM, damit Client, API und Tests dieselbe Logik nutzen.
 */
import {
  FOKUS,
  QUELLEN,
  QUELLEN_STORED,
  SCALE_VALUES,
  VW_MAX,
  VW_MIN,
  q6Rows,
  questions,
  type Answers,
  type Fokus,
  type Q11Field,
  type Q6Row,
  type Quelle,
  type Question,
  type QuestionId,
  type Scale,
  type Waitlist,
} from './questions.ts';
import { SCHEMA_VERSION, emailSchema, type SurveySubmission } from './schema.ts';
import { tips } from './tips.ts';

// ---------------------------------------------------------------- Versteckte Felder

/** `?quelle=`: erlaubte Werte bleiben, unbekannt → `andere`, fehlt → `direkt` */
export function normalizeQuelle(raw: string | null | undefined): Quelle {
  const value = (raw ?? '').trim().toLowerCase();
  if (!value) return 'direkt';
  return (QUELLEN as readonly string[]).includes(value) ? (value as Quelle) : 'andere';
}

/**
 * Quelle aus einem gespeicherten Zwischenstand. Sie ist schon normalisiert und wird darum nur
 * geprüft: `direkt` und `andere` bleiben, was sie sind (unlesbar → `direkt`).
 */
export function storedQuelle(value: unknown): Quelle {
  return typeof value === 'string' && (QUELLEN_STORED as readonly string[]).includes(value)
    ? (value as Quelle)
    : 'direkt';
}

/** `?fokus=`: vor, nach, unklar; sonst leer */
export function normalizeFokus(raw: string | null | undefined): Fokus | undefined {
  const value = (raw ?? '').trim().toLowerCase();
  return (FOKUS as readonly string[]).includes(value) ? (value as Fokus) : undefined;
}

// ---------------------------------------------------------------- Sprunglogik

export function isSkipped(question: Question, answers: Answers): boolean {
  if (!question.skipIf) return false;
  const other = answers[question.skipIf.question as keyof Answers];
  return other === question.skipIf.equals;
}

/** Fragen in Reihenfolge, ohne übersprungene. Die Länge ist die Gesamtzahl der Anzeige «3 / 16». */
export function visibleQuestions(answers: Answers): Question[] {
  return questions.filter((question) => !isSkipped(question, answers));
}

// ---------------------------------------------------------------- Eingaben im Formular

/** Rohwerte der vier Betragsfelder von Frage 11, so wie sie eingetippt wurden */
export type VanWestendorpDraft = Record<Q11Field, string>;

export const emptyVanWestendorp = (): VanWestendorpDraft => ({ a: '', b: '', c: '', d: '' });

export interface WaitlistDraft {
  email: string;
  foundingFamily: boolean;
}

/** Zustand der Umfrage im Browser */
export interface Draft {
  answers: Answers;
  q11: VanWestendorpDraft;
  waitlist: WaitlistDraft;
}

export const emptyDraft = (): Draft => ({
  answers: {},
  q11: emptyVanWestendorp(),
  waitlist: { email: '', foundingFamily: false },
});

export const isValidEmail = (value: string) => emailSchema.safeParse(value.trim()).success;

/** Ganze Zahl aus einem Betragsfeld; Apostroph und Leerzeichen als Tausendertrennung sind erlaubt. */
export function parseChf(raw: string): number | null {
  const cleaned = raw.trim().replace(/[’'\s]/g, '');
  if (!/^\d{1,6}$/.test(cleaned)) return null;
  const value = Number(cleaned);
  return value >= VW_MIN && value <= VW_MAX ? value : null;
}

const Q11_FIELDS: readonly Q11Field[] = ['a', 'b', 'c', 'd'];

// ---------------------------------------------------------------- Zwischenstand prüfen

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isScale = (value: unknown): value is Scale =>
  typeof value === 'number' && (SCALE_VALUES as readonly number[]).includes(value);

/** Aus einem Objekt nur die Zeilen von Frage 6 mit gültigem Wert */
function q6From(value: unknown): NonNullable<Answers['q6']> {
  const out: NonNullable<Answers['q6']> = {};
  if (!isRecord(value)) return out;
  for (const row of Object.keys(q6Rows) as Q6Row[]) {
    const given = value[row];
    if (isScale(given)) out[row] = given;
  }
  return out;
}

/**
 * Zwischenstand aus dem Speicher des Browsers: übernimmt nur, was zur Umfrage passt. Alles andere
 * (älterer Stand, beschädigter Eintrag) fällt weg, statt später beim Anzeigen zu stolpern oder
 * bei jedem Absenden von der API abgelehnt zu werden.
 */
export function sanitizeDraft(value: unknown): Draft {
  const draft = emptyDraft();
  if (!isRecord(value)) return draft;

  const raw = isRecord(value.answers) ? value.answers : {};
  const answers: Record<string, unknown> = {};
  for (const question of questions) {
    const given = raw[question.id];
    switch (question.type) {
      case 'single':
        if (typeof given === 'string' && Object.hasOwn(question.options, given)) {
          answers[question.id] = given;
        }
        break;
      case 'multi': {
        if (!Array.isArray(given)) break;
        // Reihenfolge wie in der Frage, höchstens so viele wie erlaubt
        const valid = Object.keys(question.options).filter((option) => given.includes(option));
        const kept = question.max === undefined ? valid : valid.slice(0, question.max);
        if (kept.length > 0) answers[question.id] = kept;
        break;
      }
      case 'scale':
        if (isScale(given)) answers[question.id] = given;
        break;
      case 'matrix_scale': {
        const rows = q6From(given);
        if (Object.keys(rows).length > 0) answers[question.id] = rows;
        break;
      }
      case 'text':
        if (typeof given === 'string' && given) {
          answers[question.id] = given.slice(0, question.maxLength);
        }
        break;
      case 'van_westendorp':
      case 'waitlist':
        // Liegen als Rohwerte ausserhalb von `answers` (siehe unten).
        break;
    }
  }
  draft.answers = answers as Answers;

  if (isRecord(value.q11)) {
    for (const field of Q11_FIELDS) {
      const amount = value.q11[field];
      if (typeof amount === 'string') draft.q11[field] = amount.slice(0, 7);
    }
  }
  if (isRecord(value.waitlist)) {
    const { email, foundingFamily } = value.waitlist;
    if (typeof email === 'string') draft.waitlist.email = email.slice(0, 254);
    // Das Häkchen gilt nur zusammen mit einer gültigen Adresse.
    draft.waitlist.foundingFamily = foundingFamily === true && isValidEmail(draft.waitlist.email);
  }
  return draft;
}

// ---------------------------------------------------------------- Validierung je Frage

export type ValidationCode =
  | 'required'
  | 'required_multi'
  | 'matrix_incomplete'
  | 'too_many'
  | 'vw_partial'
  | 'vw_invalid'
  | 'vw_order'
  | 'too_long'
  | 'email_invalid';

export const validationMessages: Record<ValidationCode, string> = {
  required: 'Bitte wählen Sie eine Antwort aus.',
  required_multi: 'Bitte wählen Sie mindestens eine Antwort aus.',
  matrix_incomplete: 'Bitte bewerten Sie jedes Thema.',
  too_many: 'Bitte wählen Sie höchstens zwei Antworten.',
  vw_partial: 'Bitte füllen Sie alle vier Felder aus oder lassen Sie alle leer.',
  vw_invalid: 'Bitte ganze Zahlen von 0 bis 20’000 eintragen.',
  vw_order: 'Die Beträge sollten von oben nach unten steigen.',
  too_long: 'Bitte höchstens 1000 Zeichen.',
  email_invalid: 'Bitte geben Sie eine gültige E-Mail-Adresse ein oder lassen Sie das Feld leer.',
};

export type Validation = { ok: true } | { ok: false; code: ValidationCode; message: string };

const fail = (code: ValidationCode): Validation => ({
  ok: false,
  code,
  message: validationMessages[code],
});
const OK: Validation = { ok: true };

/** Ist die Frage beantwortet? Entscheidet zwischen «Weiter» und «Überspringen». */
export function isAnswered(question: Question, draft: Draft): boolean {
  const { answers } = draft;
  switch (question.type) {
    case 'single':
    case 'scale':
      return answers[question.id as keyof Answers] !== undefined;
    case 'multi': {
      const value = answers[question.id as 'q2' | 'q7' | 'q14'];
      return Array.isArray(value) && value.length > 0;
    }
    case 'matrix_scale':
      return Object.keys(answers.q6 ?? {}).length > 0;
    case 'van_westendorp':
      return Q11_FIELDS.some((field) => draft.q11[field].trim() !== '');
    case 'text':
      return (answers.q15 ?? '').trim() !== '';
    case 'waitlist':
      return draft.waitlist.email.trim() !== '';
  }
}

/** Darf es mit dieser Frage weitergehen? Liefert sonst einen freundlichen Hinweis. */
export function validateQuestion(question: Question, draft: Draft): Validation {
  const { answers } = draft;
  switch (question.type) {
    case 'single':
    case 'scale':
      return question.required && !isAnswered(question, draft) ? fail('required') : OK;

    case 'multi': {
      const value = answers[question.id as 'q2' | 'q7' | 'q14'] ?? [];
      if (question.required && value.length === 0) return fail('required_multi');
      if (question.max !== undefined && value.length > question.max) return fail('too_many');
      return OK;
    }

    case 'matrix_scale': {
      const given = answers.q6 ?? {};
      const complete = Object.keys(question.rows).every((row) => given[row as Q6Row] !== undefined);
      return question.required && !complete ? fail('matrix_incomplete') : OK;
    }

    case 'van_westendorp': {
      const filled = Q11_FIELDS.filter((field) => draft.q11[field].trim() !== '');
      if (filled.length === 0) return OK;
      if (filled.length < Q11_FIELDS.length) return fail('vw_partial');
      const values = Q11_FIELDS.map((field) => parseChf(draft.q11[field]));
      if (values.some((value) => value === null)) return fail('vw_invalid');
      const [a, b, c, d] = values as number[];
      return a! <= b! && b! <= c! && c! <= d! ? OK : fail('vw_order');
    }

    case 'text':
      return (answers.q15 ?? '').trim().length > question.maxLength ? fail('too_long') : OK;

    case 'waitlist': {
      const email = draft.waitlist.email.trim();
      return email === '' || isValidEmail(email) ? OK : fail('email_invalid');
    }
  }
}

/** Erste sichtbare Frage, bei der es nicht weitergehen dürfte (z. B. nach Wiederherstellung). */
export function firstInvalid(draft: Draft): QuestionId | null {
  for (const question of visibleQuestions(draft.answers)) {
    if (!validateQuestion(question, draft).ok) return question.id;
  }
  return null;
}

// ---------------------------------------------------------------- Absenden

/** Antworten für die API: ohne übersprungene Fragen, ohne leere Werte. */
export function cleanAnswers(draft: Draft): Answers {
  const { answers } = draft;
  const out: Answers = {};
  if (answers.q1) out.q1 = answers.q1;
  if (answers.q2?.length) out.q2 = [...answers.q2];
  if (answers.q3) out.q3 = answers.q3;
  if (answers.q4) out.q4 = answers.q4;
  if (answers.q5) out.q5 = answers.q5;
  if (answers.q6 && Object.keys(answers.q6).length > 0) out.q6 = { ...answers.q6 };
  if (answers.q7?.length) out.q7 = [...answers.q7];
  if (answers.q8) out.q8 = answers.q8;
  if (answers.q9) out.q9 = answers.q9;
  if (answers.q10) out.q10 = answers.q10;
  const amounts = Q11_FIELDS.map((field) => parseChf(draft.q11[field]));
  if (amounts.every((value) => value !== null)) {
    const [a, b, c, d] = amounts as number[];
    out.q11 = { a: a!, b: b!, c: c!, d: d! };
  }
  if (answers.q12) out.q12 = answers.q12;
  if (answers.q13 && answers.q12 !== 'nicht_buchen') out.q13 = answers.q13;
  if (answers.q14?.length) out.q14 = [...answers.q14];
  const text = (answers.q15 ?? '').trim();
  if (text) out.q15 = text;
  return out;
}

/** E-Mail für die Warteliste; `undefined`, wenn keine gültige Adresse eingetragen ist. */
export function cleanWaitlist(draft: Draft): Waitlist | undefined {
  const email = draft.waitlist.email.trim();
  if (!email || !isValidEmail(email)) return undefined;
  return { email, foundingFamily: draft.waitlist.foundingFamily };
}

export function buildSubmission(input: {
  draft: Draft;
  quelle: Quelle;
  fokus?: Fokus | undefined;
  turnstileToken: string;
  honeypot?: string | undefined;
  /** Zufällige Kennung dieser Einsendung, siehe schema.ts */
  submissionId?: string | undefined;
}): SurveySubmission {
  const waitlist = cleanWaitlist(input.draft);
  return {
    schemaVersion: SCHEMA_VERSION,
    ...(input.submissionId ? { submissionId: input.submissionId } : {}),
    quelle: input.quelle,
    ...(input.fokus ? { fokus: input.fokus } : {}),
    answers: cleanAnswers(input.draft) as SurveySubmission['answers'],
    ...(waitlist ? { waitlist } : {}),
    turnstileToken: input.turnstileToken,
    ...(input.honeypot ? { website: input.honeypot } : {}),
  };
}

// ---------------------------------------------------------------- Danke-Screen

export interface Schwerpunkt {
  topic: Q6Row;
  label: string;
  value: Scale;
  tip: string;
}

/**
 * Was der Danke-Screen nach dem Absenden noch braucht: die Selbsteinschätzung (für den Test-Link)
 * und die gezeigten Schwerpunkte. Mehr bleibt von den Antworten nicht im Browser.
 */
export interface DoneMarker {
  s?: Scale;
  q6?: NonNullable<Answers['q6']>;
}

export function doneMarker(answers: Answers): DoneMarker {
  const top = pickSchwerpunkte(answers.q6);
  const marker: DoneMarker = {};
  if (answers.q4) marker.s = answers.q4;
  if (top.length > 0) {
    marker.q6 = Object.fromEntries(top.map((item) => [item.topic, item.value]));
  }
  return marker;
}

/** Liest einen gespeicherten Merker; `null`, wenn es keiner ist. */
export function parseDoneMarker(value: unknown): DoneMarker | null {
  if (!isRecord(value)) return null;
  const marker: DoneMarker = {};
  if (isScale(value.s)) marker.s = value.s;
  const rows = q6From(value.q6);
  if (Object.keys(rows).length > 0) marker.q6 = rows;
  return marker;
}

/**
 * Bis zu drei Themen aus Frage 6 mit Wert 4 oder 5, höchster Wert zuerst.
 * Bei Gleichstand gilt die Reihenfolge der Themen in der Umfrage.
 */
export function pickSchwerpunkte(q6: Answers['q6']): Schwerpunkt[] {
  if (!q6) return [];
  const order = Object.keys(q6Rows) as Q6Row[];
  return order
    .flatMap((topic) => {
      const value = q6[topic];
      return value !== undefined && value >= 4
        ? [{ topic, label: q6Rows[topic], value, tip: tips[topic] }]
        : [];
    })
    .sort((left, right) => right.value - left.value)
    .slice(0, 3);
}
