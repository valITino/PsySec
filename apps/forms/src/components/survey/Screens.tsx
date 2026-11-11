import { pickSchwerpunkte, type Question } from '@psyber/survey';
import { useSignal } from '@preact/signals';
import { useEffect, useLayoutEffect, useRef } from 'preact/hooks';
import type { SurveyConfig } from '../../lib/site.ts';
import { Icon } from './Icon.tsx';
import { VanWestendorpField, TextField, WaitlistField } from './fields/Inputs.tsx';
import { MultiOptions, SingleOptions } from './fields/Options.tsx';
import { MatrixField, ScaleField } from './fields/Scale.tsx';
import {
  answered,
  back,
  current,
  direction,
  done,
  hint,
  hintCount,
  honeypot,
  isLast,
  justChanged,
  next,
  position,
  sendFailed,
  sending,
  setTurnstileContainer,
  start,
  total,
} from './state.ts';

// ---------------------------------------------------------------- Start

export function Start({ config }: { config: SurveyConfig }) {
  const title = useRef<HTMLHeadingElement>(null);

  // Zurück von Frage 1: Der Fokus geht mit, statt auf den Seitenkörper zu fallen.
  useLayoutEffect(() => {
    if (direction.value === 'back') title.current?.focus({ preventScroll: true });
  }, []);

  return (
    <section class="sv-start" aria-labelledby="sv-start-title">
      <p class="kicker">
        <span aria-hidden="true">// </span>Rund 4 Minuten. Anonym. Mit Gratis-Checkliste.
      </p>
      <h1 class="display sv-h1" id="sv-start-title" tabIndex={-1} ref={title}>
        Wie sicher ist Ihre Familie online?
      </h1>
      <p class="lead sv-start-text">
        Wir planen ein Angebot für Familien und möchten wissen, was Sie wirklich brauchen. Die
        Umfrage dauert rund 4 Minuten und ist anonym. Am Ende gibt es die Checkliste «5 Warnsignale
        für Online-Betrug» gratis.
      </p>
      <div class="sv-start-actions">
        <button type="button" class="btn btn-primary sv-start-button" onClick={start}>
          <span>Los geht’s</span>
          <Icon name="arrow-right" size={18} class="icon-shift" />
        </button>
        <span class="sv-enter" aria-hidden="true">
          Enter <Icon name="corner-down-left" size={14} />
        </span>
      </div>
      {/* Erscheint nur, wenn die Seite nach einigen Sekunden noch nicht bedienbar ist (survey.css) */}
      <p class="sv-stuck">
        Die Umfrage lädt noch. Tut sich länger nichts, laden Sie die Seite bitte neu.
      </p>
      <p class="sv-howto">
        Oft genügt es, die Antwort anzutippen: Dann geht es von selbst weiter. Zurück können Sie
        jederzeit.
        <span class="sv-howto-keys">
          {' '}
          Mit der Tastatur wählen Buchstaben und Ziffern aus, Enter geht weiter.
        </span>
      </p>
      <p class="sv-privacy">
        Ihre Antworten werden anonym in einem Rechenzentrum in der EU gespeichert und nur
        zusammengefasst ausgewertet. Eine E-Mail-Adresse ist freiwillig und wird getrennt von den
        Antworten gespeichert.{' '}
        <a class="link" href={config.links.datenschutz}>
          Datenschutzerklärung
        </a>
      </p>
    </section>
  );
}

// ---------------------------------------------------------------- Frage

function Field({ question }: { question: Question }) {
  switch (question.type) {
    case 'single':
      return <SingleOptions question={question} />;
    case 'multi':
      return <MultiOptions question={question} />;
    case 'scale':
      return <ScaleField question={question} />;
    case 'matrix_scale':
      return <MatrixField question={question} />;
    case 'van_westendorp':
      return <VanWestendorpField question={question} />;
    case 'text':
      return <TextField question={question} />;
    case 'waitlist':
      return <WaitlistField question={question} />;
  }
}

export function QuestionScreen() {
  const question = current.value;
  const title = useRef<HTMLHeadingElement>(null);
  const turnstile = useRef<HTMLDivElement>(null);

  // Neue Frage: nach oben, Fokus auf die Frage (Screenreader lesen sie vor). Als Layout-Effekt,
  // also noch vor dem nächsten Bild: Der Fokus steht so nie zwischendurch auf dem Seitenkörper,
  // und ein Tastenkürzel direkt nach dem Wechsel geht nicht verloren.
  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    const fine = window.matchMedia('(pointer: fine)').matches;
    const input = fine
      ? document.querySelector<HTMLElement>('.sv-question input.input, .sv-question textarea')
      : null;
    (input ?? title.current)?.focus({ preventScroll: true });
  }, [question?.id]);

  useEffect(() => {
    setTurnstileContainer(turnstile.current);
    return () => setTurnstileContainer(null);
  }, []);

  if (!question) return null;

  // Kurz nach dem Wechsel der Frage zählen Klicks nicht (siehe justChanged in state.ts).
  const guardClick = (event: MouseEvent) => {
    if (!justChanged()) return;
    event.preventDefault();
    event.stopPropagation();
  };

  const last = isLast.value;
  const label = last
    ? sending.value
      ? 'Wird gesendet …'
      : sendFailed.value
        ? 'Erneut senden'
        : 'Absenden'
    : answered.value || question.required
      ? 'Weiter'
      : 'Überspringen';

  return (
    <div class="sv-stage">
      {/* tabIndex: Ein Klick irgendwo in die Frage hält den Fokus darin (für die Tastenkürzel). */}
      <section
        class={`sv-question sv-enter-${direction.value}`}
        key={question.id}
        aria-labelledby="sv-title"
        tabIndex={-1}
        onClickCapture={guardClick}
      >
        <p class="sv-step">
          <span aria-hidden="true">// </span>Frage {position.value + 1} von {total.value}
          {question.required ? '' : ' · freiwillig'}
        </p>
        <h1 class="sv-title" id="sv-title" tabIndex={-1} ref={title}>
          {question.text}
        </h1>
        {question.hint && (
          <p class="sv-desc" id="sv-desc">
            {question.hint}
          </p>
        )}

        <Field question={question} />

        {question.type === 'text' && (
          <p class="sv-keys mono" aria-hidden="true">
            Umschalt + Enter für eine neue Zeile
          </p>
        )}
      </section>

      {/* Honeypot: für Menschen unsichtbar und nicht per Tab erreichbar */}
      <div class="hp" aria-hidden="true">
        <label>
          Website (bitte leer lassen)
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            value={honeypot.value}
            onInput={(event) => (honeypot.value = event.currentTarget.value)}
          />
        </label>
      </div>
      <div class="sv-turnstile" ref={turnstile} />

      {/* Klebt unten: Hinweise stehen direkt über den Buttons und sind so immer im Bild. */}
      <div class="sv-foot">
        <div class="sv-messages" id="sv-hint" aria-live="polite">
          {hint.value && (
            <p class="field-error sv-hint" key={hintCount.value}>
              <Icon name="circle-alert" size={18} />
              <span>{hint.value}</span>
            </p>
          )}
          {sendFailed.value && (
            <p class="sv-send-error" role="alert">
              <Icon name="circle-alert" size={20} />
              <span>
                Ihre Antworten konnten nicht gesendet werden. Bitte versuchen Sie es nochmals.
              </span>
            </p>
          )}
        </div>

        <div class="sv-nav">
          <button
            type="button"
            class="btn btn-secondary sv-back"
            onClick={back}
            disabled={sending.value}
          >
            <Icon name="arrow-left" size={18} />
            <span>Zurück</span>
          </button>
          <button
            type="button"
            class="btn btn-primary sv-next"
            onClick={next}
            disabled={sending.value}
            aria-describedby="sv-hint"
          >
            <span>{label}</span>
            {!last && <Icon name="arrow-right" size={18} class="icon-shift" />}
          </button>
          <span class="sv-enter" aria-hidden="true">
            Enter <Icon name="corner-down-left" size={14} />
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Danke

export function Done({ config }: { config: SurveyConfig }) {
  const title = useRef<HTMLHeadingElement>(null);
  const feedback = useSignal('');
  const schwerpunkte = pickSchwerpunkte(done.value.q6);
  const { s } = done.value;
  const gewinn = `${config.links.gewinn}${s ? `&s=${s}` : ''}`;

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
    title.current?.focus({ preventScroll: true });
  }, []);

  const share = async () => {
    const url = config.links.share;
    try {
      if (navigator.share) {
        await navigator.share({
          title: 'PSYber-Umfrage',
          text: 'Wie sicher ist Ihre Familie online? Rund 4 Minuten, anonym.',
          url,
        });
        return;
      }
      await navigator.clipboard.writeText(url);
      feedback.value = 'Link kopiert.';
    } catch (error) {
      // Abbrechen des Teilen-Dialogs ist kein Fehler.
      if ((error as Error).name === 'AbortError') return;
      feedback.value = `Bitte kopieren Sie den Link von Hand: ${url}`;
    }
  };

  return (
    <section class="sv-done sv-enter-forward" aria-labelledby="sv-done-title">
      <h1 class="display sv-h1" id="sv-done-title" tabIndex={-1} ref={title}>
        Danke! Sie haben uns sehr geholfen.
      </h1>

      {schwerpunkte.length > 0 && (
        <div class="sv-block">
          <h2 class="sv-block-title">Ihre Schwerpunkte</h2>
          <ul class="sv-tips">
            {schwerpunkte.map((item) => (
              <li class="sv-tip" key={item.topic}>
                <p class="sv-tip-title">{item.label}</p>
                <p>{item.tip}</p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div class="sv-block">
        <h2 class="sv-block-title">Ihre Downloads</h2>
        <ul class="sv-downloads">
          <li>
            <a class="sv-download" href={config.links.checkliste}>
              <span>Checkliste «5 Warnsignale» herunterladen</span>
              <Icon name="arrow-right" size={20} class="icon-shift" />
            </a>
          </li>
          <li>
            <a class="sv-download" href={gewinn}>
              <span>
                🎉 Glückwunsch, Sie wurden ausgewählt! Gratis-Session im Wert von CHF 250 – nur
                heute einlösbar
              </span>
              <Icon name="arrow-right" size={20} class="icon-shift" />
            </a>
          </li>
        </ul>
      </div>

      <div class="sv-block sv-share">
        <p>Kennen Sie jemanden, den das interessiert?</p>
        <button type="button" class="btn btn-secondary" onClick={() => void share()}>
          <Icon name="share" size={18} />
          <span>Link teilen</span>
        </button>
        <p class="sv-share-feedback" aria-live="polite">
          {feedback.value}
        </p>
      </div>
    </section>
  );
}
