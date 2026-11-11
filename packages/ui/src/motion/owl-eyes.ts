/**
 * «Der Blick»: Die Pupillen der Eule (OwlLive.astro) folgen dem Zeiger. Auf Geräten ohne Zeiger
 * schaut sie dem Scrollen nach. Bei reduzierter Bewegung bleibt sie still.
 */
import { motionAllowed } from './reduced.ts';

/** Rahmen der Zeichnung, Mitte zwischen den Augen und grösster Ausschlag (Einheiten der viewBox) */
const VIEW = { x: 38, y: -30, width: 459.2 };
const CENTER = { x: 260, y: 285 };
const REACH = { x: 14, y: 9 };
/** So lange nach dem letzten Scrollen schaut sie noch in die Richtung, dann wieder geradeaus. */
const SETTLE_MS = 700;

export function initOwlEyes(owl: SVGSVGElement): void {
  const pupils = owl.querySelector<SVGGElement>('[data-owl-pupils]');
  if (!pupils || !motionAllowed()) return;

  let pointer: { x: number; y: number } | null = null;
  let drift = 0;
  let frame = 0;
  let visible = false;
  let settle = 0;

  const look = () => {
    frame = 0;
    let x = 0;
    let y = drift * REACH.y;
    if (pointer) {
      const box = owl.getBoundingClientRect();
      const scale = box.width / VIEW.width;
      const dx = pointer.x - (box.left + (CENTER.x - VIEW.x) * scale);
      const dy = pointer.y - (box.top + (CENTER.y - VIEW.y) * scale);
      const distance = Math.hypot(dx, dy) || 1;
      // Nah an der Eule kleine Ausschläge, ab gut einer Eulenbreite der volle.
      const pull = Math.min(1, distance / (box.width * 1.2 || 1));
      x = (dx / distance) * REACH.x * pull;
      y = (dy / distance) * REACH.y * pull;
    }
    pupils.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px)`;
  };
  const schedule = () => {
    if (visible && !frame) frame = requestAnimationFrame(look);
  };

  new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? false;
    schedule();
  }).observe(owl);

  window.addEventListener(
    'pointermove',
    (event) => {
      // Finger zählen nicht als Zeiger: Dort folgt der Blick dem Scrollen.
      if (event.pointerType === 'touch') return;
      pointer = { x: event.clientX, y: event.clientY };
      schedule();
    },
    { passive: true },
  );

  let lastY = window.scrollY;
  window.addEventListener(
    'scroll',
    () => {
      const y = window.scrollY;
      // Mit Zeiger verschiebt Scrollen nur die Eule unter dem Zeiger; ohne schaut sie hinterher.
      if (!pointer) {
        drift = Math.sign(y - lastY);
        window.clearTimeout(settle);
        settle = window.setTimeout(() => {
          drift = 0;
          schedule();
        }, SETTLE_MS);
      }
      lastY = y;
      schedule();
    },
    { passive: true },
  );
}
