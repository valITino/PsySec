// Kontaktbogen aus den Screenshots in shots/: mehrere Viewports verkleinert nebeneinander.
// Aufruf: node scripts/sheet.mjs <name> <mobile|desktop> [--cols 3] [--per 6] [--width 480]
// Ergebnis: shots/<name>-<label>-sheet-N.png
import { chromium } from '@playwright/test';
import { readdirSync, readFileSync } from 'node:fs';

const [name, label = 'desktop'] = process.argv.slice(2).filter((arg) => !arg.startsWith('--'));
const flag = (key, fallback) => {
  const index = process.argv.indexOf(key);
  return index >= 0 ? Number(process.argv[index + 1]) : fallback;
};
const cols = flag('--cols', label === 'mobile' ? 6 : 3);
const per = flag('--per', label === 'mobile' ? 12 : 6);
const width = flag('--width', label === 'mobile' ? 240 : 480);

const files = readdirSync('shots')
  .filter((file) => new RegExp(`^${name}-${label}-\\d+\\.png$`).test(file))
  .sort();
if (files.length === 0) {
  console.error(`Keine Screenshots für ${name}-${label} gefunden.`);
  process.exit(1);
}

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ deviceScaleFactor: 1 });
for (let start = 0, sheet = 0; start < files.length; start += per, sheet++) {
  const group = files.slice(start, start + per);
  const cells = group
    .map((file) => {
      const data = readFileSync(`shots/${file}`).toString('base64');
      const number = file.match(/-(\d+)\.png$/)[1];
      return `<figure><img src="data:image/png;base64,${data}" width="${width}"><figcaption>${number}</figcaption></figure>`;
    })
    .join('');
  await page.setViewportSize({ width: cols * (width + 8) + 8, height: 600 });
  await page.setContent(
    `<style>body{margin:8px;background:#444;display:grid;grid-template-columns:repeat(${cols},${width}px);gap:8px;font:12px monospace;color:#fff}figure{margin:0;position:relative}img{display:block}figcaption{position:absolute;top:2px;left:2px;background:#000;padding:1px 4px}</style>${cells}`,
  );
  await page.screenshot({ path: `shots/${name}-${label}-sheet-${sheet}.png`, fullPage: true });
}
await browser.close();
console.log(`${files.length} Screenshots → ${Math.ceil(files.length / per)} Bogen`);
