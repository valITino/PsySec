/**
 * Einstieg der Unterseiten: Header mit Menü und der Schalter «Bewegung pausieren».
 * Kein Smooth Scroll, keine Scroll-Animationen.
 */
import { initMotionToggle } from './chrome.ts';
import { initEggs } from './egg.ts';
import { initHeader } from './header.ts';

initHeader(() => null);
initEggs();

// Nur sinnvoll, wenn sich auf der Seite etwas dauerhaft bewegt (der Cursor im Footer).
initMotionToggle(document.querySelector('.footer-cursor') !== null);
