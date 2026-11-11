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
  scrollTo(target: string | number | HTMLElement, options?: { immediate?: boolean }): void;
  /** Scrollen sperren, z. B. solange ein Vollbild-Overlay offen ist */
  stop(): void;
  start(): void;
  destroy(): void;
}

export interface SmoothScrollOptions {
  /** Höhe des Sticky-Headers in Pixeln; Ankerziele landen entsprechend tiefer */
  headerOffset?: number;
}

/**
 * Lenis-Smooth-Scroll (lerp 0.1), synchron zu ScrollTrigger.
 * Bei `prefers-reduced-motion` wird Lenis gar nicht erst gestartet.
 */
export function initSmoothScroll(options: SmoothScrollOptions = {}): SmoothScroll {
  const offset = -(options.headerOffset ?? 0);
  const root = document.documentElement;

  if (!motionAllowed()) {
    return {
      lenis: null,
      scrollTo(target) {
        if (typeof target === 'number') {
          window.scrollTo({ top: target, behavior: 'auto' });
          return;
        }
        const element = typeof target === 'string' ? document.querySelector(target) : target;
        element?.scrollIntoView({ behavior: 'auto', block: 'start' });
      },
      stop() {
        root.classList.add('scroll-locked');
      },
      start() {
        root.classList.remove('scroll-locked');
      },
      destroy() {
        root.classList.remove('scroll-locked');
      },
    };
  }

  const lenis = new Lenis({
    lerp: 0.1,
    autoRaf: false,
    anchors: { offset },
    stopInertiaOnNavigate: true,
  });

  lenis.on('scroll', ScrollTrigger.update);
  const tick = (time: number) => lenis.raf(time * 1000);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);

  return {
    lenis,
    scrollTo(target, scrollOptions) {
      lenis.scrollTo(target, { offset, immediate: scrollOptions?.immediate ?? false });
    },
    stop() {
      lenis.stop();
      root.classList.add('scroll-locked');
    },
    start() {
      root.classList.remove('scroll-locked');
      lenis.start();
    },
    destroy() {
      gsap.ticker.remove(tick);
      lenis.destroy();
      root.classList.remove('scroll-locked');
    },
  };
}
