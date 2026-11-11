import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { motionAllowed } from './reduced.ts';

gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Motion-Tokens für GSAP (Sekunden) */
export const DUR = { d1: 0.15, d2: 0.25, d3: 0.4, d4: 0.8 } as const;
export const EASE = 'power3.out';

export interface SmoothScroll {
  /** Lenis-Instanz; `null` bei reduzierter Bewegung (dann scrollt der Browser nativ) */
  readonly lenis: Lenis | null;
  /** Scrollen sperren, z. B. solange ein Vollbild-Overlay offen ist */
  stop(): void;
  start(): void;
}

/** Klasse am <html>, solange ein Vollbild-Overlay (Menü, Terminal) die Seite sperrt */
const LOCKED = 'scroll-locked';

/**
 * Lenis-Smooth-Scroll (lerp 0.1), synchron zu ScrollTrigger.
 * Bei `prefers-reduced-motion` wird Lenis gar nicht erst gestartet.
 *
 * Der Abstand für den festen Header kommt aus CSS (`scroll-padding-top` am <html>);
 * Lenis und der Browser werten denselben Wert aus.
 *
 * Overlays mit eigenem Scrollen (Menü, Terminal) tragen `data-lenis-prevent`: Ein gestopptes
 * Lenis schluckt sonst jedes Rad- und Wischereignis, und das Overlay liesse sich nicht scrollen.
 */
export function initSmoothScroll(): SmoothScroll {
  const root = document.documentElement;

  if (!motionAllowed()) {
    return {
      lenis: null,
      stop: () => root.classList.add(LOCKED),
      start: () => root.classList.remove(LOCKED),
    };
  }

  const lenis = new Lenis({
    lerp: 0.1,
    autoRaf: false,
    anchors: true,
    stopInertiaOnNavigate: true,
  });
  // Ist schon ein Overlay offen (jemand war schneller als das Nachladen), bleibt die Seite stehen.
  if (root.classList.contains(LOCKED)) lenis.stop();

  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    stop() {
      lenis.stop();
      root.classList.add(LOCKED);
    },
    start() {
      root.classList.remove(LOCKED);
      lenis.start();
    },
  };
}
