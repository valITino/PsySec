// OG-Bilder 1200×630 im Markenlook.
//
// Statt satori nutzen wir fontkit + resvg: satori kann weder WOFF2 noch Variable Fonts.
// fontkit liest Manrope und Geist Mono direkt aus den Fontsource-Paketen, stellt das Gewicht
// ein und liefert die Buchstaben als Pfade. So sehen die Bilder aus wie die Website, ohne dass
// eine zweite Schriftdatei gepflegt werden muss.
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
  void: '#08080b',
  ash: '#9c9ca6',
  bone: '#f4f4ef',
  haze: '#cfc8e2',
  space: '#3d1e86',
  nebula: '#b678f7',
  acid: '#c9fb52',
};

type Font = fontkit.Font;

interface Fonts {
  sans: Font;
  mono: Font;
}

async function loadFont(root: string, file: string): Promise<Font> {
  const require = createRequire(resolve(root, 'packages/ui/package.json'));
  const ttf = Buffer.from(await wawoff2.decompress(readFileSync(require.resolve(file))));
  return fontkit.create(ttf) as Font;
}

async function loadFonts(root: string): Promise<Fonts> {
  return {
    sans: await loadFont(
      root,
      '@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2',
    ),
    mono: await loadFont(
      root,
      '@fontsource-variable/geist-mono/files/geist-mono-latin-wght-normal.woff2',
    ),
  };
}

/** Text als SVG-Pfad. `x`, `y` = linke Kante und Grundlinie. */
function textPath(
  base: Font,
  weight: number,
  text: string,
  options: { x: number; y: number; size: number; fill: string; tracking?: number },
): { svg: string; width: number } {
  const font = base.getVariation({ wght: weight });
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
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="1.3" fill="${C.bone}"/>`)
    .join('');
  const sides = sideNodes
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="0.9" fill="${C.bone}"/>`)
    .join('');
  const ends = amberEnds
    .map(([cx, cy]) => `<circle cx="${cx}" cy="${cy}" r="2.3" fill="${C.acid}"/>`)
    .join('');
  const arcs = signalArcs
    .map(
      ({ r, opacity: o }) =>
        `<path d="${arcPath(r)}" fill="none" stroke="${C.acid}" stroke-width="1.1" stroke-linecap="round" opacity="${o}"/>`,
    )
    .join('');
  return `<g transform="translate(${x} ${y}) scale(${scale})" opacity="${opacity}">
    <path d="${crossPath}" fill="none" stroke="${C.haze}" stroke-width="0.5" opacity="0.45"/>
    <g fill="none" stroke="${C.haze}" stroke-width="0.95" stroke-linecap="round" stroke-linejoin="round">
      <polyline points="${shellPoints}"/>
      <path d="M${stem.x} ${stem.top}V${stem.bottom}M${sideNodes[0]![0]} ${sideNodes[0]![1]}H${sideNodes[1]![0]}"/>
    </g>
    ${nodes}${sides}${ends}${arcs}
  </g>`;
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

function render(fonts: Fonts, card: Card): Buffer {
  const left = 72;

  const kicker = textPath(fonts.mono, 500, `// ${card.kicker.toLocaleUpperCase('de-CH')}`, {
    x: left,
    y: 192,
    size: 19,
    fill: C.ash,
    tracking: 0.08,
  });
  // Etwas Luft zwischen den Zeilen: Die Punkte von Ä, Ö, Ü stossen sonst an die Zeile darüber.
  const lineHeight = card.size * 1.0;
  const firstBaseline = 192 + 34 + card.size * 0.74;
  const headline = card.lines
    .map(
      (line, index) =>
        textPath(fonts.sans, 650, line.toLocaleUpperCase('de-CH'), {
          x: left,
          y: firstBaseline + index * lineHeight,
          size: card.size,
          fill: C.bone,
          tracking: -0.045,
        }).svg,
    )
    .join('');

  const wordmark = textPath(fonts.sans, 800, 'PSYber', {
    x: left + 44,
    y: 100,
    size: 42,
    fill: C.bone,
    tracking: -0.045,
  });
  const footer = textPath(fonts.mono, 500, card.footer, {
    x: left,
    y: 560,
    size: 20,
    fill: C.haze,
    tracking: 0.02,
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="orb" cx="0.62" cy="0.24" r="0.8">
      <stop offset="0" stop-color="#3a2180"/>
      <stop offset="0.45" stop-color="#1c0f45"/>
      <stop offset="1" stop-color="#0b0719"/>
    </radialGradient>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.space}" stop-opacity="0.75"/>
      <stop offset="1" stop-color="${C.space}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.void}" stop-opacity="1"/>
      <stop offset="0.6" stop-color="${C.void}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${C.void}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="1" fill="${C.bone}" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.void}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)"/>
  <circle cx="960" cy="330" r="560" fill="url(#glow)"/>
  <circle cx="960" cy="330" r="300" fill="url(#orb)" stroke="${C.nebula}" stroke-opacity="0.6" stroke-width="1.5"/>
  ${psiNet(798, 122, 2.7, 0.95)}
  <rect width="760" height="${HEIGHT}" fill="url(#fade)"/>
  <g transform="translate(${left} 60) scale(3)" fill="none" stroke="${C.acid}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="${PSI_ICON}"/></g>
  ${wordmark.svg}
  ${kicker.svg}
  ${headline}
  <rect x="${left}" y="516" width="64" height="4" rx="2" fill="${C.acid}"/>
  ${footer.svg}
</svg>`;

  return Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());
}

export async function renderOgImages(root: string): Promise<void> {
  const fonts = await loadFonts(root);
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
      size: 84,
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
    writeFileSync(target, render(fonts, card));
    console.log(`OG-Bild → ${card.out}`);
  }
}
