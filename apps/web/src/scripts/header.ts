/**
 * Header: oben volle Leiste, nach dem Scrollen eine schwebende Kapsel; dazu das Vollbild-Menü
 * mit Fokusfalle.
 */
import { motionAllowed } from '@psyber/ui/motion';

export interface ScrollLock {
  stop(): void;
  start(): void;
}

/** Ab hier wird die Leiste zur Kapsel, darunter wieder zur Leiste (Abstand gegen Flackern). */
const CAPSULE_ON = 96;
const CAPSULE_OFF = 40;
const MORPH_MS = 150;

export function initHeader(lock: () => ScrollLock | null): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  // --- Leiste oder Kapsel ---
  let scrolled = false;
  let ticking = false;
  let morph = 0;
  const update = (animate = true) => {
    ticking = false;
    const y = window.scrollY;
    const next = scrolled ? y > CAPSULE_OFF : y > CAPSULE_ON;
    if (next === scrolled) return;
    scrolled = next;
    window.clearTimeout(morph);
    if (!animate || !motionAllowed()) {
      header.classList.remove('is-morphing');
      header.classList.toggle('is-scrolled', scrolled);
      return;
    }
    // Kurz abtauchen, Form wechseln, wieder auftauchen.
    header.classList.add('is-morphing');
    morph = window.setTimeout(() => {
      header.classList.toggle('is-scrolled', scrolled);
      header.classList.remove('is-morphing');
    }, MORPH_MS);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(() => update());
      }
    },
    { passive: true },
  );
  update(false);

  // --- Vollbild-Menü ---
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = header.querySelector<HTMLElement>('[data-menu]');
  const label = header.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu || !label) return;

  const outside = () => [
    ...document.querySelectorAll<HTMLElement>(
      'main, footer, .skip-link, [data-preview-note], [data-chrome]',
    ),
  ];
  const focusables = () =>
    [...header.querySelectorAll<HTMLElement>('a[href], button:not([disabled])')].filter(
      (element) => element.offsetParent !== null,
    );

  let open = false;

  const setOpen = (next: boolean, restoreFocus = true) => {
    if (open === next) return;
    open = next;
    menu.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    label.textContent = open ? 'Schliessen' : 'Menü';
    header.classList.toggle('is-open', open);
    for (const element of outside()) element.inert = open;
    if (open) {
      lock()?.stop();
      document.documentElement.classList.add('scroll-locked');
      menu.scrollTop = 0;
      menu.querySelector<HTMLElement>('[data-menu-link]')?.focus({ preventScroll: true });
    } else {
      document.documentElement.classList.remove('scroll-locked');
      lock()?.start();
      if (restoreFocus) toggle.focus({ preventScroll: true });
    }
  };

  toggle.addEventListener('click', () => setOpen(!open));

  // Links im Menü schliessen es; der Sprung zum Anker passiert danach ganz normal.
  menu.addEventListener('click', (event) => {
    if ((event.target as HTMLElement).closest('[data-menu-link]')) setOpen(false, false);
  });

  document.addEventListener('keydown', (event) => {
    if (!open) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      setOpen(false);
      return;
    }
    if (event.key !== 'Tab') return;
    // Fokus bleibt im Menü: am Ende wieder von vorn.
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (!first || !last) return;
    const active = document.activeElement;
    if (event.shiftKey && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  });
}
