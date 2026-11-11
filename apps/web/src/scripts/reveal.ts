/**
 * Überschriften der Sektionen fahren einmal zeilenweise hinter einer Maske herein, sobald sie
 * ins Bild kommen. Danach wird die Aufteilung zurückgenommen: Das Markup ist wieder wie zuvor.
 * Was beim Start schon sichtbar ist (oder darüber liegt), bleibt einfach stehen.
 *
 * Geteilt wird erst im Moment des Erscheinens, eine Überschrift nach der anderen. Alle auf
 * einmal zu teilen, würde den Browser beim Laden für jede einzelne das Layout neu rechnen lassen.
 */
import { DUR, EASE, gsap } from '@psyber/ui/motion/smooth';
import { SplitText } from 'gsap/SplitText';

gsap.registerPlugin(SplitText);

export function initReveals(): void {
  if (typeof IntersectionObserver === 'undefined') return;
  const titles = document.querySelectorAll<HTMLElement>('main h2.display, main [data-reveal]');
  let first = true;

  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        const title = entry.target as HTMLElement;
        // Erste Meldung: Was schon im Bild steht oder darüber liegt, wird nicht mehr animiert.
        // (Bewusst über den Observer und nicht selbst gemessen: Messen würde den Browser zwingen,
        // auch die noch zurückgestellten Sektionen sofort zu berechnen.)
        if (first && (entry.isIntersecting || entry.boundingClientRect.bottom < 0)) {
          observer.unobserve(title);
          continue;
        }
        if (!entry.isIntersecting) continue;
        observer.unobserve(title);
        const split = SplitText.create(title, { type: 'lines', mask: 'lines', linesClass: 'ln' });
        gsap.from(split.lines, {
          yPercent: 118,
          duration: DUR.d4,
          ease: EASE,
          stagger: 0.08,
          onComplete: () => split.revert(),
        });
      }
      first = false;
    },
    { rootMargin: '0px 0px -8% 0px' },
  );

  titles.forEach((title) => observer.observe(title));
}
