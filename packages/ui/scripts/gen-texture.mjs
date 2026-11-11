// Erzeugt die kachelbare Hintergrund-Textur: ein feines Netz aus Punkten und Linien.
// Deterministisch (fester Seed), damit das Ergebnis reproduzierbar bleibt.
// Aufruf: node scripts/gen-texture.mjs
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const TILE = 420;
const CELLS = 6;
const CELL = TILE / CELLS;
const JITTER = 22;

// Mulberry32: kleiner, deterministischer Zufallsgenerator
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rand = rng(0x50537962); // «PSyb»

// Gitterpunkte mit Versatz; Indizes laufen modulo, damit die Kachel nahtlos ist
const pts = [];
for (let y = 0; y < CELLS; y++) {
  for (let x = 0; x < CELLS; x++) {
    pts.push({
      x: x * CELL + CELL / 2 + (rand() * 2 - 1) * JITTER,
      y: y * CELL + CELL / 2 + (rand() * 2 - 1) * JITTER,
      big: rand() < 0.16,
    });
  }
}
const at = (x, y) => pts[((y + CELLS) % CELLS) * CELLS + ((x + CELLS) % CELLS)];
const f = (n) => Number(n.toFixed(1));

const lines = [];
function connect(ax, ay, bx, by) {
  const a = at(ax, ay);
  const b = at(bx, by);
  // Nachbar jenseits der Kachelgrenze: Linie doppelt zeichnen (einmal je Seite)
  const dx = bx >= CELLS ? TILE : bx < 0 ? -TILE : 0;
  const dy = by >= CELLS ? TILE : by < 0 ? -TILE : 0;
  lines.push([a.x, a.y, b.x + dx, b.y + dy]);
  if (dx || dy) lines.push([a.x - dx, a.y - dy, b.x, b.y]);
}
for (let y = 0; y < CELLS; y++) {
  for (let x = 0; x < CELLS; x++) {
    if (rand() < 0.72) connect(x, y, x + 1, y);
    if (rand() < 0.66) connect(x, y, x, y + 1);
    if (rand() < 0.22) connect(x, y, x + 1, y + 1);
    if (rand() < 0.12) connect(x, y, x - 1, y + 1);
  }
}

const d = lines.map(([x1, y1, x2, y2]) => `M${f(x1)} ${f(y1)}L${f(x2)} ${f(y2)}`).join('');
const dots = pts
  .map((p) => `<circle cx="${f(p.x)}" cy="${f(p.y)}" r="${p.big ? 2.4 : 1.4}"/>`)
  .join('');

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${TILE}" height="${TILE}" viewBox="0 0 ${TILE} ${TILE}"><path d="${d}" fill="none" stroke="#fff" stroke-width="0.7"/><g fill="#fff">${dots}</g></svg>\n`;

const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/assets/net-texture.svg');
writeFileSync(target, svg);
console.log(`${pts.length} Punkte, ${lines.length} Linien, ${svg.length} Bytes → ${target}`);
