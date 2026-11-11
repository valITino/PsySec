/**
 * Einstieg der Startseite.
 * Zuerst das Nötige für den ersten Eindruck (Header, Klick-Simulator, Psi-Netz),
 * danach in Ruhe Smooth Scroll und die Scroll-Animationen (GSAP, Lenis).
 * Das Kontaktformular lädt erst, wenn es in Sicht kommt.
 */
import {
  countUp,
  initPsiNet,
  motionAllowed,
  motionPaused,
  onceInView,
  setMotionPaused,
} from '@psyber/ui/motion';
import type { SmoothScroll } from '@psyber/ui/motion/smooth';
import { initChat } from './chat.ts';
import { initFirstStep } from './first-step.ts';
import { initHeader } from './header.ts';
import { initSimulator } from './simulator.ts';
import { initStairs } from './stairs.ts';

let smooth: SmoothScroll | null = null;

initHeader(() => smooth);

const simulator = document.querySelector<HTMLElement>('[data-sim]');
if (simulator) initSimulator(simulator);

initPsiNet();

// --- 3. Zahlen zählen einmal hoch ---
document.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
  countUp(element, {
    to: Number(element.dataset.count),
    decimals: Number(element.dataset.decimals ?? 0),
    suffix: element.dataset.suffix ?? '',
  });
});

// --- 4. Ticker: Pause-Button ---
const ticker = document.querySelector<HTMLElement>('[data-ticker]');
const tickerToggle = ticker?.querySelector<HTMLButtonElement>('[data-ticker-toggle]');
const tickerLabel = ticker?.querySelector<HTMLElement>('[data-ticker-label]');
if (ticker && tickerToggle && tickerLabel) {
  tickerToggle.addEventListener('click', () => {
    const paused = ticker.classList.toggle('is-paused');
    tickerToggle.setAttribute('aria-pressed', String(paused));
    tickerLabel.textContent = paused ? 'Band fortsetzen' : 'Band anhalten';
  });
}

// --- 6. Treppe, 7. Chat ---
const stairs = document.querySelector<HTMLElement>('[data-stairs]');
if (stairs) initStairs(stairs);

const chat = document.querySelector<HTMLElement>('[data-chat]');
if (chat) initChat(chat);

// --- Der erste Schritt ---
const firstStep = document.querySelector<HTMLFormElement>('[data-first-step]');
if (firstStep) initFirstStep(firstStep);

// --- Schalter «Bewegung pausieren» im Footer (nur sinnvoll, wenn sich etwas bewegt) ---
const motionToggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
const motionLabel = motionToggle?.querySelector<HTMLElement>('[data-motion-label]');
if (motionToggle && motionLabel && motionAllowed()) {
  motionToggle.hidden = false;
  motionToggle.addEventListener('click', () => {
    const paused = !motionPaused();
    setMotionPaused(paused);
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionLabel.textContent = paused ? 'Bewegung fortsetzen' : 'Bewegung pausieren';
  });
}

// --- Kontaktformular: erst laden, wenn es in Sicht kommt ---
const contact = document.querySelector<HTMLFormElement>('[data-contact]');
if (contact) {
  onceInView(
    contact,
    () => {
      void import('./contact.ts').then((module) => module.initContact(contact));
    },
    { rootMargin: '800px 0px' },
  );
}

// --- Smooth Scroll und Scroll-Animationen nach dem ersten Eindruck ---
const idle = (callback: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: 1200 });
  else setTimeout(callback, 200);
};

idle(() => {
  void import('./scroll.ts').then((module) => {
    smooth = module.initScroll();
  });
});
