/**
 * Smooth Scroll (Lenis) und scroll-gesteuerte Animationen (GSAP ScrollTrigger, SplitText).
 * Wird beim ersten Lebenszeichen der Besucherin oder des Besuchers nachgeladen (siehe home.ts).
 * Bei reduzierter Bewegung bleibt alles statisch.
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

/**
 * Was gerade im Bild ist, bleibt im Bild. Wird die Bühne im Drehbuch angepinnt, wächst die Seite
 * an dieser Stelle um fast zwei Bildschirmhöhen. Wer schon weiter unten steht (Direktlink wie
 * /#kontakt, neu geladene Seite, früher Klick auf einen Menüpunkt), sähe sonst plötzlich einen
 * anderen Abschnitt. Darum merken, welcher Abschnitt in der Bildmitte steht, und nach der Änderung
 * wieder genau dorthin scrollen. (Die Bildmitte, nicht der obere Rand: Dort ragt oft noch das
 * Ende des Abschnitts davor herein, und genau der kann es sein, der wächst.)
 */
function keepInView(smooth: SmoothScroll, change: () => void): void {
  // Ganz oben verschiebt sich nichts Sichtbares: ohne Messung weiter.
  if (window.scrollY < 1) {
    change();
    return;
  }
  const middle = window.innerHeight / 2;
  const anchor = [...document.querySelectorAll<HTMLElement>('main > *, body > footer')].find(
    (element) => element.getBoundingClientRect().bottom > middle,
  );
  const before = anchor?.getBoundingClientRect().top ?? 0;
  change();
  if (!anchor) return;
  const shift = anchor.getBoundingClientRect().top - before;
  if (Math.abs(shift) < 1) return;
  if (smooth.lenis) {
    // Lenis kennt die neue Seitenlänge noch nicht und würde das Ziel sonst kappen.
    smooth.lenis.resize();
    smooth.lenis.scrollTo(smooth.lenis.animatedScroll + shift, { immediate: true, force: true });
  } else {
    window.scrollTo({ top: window.scrollY + shift, behavior: 'instant' });
  }
}

/** @param onReady läuft, sobald Smooth Scroll und Scroll-Animationen eingerichtet sind */
export function initScroll(onReady?: () => void): SmoothScroll {
  const smooth = initSmoothScroll();
  // Bei reduzierter Bewegung lädt home.ts dieses Modul gar nicht; zur Sicherheit trotzdem prüfen.
  if (!motionAllowed()) {
    markReady();
    onReady?.();
    return smooth;
  }

  // Schritt für Schritt (je ein eigener Task), damit der Browser dazwischen reagieren kann.
  // Die Reihenfolge folgt der Seite: ScrollTrigger rechnet angepinnte Strecken von oben nach unten.
  const steps = [
    () => {
      const drehbuch = document.querySelector<HTMLElement>('[data-drehbuch]');
      if (drehbuch) keepInView(smooth, () => initDrehbuch(drehbuch));
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
        keepInView(smooth, () => ScrollTrigger.refresh());
        markReady();
        onReady?.();
      });
      if (document.readyState !== 'complete') {
        window.addEventListener('load', () => keepInView(smooth, () => ScrollTrigger.refresh()), {
          once: true,
        });
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
