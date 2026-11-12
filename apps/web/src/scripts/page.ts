/**
 * Einstieg der Unterseiten: Header mit Menü und der Schalter «Bewegung pausieren».
 * Kein Smooth Scroll, keine Scroll-Animationen.
 */
import { initTracking } from '@psyber/ui/lib/track';
import { initMotionToggle } from './chrome.ts';
import { initEggs } from './egg.ts';
import { initHeader } from './header.ts';

initHeader(() => null);
initEggs();
initTracking();

// Nur sinnvoll, wenn sich auf der Seite etwas dauerhaft bewegt (der Cursor im Footer).
initMotionToggle(document.querySelector('.footer-cursor') !== null);

// Styleguide: Die Eule aus Ebenen schaut dem Zeiger nach.
const owl = document.querySelector<SVGSVGElement>('[data-owl]');
if (owl) {
  void import('@psyber/ui/motion/owl-eyes').then((module) => module.initOwlEyes(owl));
}
