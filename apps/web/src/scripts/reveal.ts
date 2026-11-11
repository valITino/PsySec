/**
 * Überschriften der Sektionen fahren einmal zeilenweise hinter einer Maske herein, sobald sie
 * ins Bild kommen. Danach wird die Aufteilung zurückgenommen: Das Markup ist wieder wie zuvor.
 * Was beim Start schon sichtbar ist (oder darüber liegt), bleibt einfach stehen.
 */
import { DUR, EASE, gsap } from '@psyber/ui/motion/smooth';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export function initReveals(): void {
  const titles = document.querySelectorAll<HTMLElement>('main h2.display, main [data-reveal]');
  titles.forEach((title) => {
    if (title.getBoundingClientRect().top < window.innerHeight * 0.92) return;
    const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'ln' });
    gsap.from(split.lines, {
      yPercent: 118,
      duration: DUR.d4,
      ease: EASE,
      stagger: 0.08,
      scrollTrigger: { trigger: title, start: 'top 90%', once: true },
      onComplete: () => split.revert(),
    });
  });
}
