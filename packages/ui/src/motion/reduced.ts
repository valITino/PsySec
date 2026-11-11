/**
 * Bewegungs-Präferenzen.
 * - `prefers-reduced-motion`: keine Autoplay- oder Scrub-Animationen, kein Lenis.
 * - `data-motion="off"` am <html>: vom Menschen pausierte Dauerbewegung (Ticker, Psi-Netz).
 */

const QUERY = '(prefers-reduced-motion: reduce)';
const EVENT = 'psyber:motion';

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia(QUERY).matches;
}

/** Dürfen Animationen überhaupt laufen? */
export function motionAllowed(): boolean {
  return !prefersReducedMotion();
}

export function onReducedMotionChange(callback: (reduced: boolean) => void): () => void {
  const query = window.matchMedia(QUERY);
  const handler = (event: MediaQueryListEvent) => callback(event.matches);
  query.addEventListener('change', handler);
  return () => query.removeEventListener('change', handler);
}

/** Hat die Person laufende Bewegung über den Schalter pausiert? */
export function motionPaused(): boolean {
  return document.documentElement.dataset.motion === 'off';
}

export function setMotionPaused(paused: boolean): void {
  document.documentElement.dataset.motion = paused ? 'off' : 'on';
  document.dispatchEvent(new CustomEvent<{ paused: boolean }>(EVENT, { detail: { paused } }));
}

export function onMotionPausedChange(callback: (paused: boolean) => void): () => void {
  const handler = (event: Event) =>
    callback((event as CustomEvent<{ paused: boolean }>).detail.paused);
  document.addEventListener(EVENT, handler);
  return () => document.removeEventListener(EVENT, handler);
}
