/**
 * 0x05 Haltung: Wörter werden beim Scrollen von 25 % auf 100 % Deckkraft hell.
 */
import { gsap, ScrollTrigger } from '@psyber/ui/motion/smooth';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText, ScrollTrigger);

export function initHaltung(root: HTMLElement): void {
  root.querySelectorAll<HTMLElement>('[data-reveal-words]').forEach((statement) => {
    // SplitText setzt aria-label am Element und versteckt die einzelnen Wörter vor Screenreadern.
    const split = SplitText.create(statement, { type: 'words', wordsClass: 'word' });
    gsap.fromTo(
      split.words,
      { opacity: 0.25 },
      {
        opacity: 1,
        ease: 'none',
        stagger: 0.12,
        scrollTrigger: {
          trigger: statement,
          start: 'top 82%',
          end: 'top 38%',
          scrub: true,
        },
      },
    );
  });
}
