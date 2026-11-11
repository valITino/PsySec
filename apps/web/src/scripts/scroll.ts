/**
 * Smooth Scroll (Lenis) und scroll-gesteuerte Animationen (GSAP ScrollTrigger, SplitText).
 * Wird nach dem ersten Eindruck nachgeladen. Bei reduzierter Bewegung bleibt alles statisch;
 * `initSmoothScroll()` liefert dann nur eine dünne Hülle um das native Scrollen.
 */
import { motionAllowed } from '@psyber/ui/motion';
import { initSmoothScroll, ScrollTrigger, type SmoothScroll } from '@psyber/ui/motion/smooth';
import { initDrehbuch } from './drehbuch.ts';
import { initHaltung } from './haltung.ts';

export function initScroll(): SmoothScroll {
  const smooth = initSmoothScroll();
  if (!motionAllowed()) return smooth;

  const drehbuch = document.querySelector<HTMLElement>('[data-drehbuch]');
  if (drehbuch) initDrehbuch(drehbuch);

  const haltung = document.querySelector<HTMLElement>('[data-haltung]');
  if (haltung) initHaltung(haltung);

  // Schrift und spät geladene Inhalte verschieben Positionen: danach neu vermessen.
  void document.fonts.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });

  return smooth;
}
