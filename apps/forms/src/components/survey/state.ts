/**
 * Zustand der Umfrage (Signals) und alle Aktionen.
 * Der Zwischenstand liegt im sessionStorage: nie im localStorage, jeder Zugriff in try/catch,
 * nach dem Absenden gelöscht. Danach bleibt nur ein kleiner Merker für den Danke-Screen.
 */
import { computed, signal } from '@preact/signals';
import {
  buildSubmission,
  doneMarker,
  emptyDraft,
  firstInvalid,
  isAnswered,
  normalizeFokus,
  normalizeQuelle,
  parseDoneMarker,
  sanitizeDraft,
  storedQuelle,
  validateQuestion,
  validationMessages,
  visibleQuestions,
  type Answers,
  type DoneMarker,
  type Draft,
  type Fokus,
  type Quelle,
  type Question,
  type ValidationCode,
} from '@psyber/survey';
import { postJson, sendEvent } from '@psyber/ui/lib/api';
import { automated } from '@psyber/ui/lib/track';
import { createTurnstile, noTurnstile, type TurnstileHandle } from '@psyber/ui/lib/turnstile';
import type { SurveyConfig } from '../../lib/site.ts';

export type Screen = 'start' | 'question' | 'done';

const STORAGE_KEY = 'psyber:umfrage:v1';
const STARTED_KEY = 'psyber:umfrage:gestartet';
const DONE_KEY = 'psyber:umfrage:fertig';

// ---------------------------------------------------------------- Signale

export const screen = signal<Screen>('start');
/** Position innerhalb der sichtbaren Fragen */
export const position = signal(0);
export const draft = signal<Draft>(emptyDraft());
/** Freundlicher Hinweis zur aktuellen Frage */
export const hint = signal<string | null>(null);
/** Grund des Hinweises: Die Felder markieren damit, was nicht stimmt. */
export const problem = signal<ValidationCode | null>(null);
/** Zählt jeden gezeigten Hinweis: Auch derselbe Text wird so erneut vorgelesen. */
export const hintCount = signal(0);
/** Nach dem Absenden: was der Danke-Screen zeigt */
export const done = signal<DoneMarker>({});
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
let submissionId: string | undefined;

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
  /** Kennung der Einsendung, sobald einmal gesendet wurde */
  id?: string | undefined;
  /** Fragen, die schon als «erreicht» gezählt sind: Ein Neuladen zählt sie nicht noch einmal. */
  seen?: string[] | undefined;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const STEP_ID = /^q\d{1,2}$/;

/**
 * Zufällige Kennung dieser Einsendung. Sie bleibt über «Erneut senden» und ein Neuladen gleich:
 * Kam die erste Anfrage doch an, legt die API damit keine zweite Antwort an.
 */
function newSubmissionId(): string | undefined {
  try {
    if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    bytes[6] = ((bytes[6] ?? 0) & 0x0f) | 0x40;
    bytes[8] = ((bytes[8] ?? 0) & 0x3f) | 0x80;
    const hex = [...bytes].map((byte) => byte.toString(16).padStart(2, '0')).join('');
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
  } catch {
    // Sehr alter Browser: dann ohne Kennung, die API vergibt selbst eine.
    return undefined;
  }
}

function save(): void {
  try {
    const data: Stored = {
      draft: draft.value,
      position: position.value,
      quelle,
      fokus,
      id: submissionId,
      seen: [...seen],
    };
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
    return {
      // Nur übernehmen, was zur Umfrage passt (siehe sanitizeDraft).
      draft: sanitizeDraft(data.draft),
      position: Number.isFinite(data.position) ? Math.max(0, Math.floor(data.position)) : 0,
      // Schon normalisiert gespeichert: nur prüfen, sonst würde aus «direkt» ein «andere».
      quelle: storedQuelle(data.quelle),
      fokus: normalizeFokus(data.fokus),
      id: typeof data.id === 'string' && UUID.test(data.id) ? data.id : undefined,
      seen: Array.isArray(data.seen)
        ? data.seen.filter((id): id is string => typeof id === 'string' && STEP_ID.test(id))
        : [],
    };
  } catch {
    return null;
  }
}

/**
 * Merker «abgeschlossen» für den Danke-Screen. Er enthält keine Antworten ausser der
 * Selbsteinschätzung (für den Test-Link) und den gezeigten Schwerpunkten.
 */
function saveDone(marker: DoneMarker): void {
  try {
    window.sessionStorage.setItem(DONE_KEY, JSON.stringify(marker));
  } catch {
    // Ohne Speicher steht nach einem Neuladen wieder der Start: wie bisher.
  }
}

/**
 * Der Merker gilt nur, wenn die Seite neu geladen oder über «Zurück» geöffnet wurde: In-App-
 * Browser laden dabei oft neu, und der Danke-Screen mit den beiden Links soll dann noch da sein.
 * Wer die Umfrage frisch aufruft, beginnt von vorn.
 */
function loadDone(): DoneMarker | null {
  try {
    const raw = window.sessionStorage.getItem(DONE_KEY);
    if (!raw) return null;
    const [navigation] = performance.getEntriesByType('navigation');
    const type = (navigation as PerformanceNavigationTiming | undefined)?.type;
    if (type !== 'reload' && type !== 'back_forward') {
      window.sessionStorage.removeItem(DONE_KEY);
      return null;
    }
    return parseDoneMarker(JSON.parse(raw));
  } catch {
    return null;
  }
}

/** Beim Laden: versteckte Felder aus der URL lesen und einen Zwischenstand wiederherstellen. */
export function restore(): void {
  const params = new URLSearchParams(window.location.search);
  quelle = normalizeQuelle(params.get('quelle'));
  fokus = normalizeFokus(params.get('fokus'));

  const finished = loadDone();
  if (finished) {
    done.value = finished;
    screen.value = 'done';
    return;
  }

  const stored = load();
  if (!stored) return;
  // Wer mitten in der Umfrage neu lädt, behält die Quelle des ersten Besuchs.
  quelle = stored.quelle;
  fokus = stored.fokus ?? fokus;
  submissionId = stored.id;
  for (const id of stored.seen ?? []) seen.add(id);
  draft.value = stored.draft;
  position.value = Math.min(stored.position, visibleQuestions(stored.draft.answers).length - 1);
  screen.value = 'question';
}

// ---------------------------------------------------------------- Antworten

export function showHint(code: ValidationCode): void {
  hint.value = validationMessages[code];
  problem.value = code;
  hintCount.value += 1;
}

export function clearHint(): void {
  hint.value = null;
  problem.value = null;
}

export function setAnswer<K extends keyof Answers>(key: K, value: Answers[K] | undefined): void {
  // `undefined` entfernt die Antwort: cleanAnswers() und JSON lassen solche Einträge weg.
  // Eine frühere Antwort auf Frage 13 bleibt stehen, auch wenn Frage 12 gerade «nicht buchen»
  // zeigt: Wer mit den Pfeiltasten durch die Optionen geht, soll nichts verlieren. Übersprungene
  // Fragen lässt cleanAnswers() beim Absenden weg.
  draft.value = { ...draft.value, answers: { ...draft.value.answers, [key]: value } };
  clearHint();
  save();
}

export function patchDraft(patch: Partial<Draft>): void {
  draft.value = { ...draft.value, ...patch };
  clearHint();
  save();
}

// ---------------------------------------------------------------- Navigation

/**
 * Kurz nach einem Fragenwechsel zählen Klicks nicht: Sonst trifft der zweite Klick eines
 * Doppelklicks die nächste Frage, die nach dem automatischen Weiterspringen an derselben Stelle
 * steht, und wählt dort unbemerkt eine Antwort.
 */
const CLICK_GUARD = 400;
let changedAt = -CLICK_GUARD;

function markChange(): void {
  changedAt = performance.now();
}

export const justChanged = (): boolean => performance.now() - changedAt < CLICK_GUARD;

let config: SurveyConfig | null = null;

export function configure(value: SurveyConfig): void {
  config = value;
}

export function start(): void {
  screen.value = 'question';
  position.value = 0;
  direction.value = 'forward';
  markChange();
  countStep();
  save();
  // Einmal pro Sitzung zählen, auch wenn jemand zurück zum Start geht.
  if (!alreadyStarted()) sendEvent(config?.api ?? '', 'survey_started');
  startedInMemory = true;
}

/** Fragen, die in dieser Sitzung schon als «erreicht» gezählt sind */
const seen = new Set<string>();

/**
 * Zählt einmal je Frage, dass jemand bis zu ihr gekommen ist: eine anonyme Tagessumme, aus der
 * sich ablesen lässt, wo die Umfrage abgebrochen wird. Antworten werden dabei nicht gesendet.
 */
function countStep(): void {
  const id = current.value?.id;
  if (!id || seen.has(id) || automated()) return;
  seen.add(id);
  sendEvent(config?.api ?? '', 'survey_step', { step: id });
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
  clearHint();
  sendFailed.value = false;
  direction.value = 'back';
  markChange();
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
    showHint(result.code);
    return;
  }
  clearHint();
  if (isLast.value) {
    void submit();
    return;
  }
  direction.value = 'forward';
  position.value += 1;
  matrixRow.value = 0;
  markChange();
  countStep();
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
      markChange();
      const result = validateQuestion(question, draft.value);
      if (result.ok) clearHint();
      else showHint(result.code);
    }
    return;
  }

  sending.value = true;
  sendFailed.value = false;
  let handle: TurnstileHandle | null = null;
  try {
    handle = await ensureTurnstile();
    const turnstileToken = await handle.getToken();
    // Vor dem ersten Versuch festlegen und merken, damit auch ein Neuladen dieselbe Kennung behält.
    if (!submissionId) {
      submissionId = newSubmissionId();
      save();
    }
    const payload = buildSubmission({
      draft: draft.value,
      quelle,
      fokus,
      turnstileToken,
      honeypot: honeypot.value,
      submissionId,
    });
    const result = await postJson(config?.api ?? '', '/v1/survey', payload);
    if (!result.ok) throw new Error(result.error ?? 'request_failed');
    // Die Antworten verschwinden aus dem Browser. Für den Danke-Screen bleibt nur der Merker.
    const marker = doneMarker(draft.value.answers);
    clear();
    seen.clear();
    saveDone(marker);
    submissionId = undefined;
    done.value = marker;
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
