/**
 * Tastatur wie bei Typeform: Enter = weiter, Ziffern 1–5 bei Skalen, Buchstaben A, B, C … bei Optionen.
 *
 * Die Kürzel mit Buchstaben und Ziffern gelten nur, solange der Fokus in der Frage steht (dorthin
 * wandert er bei jedem Wechsel von selbst). So löst niemand Antworten aus, der gerade «Zurück»
 * fokussiert hat oder per Sprachsteuerung diktiert (WCAG 2.1.4).
 */
import type { Scale } from '@psyber/survey';
import { chooseSingle, toggleMulti } from './fields/Options.tsx';
import { chooseScale, setMatrix } from './fields/Scale.tsx';
import { current, matrixRow, next, screen, sending, start } from './state.ts';

const TEXT_INPUTS = new Set(['text', 'email', 'tel', 'number', 'search', 'url', '']);

function isTyping(target: HTMLElement): boolean {
  if (target.tagName === 'TEXTAREA') return true;
  return target.tagName === 'INPUT' && TEXT_INPUTS.has((target as HTMLInputElement).type);
}

/** Letzte Frage: Enter im E-Mail-Feld verlässt nur das Feld (zum Häkchen oder zu «Absenden»). */
function leaveEmail(): void {
  const checkbox = document.querySelector<HTMLInputElement>(
    '.sv-waitlist .checkbox:not(:disabled)',
  );
  (checkbox ?? document.querySelector<HTMLElement>('.sv-next'))?.focus();
}

export function onKeyDown(event: KeyboardEvent): void {
  if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.isComposing) return;
  // Eine gehaltene Taste zählt einmal: Sonst blättert Enter durch alle freiwilligen Fragen bis
  // zum Absenden, und eine gehaltene Ziffer füllt die ganze Matrix.
  if (event.repeat) return;
  const target = event.target as HTMLElement;
  const activates = target.tagName === 'BUTTON' || target.tagName === 'A';

  if (screen.value === 'start') {
    if (event.key === 'Enter' && !activates) {
      event.preventDefault();
      start();
    }
    return;
  }
  if (screen.value !== 'question' || sending.value) return;
  const question = current.value;
  if (!question) return;

  if (event.key === 'Enter') {
    // Buttons und Links lösen ihre eigene Aktion aus.
    if (activates) return;
    if (target.tagName === 'TEXTAREA') {
      // Im Freitext: Umschalt + Enter (oder die Enter-Taste am Handy) macht eine neue Zeile.
      const coarse = window.matchMedia('(pointer: coarse)').matches;
      if (event.shiftKey || coarse) return;
    }
    event.preventDefault();
    if (question.type === 'waitlist' && target.id === 'sv-email') {
      // Nicht absenden: Das Häkchen «Founding Family» steht erst nach der Adresse zur Wahl.
      leaveEmail();
      return;
    }
    next();
    return;
  }

  if (isTyping(target) || !target.closest('.sv-question')) return;

  if (/^[1-5]$/.test(event.key)) {
    const value = Number(event.key) as Scale;
    if (question.type === 'scale') {
      event.preventDefault();
      chooseScale(question, value, true);
    } else if (question.type === 'matrix_scale') {
      const row = Object.keys(question.rows)[matrixRow.value];
      if (row) {
        event.preventDefault();
        setMatrix(question, row, value);
      }
    }
    return;
  }

  if (/^[a-zA-Z]$/.test(event.key) && (question.type === 'single' || question.type === 'multi')) {
    const index = event.key.toLowerCase().charCodeAt(0) - 97;
    const option = Object.keys(question.options)[index];
    if (!option) return;
    event.preventDefault();
    if (question.type === 'single') chooseSingle(question, option, true);
    else toggleMulti(question, option);
  }
}
