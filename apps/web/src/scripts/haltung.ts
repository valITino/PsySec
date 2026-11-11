/**
 * 0x05 Haltung: Wörter werden beim Scrollen von 25 % auf 100 % Deckkraft hell.
 *
 * Gedimmt sind die Wörter nur, solange der Satz durch den Bildschirm läuft. Davor und danach
 * (und ohne dieses Skript) steht der Text in voller Deckkraft: lesbar für alle, die per
 * Ankerlink, Suche oder Screenreader dort landen, und für jede Kontrastprüfung.
 */
import { gsap, ScrollTrigger } from '@psyber/ui/motion/smooth';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText, ScrollTrigger);

const DIM = 0.25;
/** Dauer eines Worts und Versatz zum nächsten (in Einheiten der Zeitleiste) */
const WORD = 0.5;
const STAGGER = 0.12;
/** Anteil der Strecke, auf dem der Satz noch ganz gedimmt bleibt (er kommt gerade ins Bild) */
const HOLD = 0.3;

export function initHaltung(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-reveal-words]').forEach((statement) => {
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
    const total = WORD + STAGGER * (words.length - 1);

    /** progress 0 = der Satz erreicht den unteren Rand, 1 = er steht auf 38 % der Höhe */
    const render = (progress: number) => {
      const outside = progress <= 0 || progress >= 1;
      const time = Math.max(0, (progress - HOLD) / (1 - HOLD)) * total;
      words.forEach((word, index) => {
        if (outside) {
          word.style.opacity = '';
          return;
        }
        const local = Math.min(1, Math.max(0, (time - STAGGER * index) / WORD));
        word.style.opacity = String(DIM + (1 - DIM) * local);
      });
    };

    ScrollTrigger.create({
      trigger: statement,
      start: 'top bottom',
      end: 'top 38%',
      onUpdate: (self) => render(self.progress),
      onRefresh: (self) => render(self.progress),
    });
  });
}
