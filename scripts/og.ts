// OG-Bilder 1200×630 im Markenlook.
//
// Statt satori nutzen wir fontkit + resvg: satori kann weder WOFF2 noch Variable Fonts.
// fontkit liest Manrope und Geist Mono direkt aus den Fontsource-Paketen, stellt das Gewicht
// ein und liefert die Buchstaben als Pfade. Eule und Wortmarke kommen aus dem Logo-Kit
// (packages/ui/src/brand). So sehen die Bilder aus wie die Website, ohne dass eine zweite
// Schriftdatei gepflegt werden muss.
import { Resvg } from '@resvg/resvg-js';
import * as fontkit from 'fontkit';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import wawoff2 from 'wawoff2';

const WIDTH = 1200;
const HEIGHT = 630;
const C = {
  void: '#08080b',
  ash: '#9c9ca6',
  bone: '#f4f4ef',
  haze: '#cfc8e2',
  space: '#3d1e86',
  nebula: '#b678f7',
  trace: '#3d2b68',
  amber: '#f9ad26',
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
): string {
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
  return `<g fill="${options.fill}">${parts.join('')}</g>`;
}

/**
 * Bild aus dem Logo-Kit einsetzen: Inhalt der SVG-Datei, auf `height` skaliert, linke obere
 * Ecke bei (x, y). Die viewBox der Datei gibt Ursprung und Grösse vor.
 */
function kitImage(root: string, file: string, x: number, y: number, height: number): string {
  const source = readFileSync(resolve(root, 'packages/ui/src/brand', file), 'utf8');
  const box = /viewBox="([\d.\s-]+)"/.exec(source)?.[1]?.split(/\s+/).map(Number);
  if (!box || box.length !== 4) throw new Error(`viewBox fehlt in ${file}`);
  const [minX, minY, , boxHeight] = box as [number, number, number, number];
  const scale = height / boxHeight;
  const inner = source
    .replace(/^[\s\S]*?<svg[^>]*>/, '')
    .replace(/<\/svg>\s*$/, '')
    .replace(/<title>[^<]*<\/title>/, '');
  return `<g transform="translate(${(x - minX * scale).toFixed(2)} ${(y - minY * scale).toFixed(2)}) scale(${scale.toFixed(5)})">${inner}</g>`;
}

/** Leiterbahn mit Lötpunkt am Ende, im Stil des Logo-Kits */
function trace(d: string, end: [number, number], led = false): string {
  const [cx, cy] = end;
  return `<path d="${d}" fill="none" stroke="${C.trace}" stroke-width="3" stroke-linejoin="round"/>
  <circle cx="${cx}" cy="${cy}" r="8" fill="${C.void}" stroke="${C.trace}" stroke-width="3"/>
  ${led ? `<circle cx="${cx}" cy="${cy}" r="3.5" fill="${C.amber}"/>` : ''}`;
}

interface Card {
  /** Zielpfad relativ zum Repo */
  out: string;
  kicker: string;
  lines: string[];
  /** Schriftgrösse der Headline */
  size: number;
  footer: string;
  mood?: 'blick' | 'skeptisch' | 'erwischt';
}

function render(root: string, fonts: Fonts, card: Card): Buffer {
  const left = 72;

  const kicker = textPath(fonts.sans, 600, card.kicker.toLocaleUpperCase('de-CH'), {
    x: left + 34,
    y: 192,
    size: 19,
    fill: C.ash,
    tracking: 0.08,
  });
  const slashes = textPath(fonts.mono, 500, '//', { x: left, y: 192, size: 19, fill: C.acid });
  // Etwas Luft zwischen den Zeilen: Die Punkte von Ä, Ö, Ü stossen sonst an die Zeile darüber.
  const lineHeight = card.size * 1.0;
  const firstBaseline = 192 + 34 + card.size * 0.74;
  const headline = card.lines
    .map((line, index) =>
      textPath(fonts.sans, 650, line.toLocaleUpperCase('de-CH'), {
        x: left,
        y: firstBaseline + index * lineHeight,
        size: card.size,
        fill: C.bone,
        tracking: -0.045,
      }),
    )
    .join('');
  const footer = textPath(fonts.sans, 600, card.footer, {
    x: left,
    y: 560,
    size: 21,
    fill: C.haze,
    tracking: 0.01,
  });
  const owl = card.mood && card.mood !== 'blick' ? `owl-${card.mood}.svg` : 'owl.svg';

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${WIDTH}" height="${HEIGHT}" viewBox="0 0 ${WIDTH} ${HEIGHT}">
  <defs>
    <radialGradient id="glow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="${C.space}" stop-opacity="0.9"/>
      <stop offset="0.55" stop-color="${C.space}" stop-opacity="0.35"/>
      <stop offset="1" stop-color="${C.space}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fade" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="${C.void}" stop-opacity="1"/>
      <stop offset="0.62" stop-color="${C.void}" stop-opacity="0.78"/>
      <stop offset="1" stop-color="${C.void}" stop-opacity="0"/>
    </linearGradient>
    <pattern id="dots" width="22" height="22" patternUnits="userSpaceOnUse">
      <circle cx="11" cy="11" r="1" fill="${C.bone}" opacity="0.14"/>
    </pattern>
  </defs>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="${C.void}"/>
  <rect width="${WIDTH}" height="${HEIGHT}" fill="url(#dots)"/>
  <circle cx="980" cy="330" r="520" fill="url(#glow)"/>
  ${trace('M690 118H930L984 64H1128', [1128, 64], true)}
  ${trace('M720 206H800L846 160H1150', [1150, 160])}
  ${trace('M700 520H842L888 566H1140', [1140, 566], true)}
  ${trace('M730 446H790', [730, 446])}
  <rect width="740" height="${HEIGHT}" fill="url(#fade)"/>
  ${kitImage(root, owl, 790, 128, 400)}
  ${kitImage(root, 'wordmark.svg', left, 62, 44)}
  ${slashes}
  ${kicker}
  ${headline}
  <rect x="${left}" y="516" width="64" height="4" rx="2" fill="${C.acid}"/>
  ${footer}
</svg>`;

  return Buffer.from(new Resvg(svg, { font: { loadSystemFonts: false } }).render().asPng());
}

export async function renderOgImages(root: string): Promise<void> {
  const fonts = await loadFonts(root);
  const cards: Card[] = [
    {
      out: 'apps/web/public/og/psyber.png',
      kicker: 'Cyber-Prävention für Familien',
      lines: ['Ein Klick zu viel?', 'Ein Anruf zu', 'glaubwürdig?'],
      size: 78,
      footer: 'Betrüger hassen diesen Blick.  ·  psyber.tech',
    },
    {
      out: 'apps/web/public/og/checkliste.png',
      kicker: 'Checkliste zum Ausdrucken',
      lines: ['5 Warnsignale', 'für Online-', 'Betrug'],
      size: 78,
      footer: 'Pause statt Panik.  ·  psyber.tech/checkliste',
      mood: 'skeptisch',
    },
    {
      out: 'apps/forms/public/og/umfrage.png',
      kicker: 'Rund 4 Minuten. Anonym. Mit Gratis-Checkliste.',
      lines: ['Wie sicher ist', 'Ihre Familie', 'online?'],
      size: 78,
      footer: 'Umfrage  ·  forms.psyber.tech',
    },
  ];
  for (const card of cards) {
    const target = resolve(root, card.out);
    mkdirSync(resolve(target, '..'), { recursive: true });
    writeFileSync(target, render(root, fonts, card));
    console.log(`OG-Bild → ${card.out}`);
  }
}
