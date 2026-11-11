/**
 * Hero: Globus, Schweizer Uhrzeit und der Scroll-Verlauf.
 *
 * Auf grossen Bildschirmen bleibt der Hero kurz stehen (CSS: sticky). Auf dieser Strecke
 * tritt die erste Frage zurück, und die Knoten auf dem Globus werden «gepatcht». Auf kleinen
 * Bildschirmen scrollt der Hero normal; der Patch-Stand folgt dann einfach dem Scrollen.
 * Bei reduzierter Bewegung hängt nichts am Scrollen: Der Globus zeigt von Anfang an den
 * Endzustand. Alles hier ist Dekoration: Die Inhalte stehen im Markup.
 */
import { motionAllowed } from '@psyber/ui/motion';
import { startClock } from './clock.ts';
import { initGlobe, type Globe } from './globe.ts';

export function initHero(root: HTMLElement): void {
  const track = root.querySelector<HTMLElement>('[data-hero-track]');
  const canvas = root.querySelector<HTMLCanvasElement>('[data-globe]');
  const readout = root.querySelector<HTMLElement>('[data-hero-patch]');
  let globe: Globe | null = null;
  // Reduzierte Bewegung: gleich der Endzustand, alles gepatcht.
  let progress = motionAllowed() ? 0 : 1;

  // Der Globus ist Dekoration: Er entsteht in einem eigenen, ruhigen Moment nach dem Start.
  if (canvas) {
    const create = () => {
      globe = initGlobe(canvas);
      globe.setProgress(progress);
    };
    if ('requestIdleCallback' in window) window.requestIdleCallback(create, { timeout: 1000 });
    else setTimeout(create, 100);
  }

  startClock(root.querySelector<HTMLElement>('[data-swiss-time]'));
  if (!motionAllowed()) {
    if (readout) readout.textContent = '100 %';
    return;
  }
  if (!track) return;

  const pin = window.matchMedia('(min-width: 64rem) and (min-height: 40rem)');
  const applyPin = () => {
    if (pin.matches) root.dataset.pinned = '';
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
    progress = Math.max(0, Math.min(1, -rect.top / Math.max(1, range)));
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
