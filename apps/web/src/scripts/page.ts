/**
 * Einstieg der Unterseiten: Header mit Menü und der Schalter «Bewegung pausieren».
 * Kein Smooth Scroll, keine Scroll-Animationen.
 */
import { initPsiNet } from '@psyber/ui/motion';
import { initMotionToggle } from './chrome.ts';
import { initEggs } from './egg.ts';
import { initHeader } from './header.ts';

initHeader(() => null);
initEggs();
initPsiNet();

// Nur sinnvoll, wenn sich auf der Seite etwas dauerhaft bewegt.
initMotionToggle(document.querySelector('.psi-net.is-animated') !== null);
