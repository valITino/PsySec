/**
 * Klick-Simulator (Bühne direkt unter dem Hero).
 * Die Zeitleiste (0–100) schaltet Zustände über Klassen; die Übergänge selbst macht CSS.
 * Autoplay einmal, sobald das Widget sichtbar ist (nicht bei reduzierter Bewegung).
 */
import { motionAllowed, onceInView } from '@psyber/ui/motion';
import { startClock } from './clock.ts';

/** Ab welchem Wert der Zeitleiste welcher Zustand gilt */
const STEPS = [
  ['zeit', 10],
  ['adresse', 22],
  ['betrag', 34],
  ['verdict', 44],
  ['tap', 56],
  ['press', 62],
  ['browser', 68],
  ['error', 74],
  ['note', 82],
  ['small', 91],
] as const;

const STATION_1_END = 48;
const STATION_2_START = 50;

function valueText(value: number): string {
  if (value < STATION_2_START) {
    const signals = STEPS.slice(0, 3).filter(([, at]) => value >= at).length;
    const detail =
      value >= 44
        ? '3 Warnsignale erkannt. Nicht klicken.'
        : signals === 0
          ? 'Noch kein Warnsignal markiert.'
          : `${signals} von 3 Warnsignalen markiert.`;
    return `Schritt 1 von 2: Psychologie, vor dem Klick. ${detail}`;
  }
  const detail =
    value >= 68
      ? 'Diese Seite ist nicht erreichbar: blockiert vom DNS-Filter.'
      : 'Ein Finger tippt trotzdem.';
  return `Schritt 2 von 2: Technik, nach dem Klick. ${detail}`;
}

export function initSimulator(root: HTMLElement): void {
  const range = root.querySelector<HTMLInputElement>('[data-sim-range]');
  if (!range) return;
  const buttons = [...root.querySelectorAll<HTMLButtonElement>('[data-sim-step]')];
  const stations = [...root.querySelectorAll<HTMLElement>('[data-sim-station]')];
  const animate = motionAllowed();

  let value = 0;
  let frame = 0;
  let timer = 0;

  const render = (next: number) => {
    value = Math.max(0, Math.min(100, next));
    const rounded = Math.round(value);
    if (range.value !== String(rounded)) range.value = String(rounded);
    range.style.setProperty('--sim-fill', `${value}%`);
    for (const [key, at] of STEPS) root.classList.toggle(`is-${key}`, value >= at);
    const station = value >= STATION_2_START ? 2 : 1;
    for (const button of buttons) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.simStep) === station));
    }
    for (const item of stations) {
      item.classList.toggle('is-active', Number(item.dataset.simStation) === station);
    }
    range.setAttribute('aria-valuetext', valueText(value));
  };

  const stop = () => {
    cancelAnimationFrame(frame);
    window.clearTimeout(timer);
    frame = 0;
  };

  /** Fährt die Zeitleiste gleichmässig zum Ziel; `done` läuft nur, wenn niemand unterbricht. */
  const tweenTo = (target: number, duration: number, done?: () => void) => {
    stop();
    if (!animate || duration <= 0) {
      render(target);
      done?.();
      return;
    }
    const from = value;
    const start = performance.now();
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration);
      render(from + (target - from) * progress);
      if (progress < 1) {
        frame = requestAnimationFrame(step);
      } else {
        frame = 0;
        done?.();
      }
    };
    frame = requestAnimationFrame(step);
  };

  // Ab hier steuert die Person: jede Eingabe beendet das Autoplay.
  range.addEventListener('input', () => {
    stop();
    render(Number(range.value));
  });
  range.addEventListener('pointerdown', stop);
  range.addEventListener('keydown', stop);

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const target = button.dataset.simStep === '2' ? 100 : STATION_1_END;
      tweenTo(target, Math.abs(target - value) * 40);
    });
  }

  startClock(root.querySelector<HTMLElement>('[data-sim-time]'));

  if (!animate) {
    // Statisch: Schritt 1 vollständig; die Buttons wechseln ohne Animation.
    render(STATION_1_END);
    root.dataset.ready = '';
    return;
  }

  render(0);
  root.dataset.ready = '';

  // Autoplay einmal: Schritt 1, kurze Pause, Schritt 2.
  onceInView(
    root,
    () => {
      timer = window.setTimeout(() => {
        tweenTo(STATION_1_END, 4600, () => {
          timer = window.setTimeout(() => tweenTo(100, 5200), 1500);
        });
      }, 700);
    },
    { threshold: 0.55 },
  );
}
