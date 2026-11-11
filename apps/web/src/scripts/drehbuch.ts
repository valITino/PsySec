/**
 * 0x02 Drehbuch: scroll-gesteuerte Kette.
 * Eine Linie zeichnet sich mit dem Scrollen durch die acht Schritte; die drei Eingriffe rasten ein.
 * Desktop: horizontal, die Bühne bleibt stehen (Pinning). Mobile: vertikal ohne Pinning.
 */
import { gsap, ScrollTrigger } from '@psyber/ui/motion/smooth';

const EPSILON = 0.004;

export function initDrehbuch(root: HTMLElement): void {
  const stage = root.querySelector<HTMLElement>('[data-drehbuch-stage]');
  const acts = root.querySelector<HTMLElement>('[data-acts]');
  const track = root.querySelector<HTMLElement>('.acts-track');
  const caption = root.querySelector<HTMLElement>('[data-acts-caption]');
  if (!stage || !acts || !track || !caption) return;

  const actElements = [...root.querySelectorAll<HTMLElement>('[data-act]')];
  const steps = [...root.querySelectorAll<HTMLElement>('[data-step]')];
  const fixes = [...root.querySelectorAll<HTMLElement>('[data-fix]')];
  const heads = steps.map((step) => step.querySelector<HTMLElement>('[data-step-head]'));
  const texts = steps.map(
    (step) => step.querySelector<HTMLElement>('[data-step-text]')?.textContent?.trim() ?? '',
  );
  const numbers = steps.map((step) => step.querySelector('.step-num')?.textContent?.trim() ?? '');
  /** Index des letzten Schritts je Akt */
  const lastOfAct = actElements.map((act) => {
    const own = [...act.querySelectorAll<HTMLElement>('[data-step]')];
    return steps.indexOf(own[own.length - 1]!);
  });
  const firstOfAct = actElements.map((act) =>
    steps.indexOf(act.querySelector<HTMLElement>('[data-step]')!),
  );

  let stepAt: number[] = [];
  let fixAt: number[] = [];
  let current = -1;
  let shown = -2;
  let peek: number | null = null;
  let progress = 0;

  const showCaption = () => {
    const index = peek ?? current;
    if (index === shown) return;
    shown = index;
    caption.replaceChildren();
    if (index < 0) return;
    const number = document.createElement('span');
    number.className = 'mono acts-caption-num';
    number.textContent = numbers[index] ?? '';
    caption.append(number, ` ${texts[index] ?? ''}`);
  };

  const apply = (value: number) => {
    progress = value;
    acts.style.setProperty('--p', value.toFixed(4));
    let last = -1;
    steps.forEach((step, index) => {
      const on = value >= (stepAt[index] ?? 2) - EPSILON;
      step.classList.toggle('is-on', on);
      if (on) last = index;
    });
    steps.forEach((step, index) => step.classList.toggle('is-current', index === last));
    fixes.forEach((fix, index) => {
      fix.classList.toggle('is-on', value >= (fixAt[index] ?? 2) - EPSILON);
    });
    actElements.forEach((act, index) => {
      act.classList.toggle('is-on', last >= (firstOfAct[index] ?? 99));
    });
    current = last;
    showCaption();
  };

  /** Wo auf der Linie liegen Knoten und Eingriffe? (0 = Anfang, 1 = Ende) */
  const measure = (horizontal: boolean) => {
    const rail = track.getBoundingClientRect();
    const along = (rect: DOMRect) =>
      horizontal
        ? (rect.left + rect.width / 2 - rail.left) / rail.width
        : (rect.top + rect.height / 2 - rail.top) / rail.height;
    stepAt = steps.map((step) => along(step.querySelector('.step-node')!.getBoundingClientRect()));
    fixAt = fixes.map((fix, index) =>
      horizontal
        ? (stepAt[lastOfAct[index] ?? 0] ?? 1)
        : along(fix.querySelector('.fix-link')!.getBoundingClientRect()),
    );
    apply(progress);
  };

  root.dataset.animated = '';
  const media = gsap.matchMedia();

  // Desktop mit genug Höhe: Bühne anpinnen, Linie über die Scrollstrecke zeichnen.
  media.add('(min-width: 64rem) and (min-height: 46rem)', () => {
    root.dataset.pinned = '';
    const onRefresh = () => measure(true);
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: 'top top',
      end: '+=190%',
      pin: true,
      anticipatePin: 1,
      scrub: true,
      onRefresh,
      // Die letzten 12 % der Strecke bleibt der Endzustand stehen.
      onUpdate: (self) => apply(Math.min(1, self.progress / 0.88)),
    });
    onRefresh();
    return () => {
      trigger.kill();
      delete root.dataset.pinned;
    };
  });

  // Desktop mit wenig Höhe: horizontal, aber ohne Pinning.
  media.add('(min-width: 64rem) and (max-height: 45.99rem)', () => {
    const onRefresh = () => measure(true);
    const trigger = ScrollTrigger.create({
      trigger: acts,
      start: 'top 70%',
      end: 'bottom 75%',
      scrub: true,
      onRefresh,
      onUpdate: (self) => apply(self.progress),
    });
    onRefresh();
    return () => trigger.kill();
  });

  // Mobile und Tablet: vertikal; die Spitze der Linie bleibt auf 62 % der Viewport-Höhe.
  media.add('(max-width: 63.99rem)', () => {
    const onRefresh = () => measure(false);
    const trigger = ScrollTrigger.create({
      trigger: acts,
      start: 'top 62%',
      end: 'bottom 62%',
      scrub: true,
      onRefresh,
      onUpdate: (self) => apply(self.progress),
    });
    onRefresh();
    return () => trigger.kill();
  });

  // Desktop: Hover und Tastaturfokus zeigen den Kurztext jedes Schritts in der Caption.
  media.add('(min-width: 64rem)', () => {
    const cleanups: (() => void)[] = [];
    heads.forEach((head, index) => {
      if (!head) return;
      head.tabIndex = 0;
      const enter = () => {
        peek = index;
        showCaption();
      };
      const leave = () => {
        if (peek === index) peek = null;
        showCaption();
      };
      head.addEventListener('pointerenter', enter);
      head.addEventListener('pointerleave', leave);
      head.addEventListener('focus', enter);
      head.addEventListener('blur', leave);
      cleanups.push(() => {
        head.removeAttribute('tabindex');
        head.removeEventListener('pointerenter', enter);
        head.removeEventListener('pointerleave', leave);
        head.removeEventListener('focus', enter);
        head.removeEventListener('blur', leave);
      });
    });
    return () => {
      peek = null;
      cleanups.forEach((cleanup) => cleanup());
    };
  });
}
