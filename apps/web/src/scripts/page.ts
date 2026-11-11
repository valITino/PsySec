/**
 * Einstieg der Unterseiten: Header mit Menü und der Schalter «Bewegung pausieren».
 * Kein Smooth Scroll, keine Scroll-Animationen.
 */
import { initPsiNet, motionAllowed, motionPaused, setMotionPaused } from '@psyber/ui/motion';
import { initEggs } from './egg.ts';
import { initHeader } from './header.ts';

initHeader(() => null);
initEggs();
initPsiNet();

const toggle = document.querySelector<HTMLButtonElement>('[data-motion-toggle]');
const label = toggle?.querySelector<HTMLElement>('[data-motion-label]');
// Nur sinnvoll, wenn sich auf der Seite etwas dauerhaft bewegt.
if (toggle && label && motionAllowed() && document.querySelector('.psi-net.is-animated')) {
  toggle.hidden = false;
  toggle.addEventListener('click', () => {
    const paused = !motionPaused();
    setMotionPaused(paused);
    toggle.setAttribute('aria-pressed', String(paused));
    label.textContent = paused ? 'Bewegung fortsetzen' : 'Bewegung pausieren';
  });
}
