import { whileInView } from './in-view.ts';
import { motionAllowed } from './reduced.ts';

/**
 * Psi-Netz: pausiert die Animation ausserhalb des Viewports und neigt das Netz
 * bei feinem Pointer um wenige Grad. Bei reduzierter Bewegung passiert nichts.
 */
export function initPsiNet(root: ParentNode = document): () => void {
  const cleanups: (() => void)[] = [];
  const nets = root.querySelectorAll<SVGSVGElement>('[data-psi-net].is-animated');

  nets.forEach((net) => {
    cleanups.push(whileInView(net, (inView) => net.classList.toggle('is-paused', !inView)));
  });

  if (motionAllowed() && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    root.querySelectorAll<HTMLElement>('[data-psi-tilt]').forEach((area) => {
      const net = area.querySelector<SVGSVGElement>('[data-psi-net]');
      if (net) cleanups.push(initPsiTilt(net, area));
    });
  }

  return () => cleanups.forEach((cleanup) => cleanup());
}

/** Neigt `target` sanft in Richtung des Zeigers über `area` (höchstens `maxDeg` Grad). */
export function initPsiTilt(
  target: SVGElement | HTMLElement,
  area: HTMLElement,
  maxDeg = 5,
): () => void {
  let targetX = 0;
  let targetY = 0;
  let x = 0;
  let y = 0;
  let frame = 0;

  const apply = () => {
    x += (targetX - x) * 0.08;
    y += (targetY - y) * 0.08;
    target.style.transform = `perspective(900px) rotateX(${y.toFixed(3)}deg) rotateY(${x.toFixed(3)}deg)`;
    if (Math.abs(targetX - x) > 0.01 || Math.abs(targetY - y) > 0.01) {
      frame = requestAnimationFrame(apply);
    } else {
      frame = 0;
    }
  };
  const schedule = () => {
    if (!frame) frame = requestAnimationFrame(apply);
  };

  const onMove = (event: PointerEvent) => {
    if (event.pointerType && event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
    const rect = area.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width - 0.5;
    const py = (event.clientY - rect.top) / rect.height - 0.5;
    targetX = px * 2 * maxDeg;
    targetY = -py * 2 * maxDeg;
    schedule();
  };
  const onLeave = () => {
    targetX = 0;
    targetY = 0;
    schedule();
  };

  area.addEventListener('pointermove', onMove, { passive: true });
  area.addEventListener('pointerleave', onLeave, { passive: true });

  return () => {
    area.removeEventListener('pointermove', onMove);
    area.removeEventListener('pointerleave', onLeave);
    cancelAnimationFrame(frame);
    target.style.transform = '';
  };
}
