// Prüft das JS-Budget der drei Websites (gzip, initial geladen, ohne Turnstile).
//   web 120 KB · forms 60 KB · surprise 25 KB
// Gezählt wird, was die Einstiegsseite sofort lädt: <script>-Dateien, modulepreload und
// alle statisch importierten Module. Per import() nachgeladene Teile zählen nicht.
// Aufruf: pnpm build && pnpm budgets
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const KB = 1000;

const SITES = [
  { name: 'web', dist: 'apps/web/dist', entry: 'index.html', budget: 120 },
  { name: 'forms', dist: 'apps/forms/dist', entry: 'index.html', budget: 60 },
  { name: 'surprise', dist: 'apps/surprise/dist', entry: 'gewinn.html', budget: 25 },
];

const gzipSize = (content) => gzipSync(content, { level: 9 }).length;

/** Pfad im dist-Verzeichnis aus einer URL im HTML (Basis-Pfad wird abgeschnitten). */
function toFile(dist, url) {
  const clean = url.split(/[?#]/)[0];
  const marker = clean.indexOf('/_astro/');
  if (marker >= 0) return join(dist, clean.slice(marker));
  return join(dist, clean);
}

function staticImports(code) {
  const found = new Set();
  // import x from"./a.js" · import"./a.js" · export*from"./a.js"   (nicht: import("./a.js"))
  const pattern = /(?:\bimport|\bexport)\s*(?:[^"'()]*?\bfrom\s*)?["'](\.{1,2}\/[^"']+\.js)["']/g;
  for (const match of code.matchAll(pattern)) found.add(match[1]);
  return [...found];
}

let failed = false;
console.log('JS-Budgets (gzip, initial)\n');

for (const site of SITES) {
  const dist = resolve(root, site.dist);
  const entry = join(dist, site.entry);
  if (!existsSync(entry)) {
    console.error(
      `✗ ${site.name}: ${site.dist}/${site.entry} fehlt. Zuerst «pnpm build» ausführen.`,
    );
    failed = true;
    continue;
  }
  const html = readFileSync(entry, 'utf8');
  const files = new Map();
  let inlineBytes = 0;
  const queue = [];

  for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)) {
    const [, attrs, body] = match;
    const src = /\bsrc=["']([^"']+)["']/.exec(attrs)?.[1];
    if (src) {
      if (/^https?:\/\//.test(src)) continue; // Dritte (Turnstile) zählen nicht zum Budget
      queue.push(toFile(dist, src));
    } else if (!/type=["']application\/(ld\+)?json["']/.test(attrs) && body.trim()) {
      inlineBytes += gzipSize(body);
    }
  }
  for (const match of html.matchAll(/<link\b[^>]*rel=["']modulepreload["'][^>]*>/g)) {
    const hrefValue = /\bhref=["']([^"']+)["']/.exec(match[0])?.[1];
    if (hrefValue) queue.push(toFile(dist, hrefValue));
  }

  while (queue.length > 0) {
    const file = queue.pop();
    if (files.has(file) || !existsSync(file)) continue;
    const code = readFileSync(file, 'utf8');
    files.set(file, gzipSize(code));
    for (const specifier of staticImports(code)) queue.push(resolve(dirname(file), specifier));
  }

  const total = [...files.values()].reduce((sum, size) => sum + size, 0) + inlineBytes;
  const ok = total <= site.budget * KB;
  if (!ok) failed = true;
  console.log(
    `${ok ? '✓' : '✗'} ${site.name.padEnd(9)} ${(total / KB).toFixed(1).padStart(6)} KB von ${site.budget} KB  (${files.size} Dateien${inlineBytes ? `, inline ${(inlineBytes / KB).toFixed(1)} KB` : ''})`,
  );
  for (const [file, size] of [...files.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) {
    console.log(`    ${(size / KB).toFixed(1).padStart(6)} KB  ${file.slice(dist.length + 1)}`);
  }
}

if (failed) {
  console.error('\nBudget überschritten oder Build fehlt.');
  process.exit(1);
}
