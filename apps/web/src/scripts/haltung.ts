/**
 * 0x05 Haltung: Wörter werden beim Scrollen von 25 % auf 100 % Deckkraft hell.
 *
 * Gedimmt sind die Wörter nur, solange der Satz durch den Bildschirm läuft. Davor und danach
 * (und ohne dieses Skript) steht der Text in voller Deckkraft: lesbar für alle, die per
 * Ankerlink, Suche oder Screenreader dort landen, und für jede Kontrastprüfung.
 *
 * Der Fortschritt kommt direkt aus der Lage des Satzes im Bildschirm (kein vorab berechneter
 * Auslöser): So stimmt er auch, wenn sich die Höhe der Seite oberhalb noch ändert.
 */
import { whileInView } from '@psyber/ui/motion';
import { gsap } from '@psyber/ui/motion/smooth';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

const DIM = 0.25;
/** Dauer eines Worts und Versatz zum nächsten (in Einheiten der Zeitleiste) */
const WORD = 0.5;
const STAGGER = 0.12;
/** Anteil der Strecke, auf dem der Satz noch ganz gedimmt bleibt (er kommt gerade ins Bild) */
const HOLD = 0.3;
/** Die Strecke endet, wenn der Satz auf dieser Höhe des Bildschirms steht (von oben) */
const END = 0.38;

export function initHaltung(root: HTMLElement): void {
  const statements = [...root.querySelectorAll<HTMLElement>('[data-reveal-words]')].map(
    (statement) => {
      // Für Screenreader bleibt der Satz am Stück; die einzelnen Wörter sind nur fürs Auge.
      const label = document.createElement('span');
      label.className = 'sr-only';
      label.textContent = (statement.textContent ?? '').trim();
      const visual = document.createElement('span');
      visual.setAttribute('aria-hidden', 'true');
      visual.append(...statement.childNodes);
      statement.replaceChildren(label, visual);

      const split = SplitText.create(visual, { type: 'words', wordsClass: 'word', aria: 'none' });
      const words = split.words as HTMLElement[];
      return { statement, words, total: WORD + STAGGER * (words.length - 1), last: -1 };
    },
  );

  /** progress 0 = der Satz erreicht den unteren Rand, 1 = er steht auf 38 % der Höhe */
  const update = () => {
    const height = window.innerHeight;
    for (const item of statements) {
      const top = item.statement.getBoundingClientRect().top;
      const progress = Math.max(0, Math.min(1, (height - top) / (height * (1 - END))));
      if (progress === item.last) continue;
      item.last = progress;
      const outside = progress <= 0 || progress >= 1;
      const time = Math.max(0, (progress - HOLD) / (1 - HOLD)) * item.total;
      item.words.forEach((word, index) => {
        if (outside) {
          word.style.opacity = '';
          return;
        }
        const local = Math.min(1, Math.max(0, (time - STAGGER * index) / WORD));
        word.style.opacity = String(DIM + (1 - DIM) * local);
      });
    }
  };

  // Nur mitrechnen, solange die Sektion im Bild ist.
  let ticking = false;
  const onScroll = () => {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      ticking = false;
      update();
    });
  };
  whileInView(root, (inView) => {
    if (inView) {
      window.addEventListener('scroll', onScroll, { passive: true });
      window.addEventListener('resize', onScroll, { passive: true });
      update();
    } else {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      // Ausser Sicht: volle Deckkraft, ohne zu messen.
      for (const item of statements) {
        item.last = -1;
        for (const word of item.words) word.style.opacity = '';
      }
    }
  });
}
