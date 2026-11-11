import { SCALE_VALUES } from '@psyber/survey';
import type { Answers, MatrixScaleQuestion, Q6Row, Scale, ScaleQuestion } from '@psyber/survey';
import { draft, matrixRow, setAnswer } from '../state.ts';
import { advanceSoon } from './Options.tsx';

type ScaleKey = 'q4' | 'q8' | 'q9';

export function chooseScale(question: ScaleQuestion, value: Scale, advance: boolean): void {
  setAnswer(question.id as ScaleKey, value);
  if (advance) advanceSoon();
}

const tileLabel = (value: number, labels: { min: string; max: string }) =>
  value === 1 ? `1, ${labels.min}` : value === 5 ? `5, ${labels.max}` : String(value);

export function ScaleField({ question }: { question: ScaleQuestion }) {
  const current = draft.value.answers[question.id as ScaleKey];
  return (
    <div class="sv-scale-wrap">
      <div class="sv-scale" role="radiogroup" aria-labelledby="sv-title">
        {SCALE_VALUES.map((value) => (
          <label class="sv-tile" key={value}>
            <input
              type="radio"
              name={question.id}
              value={value}
              checked={current === value}
              aria-label={tileLabel(value, question.labels)}
              onClick={(event) => chooseScale(question, value, event.detail > 0)}
            />
            <span class="sv-tile-num" aria-hidden="true">
              {value}
            </span>
          </label>
        ))}
      </div>
      <p class="sv-scale-labels mono" aria-hidden="true">
        <span>1 = {question.labels.min}</span>
        <span>5 = {question.labels.max}</span>
      </p>
    </div>
  );
}

// ---------------------------------------------------------------- Matrix (Frage 6)

export function setMatrix(question: MatrixScaleQuestion, row: string, value: Scale): void {
  const next: NonNullable<Answers['q6']> = { ...(draft.value.answers.q6 ?? {}), [row]: value };
  setAnswer('q6', next);
  // Zur nächsten noch offenen Zeile springen
  const rows = Object.keys(question.rows);
  const open = rows.findIndex((key) => next[key as Q6Row] === undefined);
  matrixRow.value = open >= 0 ? open : Math.min(rows.indexOf(row) + 1, rows.length - 1);
}

export function MatrixField({ question }: { question: MatrixScaleQuestion }) {
  const answers = draft.value.answers.q6 ?? {};
  const rows = Object.entries(question.rows);
  return (
    <div class="sv-matrix">
      <p class="sv-scale-labels mono" aria-hidden="true">
        <span>1 = {question.labels.min}</span>
        <span>5 = {question.labels.max}</span>
      </p>
      {rows.map(([key, label], index) => (
        <div
          class={`sv-row${matrixRow.value === index ? ' is-active' : ''}`}
          role="radiogroup"
          aria-labelledby={`sv-row-${key}`}
          key={key}
        >
          <p class="sv-row-label" id={`sv-row-${key}`}>
            {label}
          </p>
          <div class="sv-scale">
            {SCALE_VALUES.map((value) => (
              <label class="sv-tile" key={value}>
                <input
                  type="radio"
                  name={`q6-${key}`}
                  value={value}
                  checked={answers[key as Q6Row] === value}
                  aria-label={tileLabel(value, question.labels)}
                  onFocus={() => (matrixRow.value = index)}
                  onClick={() => setMatrix(question, key, value)}
                />
                <span class="sv-tile-num" aria-hidden="true">
                  {value}
                </span>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
