/**
 * Hero: Globus, Uhrzeit in Zürich und der Scroll-Verlauf.
 *
 * Auf grossen Bildschirmen bleibt der Hero kurz stehen (CSS: sticky). Auf dieser Strecke
 * tritt die erste Frage zurück, und die Knoten auf dem Globus werden «gepatcht». Auf kleinen
 * Bildschirmen und bei reduzierter Bewegung scrollt der Hero normal; der Patch-Stand folgt
 * dann einfach dem Scrollen. Alles hier ist Dekoration: Die Inhalte stehen im Markup.
 */
import { motionAllowed } from '@psyber/ui/motion';
import { startClock } from './clock.ts';
import { initGlobe } from './globe.ts';

export function initHero(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-hero-track]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-globe]');
  const readout = root.querySelector<HTMLElement>('[data-hero-patch]');
  const globe = canvas ? initGlobe(canvas) : null;

  startClock(root.querySelector<HTMLElement>('[data-zurich-time]'));
  if (!track) return;

  const pin = window.matchMedia('(min-width: 64rem) and (min-height: 40rem)');
  const applyPin = () => {
    if (motionAllowed() && pin.matches) root.dataset.pinned = '';
    else delete root.dataset.pinned;
  };
  applyPin();
  pin.addEventListener('change', () => {
    applyPin();
    update();
  });

  let ticking = false;
  let shown = -1;
  const update = () => {
    ticking = false;
    const rect = track.getBoundingClientRect();
    if (rect.bottom < 0) return;
    // Angepinnt: die Strecke, auf der der Hero steht. Sonst: gut die halbe Höhe des Heros.
    const range = 'pinned' in root.dataset ? rect.height - window.innerHeight : rect.height * 0.6;
    const progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, range)));
    root.style.setProperty('--hero-p', progress.toFixed(3));
    globe?.setProgress(progress);
    const percent = Math.round(12 + 88 * progress);
    if (readout && percent !== shown) {
      shown = percent;
      readout.textContent = `${String(percent).padStart(3, '0')} %`;
    }
  };

  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  window.addEventListener('resize', update, { passive: true });
  update();
}
