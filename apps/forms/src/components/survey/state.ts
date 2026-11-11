/**
 * Zustand der Umfrage (Signals) und alle Aktionen.
 * Der Zwischenstand liegt im sessionStorage: nie im localStorage, jeder Zugriff in try/catch,
 * nach dem Absenden gelöscht.
 */
import { computed, signal } from '@preact/signals';
import {
  buildSubmission,
  emptyDraft,
  firstInvalid,
  isAnswered,
  normalizeFokus,
  normalizeQuelle,
  validateQuestion,
  visibleQuestions,
  type Answers,
  type Draft,
  type Fokus,
  type Quelle,
  type Question,
} from '@psyber/survey';
import { postJson, sendEvent } from '@psyber/ui/lib/api';
import { createTurnstile, noTurnstile, type TurnstileHandle } from '@psyber/ui/lib/turnstile';
import type { SurveyConfig } from '../../lib/site.ts';

export type Screen = 'start' | 'question' | 'done';

const STORAGE_KEY = 'psyber:umfrage:v1';
const STARTED_KEY = 'psyber:umfrage:gestartet';

// ---------------------------------------------------------------- Signale

export const screen = signal<Screen>('start');
/** Position innerhalb der sichtbaren Fragen */
export const position = signal(0);
export const draft = signal<Draft>(emptyDraft());
/** Freundlicher Hinweis zur aktuellen Frage */
export const hint = signal<string | null>(null);
/** Richtung des letzten Wechsels, für die Übergangsanimation */
export const direction = signal<'forward' | 'back'>('forward');
export const sending = signal(false);
export const sendFailed = signal(false);
/** Honeypot: bleibt bei Menschen leer */
export const honeypot = signal('');
/** Matrix (Frage 6): Zeile, auf die die Zifferntasten gerade wirken */
export const matrixRow = signal(0);

let quelle: Quelle = 'direkt';
let fokus: Fokus | undefined;

export const questions = computed<Question[]>(() => visibleQuestions(draft.value.answers));
export const total = computed(() => questions.value.length);
export const current = computed<Question | undefined>(
  () => questions.value[Math.min(position.value, questions.value.length - 1)],
);
export const isLast = computed(() => position.value >= total.value - 1);
export const answered = computed(() =>
  current.value ? isAnswered(current.value, draft.value) : false,
);

// ---------------------------------------------------------------- Speicher

interface Stored {
  draft: Draft;
  position: number;
  quelle: Quelle;
  fokus?: Fokus | undefined;
}

function save(): void {
  try {
    const data: Stored = { draft: draft.value, position: position.value, quelle, fokus };
    window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Privater Modus oder voller Speicher: die Umfrage läuft auch ohne Zwischenstand.
  }
}

function clear(): void {
  try {
    window.sessionStorage.removeItem(STORAGE_KEY);
    window.sessionStorage.removeItem(STARTED_KEY);
  } catch {
    // nichts zu tun
  }
}

function load(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as Partial<Stored>;
    if (!data.draft || typeof data.draft !== 'object' || typeof data.position !== 'number') {
      return null;
    }
    const base = emptyDraft();
    return {
      draft: {
        answers: { ...(data.draft.answers ?? {}) },
        q11: { ...base.q11, ...(data.draft.q11 ?? {}) },
        waitlist: { ...base.waitlist, ...(data.draft.waitlist ?? {}) },
      },
      position: Math.max(0, Math.floor(data.position)),
      quelle: normalizeQuelle(data.quelle),
      fokus: normalizeFokus(data.fokus),
    };
  } catch {
    return null;
  }
}

/** Beim Laden: versteckte Felder aus der URL lesen und einen Zwischenstand wiederherstellen. */
export function restore(): void {
  const params = new URLSearchParams(window.location.search);
  quelle = normalizeQuelle(params.get('quelle'));
  fokus = normalizeFokus(params.get('fokus'));

  const stored = load();
  if (!stored) return;
  // Wer mitten in der Umfrage neu lädt, behält die Quelle des ersten Besuchs.
  quelle = stored.quelle;
  fokus = stored.fokus ?? fokus;
  draft.value = stored.draft;
  position.value = Math.min(stored.position, visibleQuestions(stored.draft.answers).length - 1);
  screen.value = 'question';
}

// ---------------------------------------------------------------- Antworten

export function setAnswer<K extends keyof Answers>(key: K, value: Answers[K] | undefined): void {
  // `undefined` entfernt die Antwort: cleanAnswers() und JSON lassen solche Einträge weg.
  const answers: Answers = { ...draft.value.answers, [key]: value };
  // Sprunglogik: Wer das Abo nicht buchen würde, verliert eine frühere Antwort auf die Folgefrage.
  if (key === 'q12' && value === 'nicht_buchen') answers.q13 = undefined;
  draft.value = { ...draft.value, answers };
  hint.value = null;
  save();
}

export function patchDraft(patch: Partial<Draft>): void {
  draft.value = { ...draft.value, ...patch };
  hint.value = null;
  save();
}

// ---------------------------------------------------------------- Navigation

let config: SurveyConfig | null = null;

export function configure(value: SurveyConfig): void {
  config = value;
}

export function start(): void {
  screen.value = 'question';
  position.value = 0;
  direction.value = 'forward';
  save();
  // Einmal pro Sitzung zählen, auch wenn jemand zurück zum Start geht.
  if (!alreadyStarted()) sendEvent(config?.api ?? '', 'survey_started');
  startedInMemory = true;
}

let startedInMemory = false;

function alreadyStarted(): boolean {
  try {
    const counted = window.sessionStorage.getItem(STARTED_KEY) === '1';
    window.sessionStorage.setItem(STARTED_KEY, '1');
    return counted;
  } catch {
    // Ohne Speicher zählen wir einmal pro Seitenaufruf.
    return startedInMemory;
  }
}

export function back(): void {
  hint.value = null;
  sendFailed.value = false;
  direction.value = 'back';
  if (position.value === 0) {
    screen.value = 'start';
    return;
  }
  position.value -= 1;
  matrixRow.value = 0;
  save();
}

/** Weiter zur nächsten Frage oder, bei der letzten, absenden. */
export function next(): void {
  const question = current.value;
  if (!question || sending.value) return;
  const result = validateQuestion(question, draft.value);
  if (!result.ok) {
    hint.value = result.message;
    return;
  }
  hint.value = null;
  if (isLast.value) {
    void submit();
    return;
  }
  direction.value = 'forward';
  position.value += 1;
  matrixRow.value = 0;
  save();
}

// ---------------------------------------------------------------- Absenden

let turnstile: Promise<TurnstileHandle> | null = null;
let turnstileContainer: HTMLElement | null = null;

export function setTurnstileContainer(element: HTMLElement | null): void {
  turnstileContainer = element;
}

/** Turnstile unsichtbar und erst kurz vor dem Absenden laden. */
function ensureTurnstile(): Promise<TurnstileHandle> {
  const siteKey = config?.turnstileSiteKey ?? '';
  if (!siteKey || !turnstileContainer) return Promise.resolve(noTurnstile());
  turnstile ??= createTurnstile(turnstileContainer, { siteKey, invisible: true });
  turnstile.catch(() => {
    turnstile = null;
  });
  return turnstile;
}

export async function submit(): Promise<void> {
  if (sending.value) return;

  // Nach einer Wiederherstellung könnte weiter vorn etwas fehlen: dorthin springen.
  const invalid = firstInvalid(draft.value);
  if (invalid) {
    const target = questions.value.findIndex((question) => question.id === invalid);
    const question = questions.value[target];
    if (target >= 0 && question) {
      direction.value = 'back';
      position.value = target;
      matrixRow.value = 0;
      const result = validateQuestion(question, draft.value);
      hint.value = result.ok ? null : result.message;
    }
    return;
  }

  sending.value = true;
  sendFailed.value = false;
  let handle: TurnstileHandle | null = null;
  try {
    handle = await ensureTurnstile();
    const turnstileToken = await handle.getToken();
    const payload = buildSubmission({
      draft: draft.value,
      quelle,
      fokus,
      turnstileToken,
      honeypot: honeypot.value,
    });
    const result = await postJson(config?.api ?? '', '/v1/survey', payload);
    if (!result.ok) throw new Error(result.error ?? 'request_failed');
    clear();
    direction.value = 'forward';
    screen.value = 'done';
  } catch {
    // Die Antworten bleiben erhalten; «Erneut senden» versucht es nochmals.
    sendFailed.value = true;
    handle?.reset();
  } finally {
    sending.value = false;
  }
}
