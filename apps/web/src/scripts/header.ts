/**
 * Header: Hintergrund nach 40 px Scroll, mobiles Vollbild-Menü mit Fokusfalle.
 */
export interface ScrollLock {
  stop(): void;
  start(): void;
}

export function initHeader(lock: () => ScrollLock | null): void {
  const header = document.querySelector<HTMLElement>('[data-header]');
  if (!header) return;

  // --- Hintergrund nach 40 px ---
  let ticking = false;
  const update = () => {
    ticking = false;
    header.classList.toggle('is-scrolled', window.scrollY > 40);
  };
  window.addEventListener(
    'scroll',
    () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    },
    { passive: true },
  );
  update();

  // --- Mobiles Menü ---
  const toggle = header.querySelector<HTMLButtonElement>('[data-menu-toggle]');
  const menu = header.querySelector<HTMLElement>('[data-menu]');
  const label = header.querySelector<HTMLElement>('[data-menu-label]');
  if (!toggle || !menu || !label) return;

  const outside = () => [
    ...document.querySelectorAll<HTMLElement>('main, footer, .skip-link, [data-preview-note]'),
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

  // Wechsel auf Desktop-Breite: Menü schliessen.
  window.matchMedia('(min-width: 64rem)').addEventListener('change', (event) => {
    if (event.matches) setOpen(false, false);
  });
}
