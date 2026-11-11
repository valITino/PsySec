/**
 * Schwebende Bedienelemente: Fortschritt (Balken oben bzw. Schiene links) und der Schalter
 * «Bewegung pausieren».
 */
import { motionAllowed, motionPaused, setMotionPaused } from '@psyber/ui/motion';

/** Fortschritt der Seite: Balken (Mobile) und Schiene mit einer Marke je Sektion (Desktop). */
export function initProgress(): void {
  const bar = document.querySelector<HTMLElement>('[data-progress-bar]');
  const rail = document.querySelector<HTMLElement>('[data-rail]');
  const ticks = rail?.querySelector<HTMLElement>('[data-rail-ticks]');
  const dot = rail?.querySelector<HTMLElement>('[data-rail-dot]');
  if (!bar && !rail) return;

  const sections = [...document.querySelectorAll<HTMLElement>('main > section')];
  let range = 1;

  const measure = () => {
    range = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    if (!ticks) return;
    ticks.replaceChildren(
      ...sections.map((section) => {
        const tick = document.createElement('i');
        const top = section.getBoundingClientRect().top + window.scrollY;
        tick.style.top = `${(Math.min(1, top / range) * 100).toFixed(2)}%`;
        return tick;
      }),
    );
  };

  let ticking = false;
  const update = () => {
    ticking = false;
    const progress = Math.max(0, Math.min(1, window.scrollY / range));
    bar?.style.setProperty('--progress', progress.toFixed(4));
    if (rail && dot)
      dot.style.setProperty('--rail-y', `${(progress * rail.offsetHeight).toFixed(1)}px`);
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
  const refresh = () => {
    measure();
    update();
  };
  window.addEventListener('resize', refresh, { passive: true });
  window.addEventListener('load', refresh, { once: true });
  // Die Höhe der Seite ändert sich, wenn Schrift und Animationen bereit sind.
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(refresh).observe(document.body);
  refresh();
}

/** Schalter «Bewegung pausieren»: nur sichtbar, wenn sich auf der Seite etwas dauerhaft bewegt. */
export function initMotionToggle(hasMotion: boolean): void {
  const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
  const label = toggle?.querySelector<HTMLElement>('[data-motion-label]');
  if (!toggle || !label || !hasMotion || !motionAllowed()) return;
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const paused = !motionPaused();
    setMotionPaused(paused);
    label.textContent = paused ? 'Bewegung fortsetzen' : 'Bewegung pausieren';
  });
}
