/**
 * Smooth Scroll (Lenis) und scroll-gesteuerte Animationen (GSAP ScrollTrigger, SplitText).
 * Wird nach dem ersten Eindruck nachgeladen. Bei reduzierter Bewegung bleibt alles statisch;
 * `initSmoothScroll()` liefert dann nur eine dünne Hülle um das native Scrollen.
 */
import { motionAllowed } from '@psyber/ui/motion';
import { initSmoothScroll, ScrollTrigger, type SmoothScroll } from '@psyber/ui/motion/smooth';
import { initDrehbuch } from './drehbuch.ts';
import { initHaltung } from './haltung.ts';
import { initReveals } from './reveal.ts';

/** Marke für Tests: Smooth Scroll und Scroll-Animationen sind eingerichtet, die Höhe steht. */
const markReady = () => {
  document.documentElement.dataset.scroll = 'ready';
};

export function initScroll(): SmoothScroll {
  const smooth = initSmoothScroll();
  if (!motionAllowed()) {
    markReady();
    return smooth;
  }

  // Schritt für Schritt (je ein eigener Task), damit der Browser dazwischen reagieren kann.
  // Die Reihenfolge folgt der Seite: ScrollTrigger rechnet angepinnte Strecken von oben nach unten.
  const steps = [
    () => {
      const drehbuch = document.querySelector<HTMLElement>('[data-drehbuch]');
      if (drehbuch) initDrehbuch(drehbuch);
    },
    () => {
      const haltung = document.querySelector<HTMLElement>('[data-haltung]');
      if (haltung) initHaltung(haltung);
    },
    () => {
      // Schrift und spät geladene Inhalte verschieben Positionen: danach neu vermessen.
      // Die Überschriften werden erst mit der richtigen Schrift in Zeilen geteilt.
      void document.fonts.ready.then(() => {
        initReveals();
        ScrollTrigger.refresh();
        markReady();
      });
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => ScrollTrigger.refresh(), { once: true });
      }
    },
  ];
  const run = () => {
    const step = steps.shift();
    if (!step) return;
    step();
    setTimeout(run, 0);
  };
  setTimeout(run, 0);

  return smooth;
}
