/**
 * Einstieg der Startseite.
 * Zuerst das Nötige für den ersten Eindruck (Header, Hero mit Globus, Klick-Simulator),
 * danach in Ruhe das Beiwerk. Smooth Scroll und die Scroll-Animationen (GSAP, Lenis) laden
 * erst, wenn jemand die Seite benutzt.
 * Das Kontaktformular lädt erst, wenn es in Sicht kommt.
 */
import { countUp, motionAllowed, onceInView } from '@psyber/ui/motion';
import type { SmoothScroll } from '@psyber/ui/motion/smooth';
import { initChat } from './chat.ts';
import { initMotionToggle, initProgress } from './chrome.ts';
import { initEggs } from './egg.ts';
import { initFirstStep } from './first-step.ts';
import { initHeader } from './header.ts';
import { initHero } from './hero.ts';
import { rememberView, scrollTopFor, storedView } from './position.ts';
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

// --- Die Eule in «Über» schaut dem Zeiger nach: erst laden, wenn sie in Sicht kommt ---
const owl = document.querySelector<SVGSVGElement>('[data-owl]');
if (owl && motionAllowed()) {
  onceInView(
    owl,
    () => {
      void import('@psyber/ui/motion/owl-eyes').then((module) => module.initOwlEyes(owl));
    },
    { rootMargin: '400px 0px' },
  );
}

// ---------------------------------------------------------------- Gleich danach: Beiwerk

// Jedes Stück in einem eigenen ruhigen Moment, damit keines den Browser lange aufhält.
idle(() => {
  initEggs(() => smooth);
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

/*
 * Ein Teil gilt zuerst als «neu» ausgelegt: Solange blendet darin nichts über (global.css).
 * Zwei Bilder später ist er fertig; einer pro Bild, damit auch das in kleinen Portionen bleibt.
 */
const fresh: HTMLElement[] = [];
let settling = false;
const settle = () => {
  const element = fresh.shift();
  if (!element) {
    settling = false;
    return;
  }
  element.dataset.laid = '';
  requestAnimationFrame(settle);
};
const layOut = (element: HTMLElement) => {
  element.dataset.laid = 'new';
  fresh.push(element);
  if (settling) return;
  settling = true;
  requestAnimationFrame(() => requestAnimationFrame(settle));
};

const layOutNow = () => {
  if (lazy.length === 0) return;
  for (const element of lazy.splice(0)) layOut(element);
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
    layOut(element);
    // Layout gleich hier auslösen, damit jeder Teil seine eigene kleine Portion bleibt.
    void element.offsetHeight;
    idle(step);
  };
  idle(step);
};

/*
 * Neu geladen oder über den Verlauf geöffnet: die gemerkte Ansicht wiederherstellen (position.ts).
 * Angesteuert wird sie mehrmals, denn dazwischen kann der Browser seine eigene, ungenaue
 * Wiederherstellung einschieben, und die Seite wächst noch (Anpinnen im Drehbuch). Sobald jemand
 * selbst scrollt, ist Schluss.
 */
const view = storedView();
let restoring = view !== null;
const restoreView = () => {
  if (!restoring || !view) return;
  const top = scrollTopFor(view);
  if (top === null || Math.abs(top - window.scrollY) < 1) return;
  if (smooth?.lenis) {
    smooth.lenis.resize();
    smooth.lenis.scrollTo(top, { immediate: true, force: true });
  } else {
    window.scrollTo({ top, behavior: 'instant' });
  }
};
if (view) {
  for (const type of ['wheel', 'touchstart', 'keydown', 'pointerdown']) {
    window.addEventListener(
      type,
      () => {
        restoring = false;
      },
      { once: true, passive: true },
    );
  }
}

if (window.location.hash || window.scrollY > 0 || view) {
  layOutNow();
  restoreView();
  if (view) {
    const again = () => {
      restoreView();
      requestAnimationFrame(restoreView);
      setTimeout(restoreView, 300);
    };
    if (document.readyState === 'complete') again();
    else window.addEventListener('load', again, { once: true });
  }
} else {
  for (const type of ['scroll', 'wheel', 'touchstart', 'pointerdown', 'keydown']) {
    window.addEventListener(type, layOutSoon, { once: true, passive: true });
  }
  // Wer nur liest, ohne etwas zu tun: nach einer Weile trotzdem.
  setTimeout(layOutSoon, 12_000);
}
// Ab jetzt die Ansicht merken (nur ein Zuhörer; gerechnet wird erst, wenn das Scrollen ruht).
rememberView();

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

/*
 * Lenis und GSAP braucht es erst, wenn jemand die Seite benutzt. Sie laden beim ersten
 * Lebenszeichen (Zeiger, Berührung, Taste, Scrollen), spätestens nach zwölf Sekunden. So bleibt
 * der Browser direkt nach dem Laden frei. Bei reduzierter Bewegung braucht es sie gar nicht:
 * Dann scrollt der Browser selbst, und nichts wird animiert.
 */
let scrollRequested = false;
const loadScroll = () => {
  if (scrollRequested) return;
  scrollRequested = true;
  if (!motionAllowed()) {
    document.documentElement.dataset.scroll = 'ready';
    return;
  }
  void import('./scroll.ts').then((module) => {
    // Sobald alles steht, die gemerkte Ansicht ein letztes Mal ansteuern.
    smooth = module.initScroll(() => {
      restoreView();
      restoring = false;
    });
  });
};

if (!motionAllowed() || window.location.hash || window.scrollY > 0 || view) {
  loadScroll();
} else {
  const wakeOn = (types: string[]) => {
    for (const type of types) {
      window.addEventListener(type, loadScroll, { once: true, passive: true });
    }
  };
  wakeOn(['pointerdown', 'touchstart', 'wheel', 'scroll', 'keydown']);
  // Zeigerbewegungen zählen erst eine Sekunde nach dem Laden: Steht der Zeiger schon über der
  // Seite, meldet der Browser beim Laden von sich aus eine Bewegung.
  const later = () => setTimeout(() => wakeOn(['pointermove']), 1000);
  if (document.readyState === 'complete') later();
  else window.addEventListener('load', later, { once: true });
  setTimeout(loadScroll, 12_000);
}
