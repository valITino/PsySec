// OG-Bilder 1200×630 im Markenlook.
//
// Statt satori nutzen wir fontkit + resvg: satori kann weder WOFF2 noch die Achsen einer
// Variable Font. fontkit liest Recursive direkt aus @fontsource-variable/recursive, stellt
// CASL, MONO und wght ein und liefert die Buchstaben als Pfade. So sehen die Bilder exakt
// aus wie die Website, ohne dass eine zweite Schriftdatei gepflegt werden muss.
import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import wawoff2 from 'wawoff2';
import {
  amberEnds,
  arcPath,
  crossPath,
  shellPoints,
  sideNodes,
  signalArcs,
  stem,
  whiteNodes,
} from '../packages/ui/src/lib/psi-net-data.ts';

const WIDTH = 1200;
const HEIGHT = 630;
const C = {
  night: '#140a29',
  lav: '#ad9bf6',
  soft: '#e7e1fb',
  white: '#ffffff',
  violet: '#6b40c9',
  amber: '#f9ad26',
  line: '#3d2b68',
};

interface Axes {
  wght: number;
  CASL: number;
  MONO: number;
}

type Font = fontkit.Font;

async function loadRecursive(root: string): Promise<Font> {
  const require = createRequire(resolve(root, 'packages/ui/package.json'));
  const file =
    require.resolve('@fontsource-variable/recursive/files/recursive-latin-full-normal.woff2');
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(file)));
  return fontkit.create(ttf) as Font;
}

/** Text als SVG-Pfad. `x`, `y` = linke Kante und Grundlinie. */
function textPath(
  base: Font,
  axes: Axes,
  text: string,
  options: { x: number; y: number; size: number; fill: string; tracking?: number },
): { svg: string; width: number } {
  const font = base.getVariation({ ...axes, slnt: 0, CRSV: 0.5 });
  const scale = options.size / font.unitsPerEm;
  const tracking = (options.tracking ?? 0) * font.unitsPerEm;
  const run = font.layout(text);
  let cursor = 0;
  const parts: string[] = [];
  run.glyphs.forEach((glyph, index) => {
    const position = run.positions[index]!;
    const d = glyph.path.toSVG();
    if (d) {
      const tx = options.x + (cursor + position.xOffset) * scale;
      const ty = options.y - position.yOffset * scale;
      parts.push(
        `<path transform="translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${scale.toFixed(5)} ${(-scale).toFixed(5)})" d="${d}"/>`,
      );
    }
    cursor += position.xAdvance + tracking;
  });
  return {
    svg: `<g fill="${options.fill}">${parts.join('')}</g>`,
    width: (cursor - tracking) * scale,
  };
}

/** Psi-Netz aus denselben Daten wie die Astro-Komponente */
function psiNet(x: number, y: number, scale: number, opacity: number): string {
  const nodes = whiteNodes
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.3" fill="${C.white}"/>`)
    .join('');
  const sides = sideNodes
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="0.9" fill="${C.white}"/>`)
    .join('');
  const ends = amberEnds
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.3" fill="${C.amber}"/>`)
    .join('');
  const arcs = signalArcs
    .map(
      ({ r, opacity: o }) =>
        `<path d="${arcPath(r)}" fill="none" stroke="${C.amber}" stroke-width="1.1" stroke-linecap="round" opacity="${o}"/>`,
    )
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <path d="${crossPath}" fill="none" stroke="${C.lav}" stroke-width="0.5" opacity="0.45"/>
    <g fill="none" stroke="${C.lav}" stroke-width="0.95" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="${shellPoints}"/>
      <path d="M${stem.x} ${stem.top}V${stem.bottom}M${sideNodes[0]![0]} ${sideNodes[0]![1]}H${sideNodes[1]![0]}"/>
    </g>
    ${nodes}${sides}${ends}${arcs}
  </g>`;
}

/** Kachelbare Netz-Textur aus packages/ui als <pattern> */
function texture(root: string): string {
  const file = readFileSync(resolve(root, 'packages/ui/src/assets/net-texture.svg'), 'utf8');
  const inner = file.replace(/^<svg[^>]*>/, '').replace(/<\/svg>\s*$/, '');
  return `<pattern id="net" width="420" height="420" patternUnits="userSpaceOnUse">${inner}</pattern>`;
}

interface Card {
  /** Zielpfad relativ zum Repo */
  out: string;
  kicker: string;
  lines: string[];
  /** Schriftgrösse der Headline */
  size: number;
  footer: string;
}

const PSI_ICON = 'M2 2.2 C2 7 4 9.2 6 9.2 C8 9.2 10 7 10 2.2 M6 0.8 V13.2';

function render(root: string, font: Font, card: Card): Buffer {
  const display: Axes = { wght: 900, CASL: 1, MONO: 0 };
  const mono: Axes = { wght: 500, CASL: 0, MONO: 1 };
  const left = 80;

  const kicker = textPath(font, mono, `// ${card.kicker}`, {
    x: left,
    y: 196,
    size: 25,
    fill: C.lav,
  });
  const lineHeight = card.size * 1.02;
  const firstBaseline = 196 + 40 + card.size * 0.78;
  const headline = card.lines
    .map(
      (line, index) =>
        textPath(font, display, line, {
          x: left,
          y: firstBaseline + index * lineHeight,
          size: card.size,
          fill: C.white,
          tracking: -0.02,
        }).svg,
    )
    .join('');

  const wordmark = textPath(font, display, 'PSYber', {
    x: left + 46,
    y: 104,
    size: 44,
    fill: C.white,
    tracking: -0.02,
  });
  const footer = textPath(font, mono, card.footer, { x: left, y: 560, size: 23, fill: C.soft });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    ${texture(root)}
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.violet}" stop-opacity="0.5"/>
      <stop offset="1" stop-color="${C.violet}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.night}" stop-opacity="1"/>
      <stop offset="0.55" stop-color="${C.night}" stop-opacity="0.82"/>
      <stop offset="1" stop-color="${C.night}" stop-opacity="0"/>
    </linearGradient>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.night}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#net)" opacity="0.07"/>
  <circle cx="985" cy="330" r="390" fill="url(#glow)"/>
  ${psiNet(770, 78, 3.6, 0.95)}
  <rect width="780" height="${HEIGHT}" fill="url(#fade)"/>
  <g transform="translate(${left} 63) scale(3.1)" fill="none" stroke="${C.lav}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${PSI_ICON}"/></g>
  ${wordmark.svg}
  ${kicker.svg}
  ${headline}
  <rect x="${left}" y="518" width="56" height="3" rx="1.5" fill="${C.amber}"/>
  ${footer.svg}
</svg>`;

  return Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());
}

export async function renderOgImages(root: string): Promise<void> {
  const font = await loadRecursive(root);
  const cards: Card[] = [
    {
      out: 'apps/web/public/og/psyber.png',
      kicker: 'Cyber-Prävention für Familien in Zürich',
      lines: ['Ein Klick zu viel?', 'Ein Anruf zu', 'glaubwürdig?'],
      size: 84,
      footer: 'Wir patchen Layer 8.  ·  psyber.tech',
    },
    {
      out: 'apps/web/public/og/checkliste.png',
      kicker: 'Checkliste zum Ausdrucken',
      lines: ['5 Warnsignale', 'für Online-Betrug'],
      size: 92,
      footer: 'Pause statt Panik.  ·  psyber.tech/checkliste',
    },
    {
      out: 'apps/forms/public/og/umfrage.png',
      kicker: 'Rund 4 Minuten. Anonym. Mit Gratis-Checkliste.',
      lines: ['Wie sicher ist', 'Ihre Familie', 'online?'],
      size: 84,
      footer: 'Umfrage  ·  forms.psyber.tech',
    },
  ];
  for (const card of cards) {
    const target = resolve(root, card.out);
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, render(root, font, card));
    console.log(`OG-Bild → ${card.out}`);
  }
}
