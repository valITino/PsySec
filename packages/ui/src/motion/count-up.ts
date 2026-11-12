import { onceInView } from './in-view.ts';
import { motionAllowed } from './reduced.ts';

/**
 * Zahl nach Schweizer Konvention: Dezimalkomma, Tausendertrennzeichen ’ (64’733 / 15,9).
 * Intl.NumberFormat('de-CH') liefert einen Dezimalpunkt und passt darum nicht.
 */
export function formatNumber(value: number, decimals = 0): string {
  const [int = '0', frac] = Math.abs(value).toFixed(decimals).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '’');
  return `${value < 0 ? '−' : ''}${grouped}${frac ? `,${frac}` : ''}`;
}

export interface CountUpOptions {
  to: number;
  from?: number;
  decimals?: number;
  /** Dauer in Millisekunden (Standard: 1200) */
  duration?: number;
  prefix?: string;
  suffix?: string;
}

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Zählt einmal hoch, sobald das Element sichtbar wird.
 * Der Endwert steht bereits im Markup; ohne JS oder bei reduzierter Bewegung bleibt er einfach stehen.
 */
export function countUp(element: HTMLElement, options: CountUpOptions): () => void {
  const { to, from = 0, decimals = 0, duration = 1200, prefix = '', suffix = '' } = options;
  const render = (value: number) => {
    element.textContent = `${prefix}${formatNumber(value, decimals)}${suffix}`;
  };

  if (!motionAllowed()) {
    render(to);
    return () => undefined;
  }

  // Breite des Endwerts reservieren, damit beim Zählen nichts springt
  const width = element.getBoundingClientRect().width;
  if (width > 0) {
    element.style.display = 'inline-block';
    element.style.minWidth = `${Math.ceil(width)}px`;
  }

  let frame = 0;
  const stopObserving = onceInView(
    element,
    () => {
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - start) / duration);
        render(from + (to - from) * easeOutCubic(progress));
        if (progress < 1) {
          frame = requestAnimationFrame(step);
        } else {
          render(to);
          element.style.minWidth = '';
        }
      };
      render(from);
      frame = requestAnimationFrame(step);
    },
    { threshold: 0.6 },
  );

  return () => {
    stopObserving();
    cancelAnimationFrame(frame);
    render(to);
  };
}
