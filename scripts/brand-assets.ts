// Erzeugt die statischen Marken-Assets der drei Websites:
//   - Favicon-Set aus dem Psi-Icon (favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png)
//   - site.webmanifest
//   - OG-Bilder 1200×630 (siehe scripts/og.ts)
// Aufruf: pnpm assets   (Ergebnisse werden committet; neu ausführen, wenn sich Marke oder Texte ändern)
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOgImages } from './og.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const NIGHT = '#140a29';
const LAV = '#ad9bf6';
const PSI_PATH = 'M2 2.2 C2 7 4 9.2 6 9.2 C8 9.2 10 7 10 2.2 M6 0.8 V13.2';

/** Psi-Icon auf dunklem Quadrat. `radius` 0 für Apple und maskierbare Icons. */
function iconSvg(size: number, radius: number, scale = 1.7): string {
  const unit = size / 32;
  const width = 12 * scale * unit;
  const height = 14 * scale * unit;
  const x = (size - width) / 2;
  const y = (size - height) / 2;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}"><rect width="${size}" height="${size}" rx="${radius * unit}" fill="${NIGHT}"/><path d="${PSI_PATH}" transform="translate(${x} ${y}) scale(${scale * unit})" fill="none" stroke="${LAV}" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
}

const png = (svg: string): Buffer => Buffer.from(new Resvg(svg).render().asPng());

/** ICO-Container mit PNG-Bildern (16, 32, 48 px). */
function ico(images: { size: number; data: Buffer }[]): Buffer {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);
  const entries: Buffer[] = [];
  let offset = 6 + images.length * 16;
  for (const { size, data } of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size >= 256 ? 0 : size, 0);
    entry.writeUInt8(size >= 256 ? 0 : size, 1);
    entry.writeUInt8(0, 2);
    entry.writeUInt8(0, 3);
    entry.writeUInt16LE(1, 4);
    entry.writeUInt16LE(32, 6);
    entry.writeUInt32LE(data.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += data.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.data)]);
}

const apps = [
  { dir: 'apps/web', name: 'PSYber', description: 'Cyber-Prävention für Familien in Zürich' },
  { dir: 'apps/forms', name: 'PSYber Umfrage', description: 'Wie sicher ist Ihre Familie online?' },
  { dir: 'apps/surprise', name: 'PSYber', description: 'Erwischt! Zum Glück nur von uns.' },
];

for (const app of apps) {
  const out = resolve(root, app.dir, 'public');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'favicon.svg'), `${iconSvg(32, 7)}\n`);
  writeFileSync(
    resolve(out, 'favicon.ico'),
    ico([16, 32, 48].map((size) => ({ size, data: png(iconSvg(size, 7)) }))),
  );
  writeFileSync(resolve(out, 'apple-touch-icon.png'), png(iconSvg(180, 0, 1.5)));
  writeFileSync(resolve(out, 'icon-192.png'), png(iconSvg(192, 0, 1.3)));
  writeFileSync(resolve(out, 'icon-512.png'), png(iconSvg(512, 0, 1.3)));
  const manifest = {
    name: app.name,
    short_name: 'PSYber',
    description: app.description,
    lang: 'de-CH',
    start_url: '.',
    display: 'browser',
    background_color: NIGHT,
    theme_color: NIGHT,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  writeFileSync(resolve(out, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Favicons → ${app.dir}/public`);
}

await renderOgImages(root);
