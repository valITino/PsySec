/**
 * Einstieg der Startseite.
 * Zuerst das Nötige für den ersten Eindruck (Header, Hero mit Globus, Klick-Simulator),
 * danach in Ruhe Smooth Scroll und die Scroll-Animationen (GSAP, Lenis).
 * Das Kontaktformular lädt erst, wenn es in Sicht kommt.
 */
import { countUp, initPsiNet, onceInView } from '@psyber/ui/motion';
import type { SmoothScroll } from '@psyber/ui/motion/smooth';
import { initChat } from './chat.ts';
import { initMotionToggle, initProgress } from './chrome.ts';
import { initEggs } from './egg.ts';
import { initFirstStep } from './first-step.ts';
import { initHeader } from './header.ts';
import { initHero } from './hero.ts';
import { initSimulator } from './simulator.ts';
import { initStairs } from './stairs.ts';

let smooth: SmoothScroll | null = null;

/** Später, wenn der Browser Luft hat: hält die Arbeit beim Start in kleinen Portionen. */
const idle = (callback: () => void) => {
  if ('requestIdleCallback' in window) window.requestIdleCallback(callback, { timeout: 1200 });
  else setTimeout(callback, 200);
};

// ---------------------------------------------------------------- Sofort: der erste Eindruck

initHeader(() => smooth);

const hero = document.querySelector<HTMLElement>('[data-hero]');
if (hero) initHero(hero);

const simulator = document.querySelector<HTMLElement>('[data-sim]');
if (simulator) initSimulator(simulator);

// --- 6. Treppe, 7. Chat (setzen ihren Startzustand, bevor sie ins Bild kommen) ---
const stairs = document.querySelector<HTMLElement>('[data-stairs]');
if (stairs) initStairs(stairs);

const chat = document.querySelector<HTMLElement>('[data-chat]');
if (chat) initChat(chat);

// --- Der erste Schritt ---
const firstStep = document.querySelector<HTMLFormElement>('[data-first-step]');
if (firstStep) initFirstStep(firstStep);

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

// ---------------------------------------------------------------- Gleich danach: Beiwerk

// Jedes Stück in einem eigenen ruhigen Moment, damit keines den Browser lange aufhält.
idle(() => {
  initEggs(() => smooth);
  initPsiNet();
  initMotionToggle(true);
});

// --- 3. Zahlen zählen einmal hoch ---
idle(() => {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((element) => {
    countUp(element, {
      to: Number(element.dataset.count),
      decimals: Number(element.dataset.decimals ?? 0),
      suffix: element.dataset.suffix ?? '',
    });
  });
});

// --- 4. Ticker: Pause-Button ---
idle(() => {
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
});

// --- Fortschritt am Rand ---
idle(initProgress);

// ---------------------------------------------------------------- Der Rest der Seite

/*
 * Die Teile weit unter dem ersten Bildschirm hat der Browser übersprungen (global.css, data-lazy).
 * Sie werden nachgeholt, sobald jemand die Seite benutzt: der Reihe nach in ruhigen Momenten.
 * Vor einem Sprung zu einer Marke (Link, Adresse mit #, wiederhergestellte Position) sofort alle,
 * damit das Ziel genau stimmt.
 */
const lazy = [...document.querySelectorAll<HTMLElement>('[data-lazy]')];
let catchingUp = false;

const layOutNow = () => {
  if (lazy.length === 0) return;
  for (const element of lazy.splice(0)) element.dataset.laid = '';
  // Das sanfte Scrollen kennt die Seitenlänge nur von früher: sofort neu vermessen,
  // sonst endet der Sprung an der alten, zu kurzen Grenze.
  smooth?.lenis?.resize();
};

const layOutSoon = () => {
  if (catchingUp) return;
  catchingUp = true;
  const step = () => {
    const element = lazy.shift();
    if (!element) return;
    element.dataset.laid = '';
    // Layout gleich hier auslösen, damit jeder Teil seine eigene kleine Portion bleibt.
    void element.offsetHeight;
    idle(step);
  };
  idle(step);
};

if (window.location.hash || window.scrollY > 0) {
  layOutNow();
} else {
  for (const type of ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(type, layOutSoon, { once: true, passive: true });
  }
  // Wer nur liest, ohne etwas zu tun: nach einer Weile trotzdem.
  setTimeout(layOutSoon, 12_000);
}

// Sprung innerhalb der Seite: vor dem Scrollen alles berechnen (läuft vor dem sanften Scrollen).
document.addEventListener(
  'click',
  (event) => {
    if (lazy.length === 0 || !(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>('a[href*="#"]');
    if (link && link.pathname === window.location.pathname && link.hash.length > 1) layOutNow();
  },
  true,
);
window.addEventListener('hashchange', layOutNow);

// ---------------------------------------------------------------- Zuletzt: Smooth Scroll und Scroll-Animationen

idle(() => {
  void import('./scroll.ts').then((module) => {
    smooth = module.initScroll();
  });
});
