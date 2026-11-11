/**
 * Geometrie des Key Visuals «Psi-Netz» (ein Psi aus Netzwerkknoten).
 * Dieselben Daten nutzen die Astro-Komponente und der OG-Bild-Generator.
 */

export type Point = readonly [x: number, y: number];

export const PSI_NET_VIEWBOX = '0 -12 120 172';

/** Schale: Polyline durch 11 Punkte, von links nummeriert 1–11 */
export const shell: readonly Point[] = [
  [12, 22],
  [14.1, 47.7],
  [20.3, 67.4],
  [30.1, 81.2],
  [43.5, 89.3],
  [60, 92],
  [76.5, 89.3],
  [89.9, 81.2],
  [99.7, 67.4],
  [105.9, 47.7],
  [108, 22],
];

/** Stiel: Linie x = 60 von y = 8 bis y = 156 */
export const stem = { x: 60, top: 8, bottom: 156 } as const;

/** Knoten auf dem Stiel */
export const stemNodes: readonly number[] = [28, 48, 68, 92, 113, 134, 156];

/** Spitze des Stiels und die beiden Nebenknoten daneben */
export const tip: Point = [60, 8];
export const sideNodes: readonly Point[] = [
  [36, 8],
  [84, 8],
];

/** Dünne Querverbindungen: Schalenpunkt (1-basiert) → Zielpunkt */
export const crossLinks: readonly (readonly [from: number, to: Point])[] = [
  [2, [60, 28]],
  [3, [60, 48]],
  [4, [60, 68]],
  [10, [60, 28]],
  [9, [60, 48]],
  [8, [60, 68]],
  [3, [60, 28]],
  [9, [60, 28]],
  [5, [60, 68]],
  [7, [60, 68]],
  [2, [36, 8]],
  [10, [84, 8]],
];

/** Signalbögen über der Spitze: Radius und Deckkraft, Winkel −128° bis −52° */
export const signalArcs: readonly { r: number; opacity: number }[] = [
  { r: 7, opacity: 1 },
  { r: 11.5, opacity: 0.65 },
  { r: 16, opacity: 0.35 },
];
export const ARC_FROM_DEG = -128;
export const ARC_TO_DEG = -52;

const round = (n: number) => Math.round(n * 100) / 100;

export const shellPoints = shell.map(([x, y]) => `${x},${y}`).join(' ');

/** Die drei amberfarbenen Enden: links oben, rechts oben, Spitze */
export const amberEnds: readonly Point[] = [shell[0]!, shell[shell.length - 1]!, tip];

/** Weisse Knoten (r 1.5): Schalenpunkte 2–10 und die Stielknoten, ohne Doppelte */
export const whiteNodes: readonly Point[] = (() => {
  const seen = new Set<string>();
  const out: Point[] = [];
  const add = (p: Point) => {
    const key = `${p[0]}|${p[1]}`;
    if (!seen.has(key)) {
      seen.add(key);
      out.push(p);
    }
  };
  shell.slice(1, -1).forEach(add);
  stemNodes.forEach((y) => add([stem.x, y]));
  return out;
})();

export const crossPath = crossLinks
  .map(([from, [x, y]]) => {
    const [sx, sy] = shell[from - 1]!;
    return `M${sx} ${sy}L${x} ${y}`;
  })
  .join('');

export function arcPath(r: number): string {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const x1 = round(tip[0] + r * Math.cos(rad(ARC_FROM_DEG)));
  const y1 = round(tip[1] + r * Math.sin(rad(ARC_FROM_DEG)));
  const x2 = round(tip[0] + r * Math.cos(rad(ARC_TO_DEG)));
  const y2 = round(tip[1] + r * Math.sin(rad(ARC_TO_DEG)));
  return `M${x1} ${y1}A${r} ${r} 0 0 1 ${x2} ${y2}`;
}
