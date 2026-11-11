/**
 * Echte Uhrzeit in Zürich, jede volle Minute aktualisiert. Ohne JS bleibt «--:--» stehen.
 *
 * Der Formatierer wird nur einmal gebaut und erst in einem ruhigen Moment: Zeitzonen-Daten zu
 * laden, kostet den Browser beim ersten Mal spürbar Zeit, und die Uhr ist nicht dringend.
 */
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

export function startClock(element: HTMLElement | null): void {
  if (!element) return;
  targets.add(element);
  if (started) {
    // Die Uhr läuft schon: neue Anzeige sofort füllen.
    if (format) element.textContent = format.format(new Date());
    return;
  }
  started = true;
  if ('requestIdleCallback' in window) window.requestIdleCallback(tick, { timeout: 800 });
  else setTimeout(tick, 50);
}
