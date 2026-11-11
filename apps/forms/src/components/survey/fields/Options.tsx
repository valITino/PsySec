import type { Answers, MultiQuestion, SingleQuestion } from '@psyber/survey';
import { validationMessages } from '@psyber/survey';
import { Icon } from '../Icon.tsx';
import { current, draft, hint, next, setAnswer } from '../state.ts';

/** Tastenkürzel A, B, C … */
export const letter = (index: number) => String.fromCharCode(65 + index);

/** Nach einer Auswahl per Klick oder Kürzel kurz den Zustand zeigen, dann weiter. */
const ADVANCE_DELAY = 280;
let advanceTimer = 0;

export function advanceSoon(): void {
  window.clearTimeout(advanceTimer);
  const id = current.value?.id;
  advanceTimer = window.setTimeout(() => {
    // Nur weiter, wenn die Person nicht inzwischen selbst geblättert hat.
    if (current.value?.id === id) next();
  }, ADVANCE_DELAY);
}

type SingleKey = 'q1' | 'q3' | 'q5' | 'q10' | 'q12' | 'q13';
type MultiKey = 'q2' | 'q7' | 'q14';

export function chooseSingle(question: SingleQuestion, value: string, advance: boolean): void {
  setAnswer(question.id as SingleKey, value as Answers[SingleKey]);
  if (advance) advanceSoon();
}

export function toggleMulti(question: MultiQuestion, value: string): void {
  const key = question.id as MultiKey;
  const selected = new Set<string>(draft.value.answers[key] ?? []);
  if (selected.has(value)) {
    selected.delete(value);
  } else {
    if (question.max !== undefined && selected.size >= question.max) {
      hint.value = validationMessages.too_many;
      return;
    }
    selected.add(value);
  }
  // Reihenfolge wie in der Frage, nicht wie angeklickt
  const ordered = Object.keys(question.options).filter((option) => selected.has(option));
  setAnswer(key, (ordered.length > 0 ? ordered : undefined) as Answers[MultiKey]);
}

export function SingleOptions({ question }: { question: SingleQuestion }) {
  const value = draft.value.answers[question.id as SingleKey];
  return (
    <div class="sv-options" role="radiogroup" aria-labelledby="sv-title">
      {Object.entries(question.options).map(([key, label], index) => (
        <label class="sv-option" key={key}>
          <input
            type="radio"
            name={question.id}
            value={key}
            checked={value === key}
            // detail > 0: echter Klick oder Tipp. Pfeiltasten wählen nur aus, ohne weiterzuspringen.
            onClick={(event) => chooseSingle(question, key, event.detail > 0)}
          />
          <span class="sv-key" aria-hidden="true">
            {letter(index)}
          </span>
          <span class="sv-option-label">{label}</span>
          <span class="sv-option-check" aria-hidden="true">
            <Icon name="check" size={18} strokeWidth={2.4} />
          </span>
        </label>
      ))}
    </div>
  );
}

export function MultiOptions({ question }: { question: MultiQuestion }) {
  const selected = draft.value.answers[question.id as MultiKey] ?? [];
  const full = question.max !== undefined && selected.length >= question.max;
  return (
    <div class="sv-options" role="group" aria-labelledby="sv-title" aria-describedby="sv-desc">
      {Object.entries(question.options).map(([key, label], index) => {
        const checked = (selected as string[]).includes(key);
        return (
          <label class={`sv-option${full && !checked ? ' is-muted' : ''}`} key={key}>
            <input
              type="checkbox"
              name={question.id}
              value={key}
              checked={checked}
              onChange={(event) => {
                toggleMulti(question, key);
                // Wurde die Auswahl abgelehnt (Höchstzahl), das Häkchen zurücknehmen.
                const now = (draft.value.answers[question.id as MultiKey] ?? []) as string[];
                event.currentTarget.checked = now.includes(key);
              }}
            />
            <span class="sv-key" aria-hidden="true">
              {letter(index)}
            </span>
            <span class="sv-option-label">{label}</span>
            <span class="sv-option-check sv-option-box" aria-hidden="true">
              <Icon name="check" size={16} strokeWidth={2.6} />
            </span>
          </label>
        );
      })}
    </div>
  );
}
