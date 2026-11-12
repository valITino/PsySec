import { Q15_MAX_LENGTH, isValidEmail, parseChf } from '@psyber/survey';
import type {
  Q11Field,
  TextQuestion,
  VanWestendorpQuestion,
  WaitlistQuestion,
} from '@psyber/survey';
import { draft, patchDraft, problem, setAnswer } from '../state.ts';

const VW_FIELDS: readonly Q11Field[] = ['a', 'b', 'c', 'd'];

/** Frage 11: vier Beträge in CHF (Van Westendorp) */
export function VanWestendorpField({ question }: { question: VanWestendorpQuestion }) {
  const values = draft.value.q11;
  // Welche Felder meint der Hinweis? Sie werden markiert und für Screenreader als ungültig gemeldet.
  const wrong = (field: Q11Field): boolean => {
    const code = problem.value;
    if (code === 'vw_partial') return values[field].trim() === '';
    if (code === 'vw_invalid') return parseChf(values[field]) === null;
    if (code !== 'vw_order') return false;
    const before = VW_FIELDS[VW_FIELDS.indexOf(field) - 1];
    return before !== undefined && (parseChf(values[field]) ?? 0) < (parseChf(values[before]) ?? 0);
  };
  return (
    <div class="sv-vw">
      {VW_FIELDS.map((field) => (
        <div class="field" key={field}>
          <label class="label" for={`sv-q11-${field}`}>
            {question.fields[field]}
          </label>
          <div class="sv-money">
            <span class="sv-money-prefix mono" aria-hidden="true">
              CHF
            </span>
            <input
              class="input"
              id={`sv-q11-${field}`}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={7}
              value={values[field]}
              aria-describedby="sv-hint"
              aria-invalid={wrong(field) ? 'true' : undefined}
              onInput={(event) =>
                patchDraft({ q11: { ...draft.value.q11, [field]: event.currentTarget.value } })
              }
            />
          </div>
        </div>
      ))}
    </div>
  );
}

/** Frage 15: Freitext */
export function TextField({ question }: { question: TextQuestion }) {
  const value = draft.value.answers.q15 ?? '';
  return (
    <div class="field">
      <textarea
        class="input sv-textarea"
        id="sv-q15"
        rows={5}
        maxLength={question.maxLength}
        placeholder={question.placeholder}
        value={value}
        aria-labelledby="sv-title"
        aria-describedby="sv-q15-count sv-hint"
        onInput={(event) => setAnswer('q15', event.currentTarget.value || undefined)}
      />
      <p class="sv-count-chars mono" id="sv-q15-count">
        {value.length} / {Q15_MAX_LENGTH} Zeichen
      </p>
    </div>
  );
}

/** Frage 16: freiwillige E-Mail für die Warteliste */
export function WaitlistField({ question }: { question: WaitlistQuestion }) {
  const { email, foundingFamily } = draft.value.waitlist;
  const valid = isValidEmail(email);
  return (
    <div class="sv-waitlist">
      <div class="field">
        <label class="label" for="sv-email">
          {question.fields.email}
        </label>
        <input
          class="input"
          id="sv-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          enterKeyHint="done"
          maxLength={254}
          value={email}
          aria-describedby="sv-waitlist-note sv-hint"
          aria-invalid={problem.value === 'email_invalid' ? 'true' : undefined}
          onInput={(event) => {
            const value = event.currentTarget.value;
            patchDraft({
              waitlist: {
                email: value,
                // Ohne gültige Adresse kann das Häkchen nicht gesetzt bleiben.
                foundingFamily: isValidEmail(value) ? draft.value.waitlist.foundingFamily : false,
              },
            });
          }}
        />
      </div>
      <label class={`check${valid ? '' : ' is-disabled'}`}>
        <input
          class="checkbox"
          type="checkbox"
          checked={foundingFamily}
          disabled={!valid}
          onChange={(event) =>
            patchDraft({
              waitlist: { ...draft.value.waitlist, foundingFamily: event.currentTarget.checked },
            })
          }
        />
        <span>{question.fields.founding_family}</span>
      </label>
      <p class="sv-note" id="sv-waitlist-note">
        {question.note}
      </p>
    </div>
  );
}
