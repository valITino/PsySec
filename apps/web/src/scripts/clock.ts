/**
 * Echte Uhrzeit in Zürich, jede volle Minute aktualisiert. Ohne JS bleibt «--:--» stehen.
 *
 * Die Uhr startet erst, wenn eine ihrer Anzeigen in die Nähe des Bildschirms kommt, und dann in einem ruhigen
 * Moment: Beim ersten Mal lädt der Browser für die Zeitzone seine Zeitzonen-Daten, das kostet
 * auf schwachen Geräten spürbar Rechenzeit. Der Formatierer wird nur einmal gebaut.
 */
import { onceInView } from '@psyber/ui/motion';

let format: Intl.DateTimeFormat | null = null;
const targets = new Set<HTMLElement>();
let started = false;

function tick(): void {
  format ??= new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
  });
  const now = new Date();
  const text = format.format(now);
  for (const element of targets) element.textContent = text;
  window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
}

function start(): void {
  if (started) return;
  started = true;
  if ('requestIdleCallback' in window) window.requestIdleCallback(tick, { timeout: 800 });
  else setTimeout(tick, 50);
}

export function startClock(element: HTMLElement | null): void {
  if (!element) return;
  targets.add(element);
  // Die Uhr läuft schon: neue Anzeige sofort füllen.
  if (format) element.textContent = format.format(new Date());
  // Etwas früher als sichtbar, damit beim Hinscrollen schon die Uhrzeit steht. Bewusst knapp:
  // Auf dem Handy liegt die Anzeige im Mockup kurz unter dem ersten Bildschirm und soll das
  // Laden nicht belasten.
  onceInView(element, start, { threshold: 0, rootMargin: '120px 0px' });
}
