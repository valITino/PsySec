/** Echte Uhrzeit in Zürich, jede volle Minute aktualisiert. Ohne JS bleibt «--:--» stehen. */
export function startClock(element: HTMLElement | null): void {
  if (!element) return;
  const format = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    hour: '2-digit',
    minute: '2-digit',
  });
  const tick = () => {
    const now = new Date();
    element.textContent = format.format(now);
    window.setTimeout(tick, 60_000 - (now.getSeconds() * 1000 + now.getMilliseconds()) + 50);
  };
  tick();
}
