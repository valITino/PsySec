/**
 * Umfrage-Funnel: eine Frage pro Screen, Fortschritt oben, «Zurück» und «Weiter» immer sichtbar.
 * Kein Menü, nur Logo und Fortschritt.
 */
import logoUrl from '@psyber/ui/brand/logo-dark.svg?url';
import { useEffect, useRef } from 'preact/hooks';
import type { SurveyConfig } from '../../lib/site.ts';
import { Done, QuestionScreen, Start } from './Screens.tsx';
import { onKeyDown } from './keyboard.ts';
import { configure, position, restore, screen, total } from './state.ts';

export default function SurveyApp({ config }: { config: SurveyConfig }) {
  configure(config);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    restore();
    document.addEventListener('keydown', onKeyDown);
    // Für Tests: Zwischenstand geladen, Tastatur angeschlossen.
    root.current?.setAttribute('data-ready', '');
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const inQuestion = screen.value === 'question';
  const step = position.value + 1;

  return (
    <div class="sv" data-screen={screen.value} ref={root}>
      <header class="sv-header">
        <div class="sv-header-inner">
          <a class="logo" href={config.links.home} aria-label="PSYber, zur Website">
            <img class="logo-img" src={logoUrl} width="139" height="44" alt="" decoding="async" />
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
