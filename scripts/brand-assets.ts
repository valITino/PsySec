// Erzeugt die statischen Marken-Assets der drei Websites aus dem Logo-Kit (packages/ui/src/brand):
//   - Favicon-Set mit der Eule (favicon.svg, favicon.ico, apple-touch-icon.png, icon-192/512.png)
//   - site.webmanifest
//   - OG-Bilder 1200×630 (siehe scripts/og.ts)
// Aufruf: pnpm assets   (Ergebnisse werden committet; neu ausführen, wenn sich Marke oder Texte ändern)
import { Resvg } from '@resvg/resvg-js';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderOgImages } from './og.ts';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const VOID = '#08080b';
const kit = (file: string): string =>
  readFileSync(resolve(root, 'packages/ui/src/brand', file), 'utf8');

/** Kleines Icon mit runden Ecken (Browser-Tab) */
const FAVICON = kit('favicon.svg');
/** Volle Fläche ohne runde Ecken: Apple und maskierbare Icons schneiden selbst zu. */
const AVATAR = kit('avatar.svg');

const png = (svg: string, size: number): Buffer =>
  Buffer.from(new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng());

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
  { dir: 'apps/web', name: 'PSYber', description: 'Cyber-Prävention für Familien' },
  { dir: 'apps/forms', name: 'PSYber Umfrage', description: 'Wie sicher ist Ihre Familie online?' },
  { dir: 'apps/surprise', name: 'PSYber', description: 'Erwischt! Zum Glück nur von uns.' },
];

for (const app of apps) {
  const out = resolve(root, app.dir, 'public');
  mkdirSync(out, { recursive: true });
  writeFileSync(resolve(out, 'favicon.svg'), FAVICON);
  writeFileSync(
    resolve(out, 'favicon.ico'),
    ico([16, 32, 48].map((size) => ({ size, data: png(FAVICON, size) }))),
  );
  writeFileSync(resolve(out, 'apple-touch-icon.png'), png(AVATAR, 180));
  writeFileSync(resolve(out, 'icon-192.png'), png(AVATAR, 192));
  writeFileSync(resolve(out, 'icon-512.png'), png(AVATAR, 512));
  const manifest = {
    name: app.name,
    short_name: 'PSYber',
    description: app.description,
    lang: 'de-CH',
    start_url: '.',
    display: 'browser',
    background_color: VOID,
    theme_color: VOID,
    icons: [
      { src: 'icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  };
  writeFileSync(resolve(out, 'site.webmanifest'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`Favicons → ${app.dir}/public`);
}

await renderOgImages(root);
