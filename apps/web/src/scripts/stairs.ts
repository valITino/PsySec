/** 0x08 Pakete: Die Treppe wächst einmal, sobald sie sichtbar wird. */
import { motionAllowed, onceInView } from '@psyber/ui/motion';

export function initStairs(root: HTMLElement): void {
  if (!motionAllowed()) return;
  root.dataset.animated = '';
  onceInView(root, () => root.classList.add('is-in'), { threshold: 0.2 });
}
