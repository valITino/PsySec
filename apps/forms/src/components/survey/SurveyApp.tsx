/**
 * Umfrage-Funnel: eine Frage pro Screen, Fortschritt oben, «Zurück» und «Weiter» immer sichtbar.
 * Kein Menü, nur Logo und Fortschritt.
 */
import { useEffect } from 'preact/hooks';
import type { SurveyConfig } from '../../lib/site.ts';
import { Done, QuestionScreen, Start } from './Screens.tsx';
import { onKeyDown } from './keyboard.ts';
import { configure, position, restore, screen, total } from './state.ts';

const PSI_ICON = 'M2 2.2 C2 7 4 9.2 6 9.2 C8 9.2 10 7 10 2.2 M6 0.8 V13.2';

export default function SurveyApp({ config }: { config: SurveyConfig }) {
  configure(config);

  useEffect(() => {
    restore();
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const inQuestion = screen.value === 'question';
  const step = position.value + 1;

  return (
    <div class="sv" data-screen={screen.value}>
      <header class="sv-header">
        <div class="sv-header-inner">
          <a class="logo" href={config.links.home} aria-label="PSYber, zur Website">
            <svg
              class="psi-icon logo-icon"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 12 14"
              width="22.29"
              height="26"
              fill="none"
              stroke="currentColor"
              stroke-width="1.4"
              stroke-linecap="round"
              stroke-linejoin="round"
              aria-hidden="true"
              focusable="false"
            >
              <path d={PSI_ICON} />
            </svg>
            <span class="wordmark logo-word">PSYber</span>
          </a>
          {inQuestion && (
            <p class="sv-progress-text mono" aria-hidden="true">
              {step} / {total.value}
            </p>
          )}
        </div>
        {inQuestion && (
          <progress
            class="sv-progress"
            value={step}
            max={total.value}
            aria-label="Fortschritt der Umfrage"
            aria-valuetext={`Frage ${step} von ${total.value}`}
          />
        )}
      </header>

      <main class="sv-main" id="inhalt">
        {screen.value === 'start' && <Start config={config} />}
        {inQuestion && <QuestionScreen />}
        {screen.value === 'done' && <Done config={config} />}
      </main>

      <footer class="sv-footer">
        <a href={config.links.impressum}>Impressum</a>
        <a href={config.links.datenschutz}>Datenschutz</a>
      </footer>
    </div>
  );
}
