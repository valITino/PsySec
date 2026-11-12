// Screenshots für die Sichtprüfung: 390×844 und 1440×900, Viewport für Viewport.
//
// Aufruf: node scripts/shots.mjs <verzeichnis> <pfad> [--name web-home] [--base /PsySec]
//         [--only mobile|desktop] [--reduced] [--max 30] [--full] [--wait 600]
// Ergebnis: shots/<name>-<mobile|desktop>-NN.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : fallback;
};
const has = (name) => args.includes(name);
const positional = args.filter(
  (arg, index) =>
    !arg.startsWith('--') && !(args[index - 1] ?? '').match(/^--(name|base|only|max|wait|port)$/),
);
const [dir, path = '/'] = positional;
if (!dir) {
  console.error(
    'Aufruf: node scripts/shots.mjs <verzeichnis> <pfad> [--name x] [--only mobile|desktop] [--reduced] [--full]',
  );
  process.exit(1);
}

const name = flag('--name', 'shot');
const base = flag('--base', '');
const only = flag('--only', '');
const max = Number(flag('--max', '40'));
const wait = Number(flag('--wait', '500'));
const port = Number(flag('--port', '4390'));
const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1440, height: 900 } };

mkdirSync('shots', { recursive: true });
const server = await serve({ dir, port, base, quiet: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

try {
  for (const [label, viewport] of Object.entries(VIEWPORTS)) {
    if (only && only !== label) continue;
    const context = await browser.newContext({
      viewport,
      deviceScaleFactor: 1,
      reducedMotion: has('--reduced') ? 'reduce' : 'no-preference',
      isMobile: label === 'mobile',
      hasTouch: label === 'mobile',
    });
    const page = await context.newPage();
    const problems = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(`console: ${message.text()}`);
    });
    page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
    page.on('requestfailed', (request) => problems.push(`failed: ${request.url()}`));
    await page.goto(`http://localhost:${port}${base}${path}`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(wait);

    const metrics = await page.evaluate(() => ({
      height: document.documentElement.scrollHeight,
      overflowX: document.documentElement.scrollWidth - document.documentElement.clientWidth,
    }));
    if (metrics.overflowX > 0) problems.push(`horizontales Scrollen: ${metrics.overflowX}px`);

    if (has('--full')) {
      await page.screenshot({ path: `shots/${name}-${label}-full.png`, fullPage: true });
    } else {
      const steps = Math.min(max, Math.ceil(metrics.height / viewport.height));
      for (let index = 0; index < steps; index++) {
        const y = Math.min(index * viewport.height, Math.max(0, metrics.height - viewport.height));
        await page.evaluate((top) => window.scrollTo({ top, behavior: 'instant' }), y);
        await page.waitForTimeout(wait);
        await page.screenshot({
          path: `shots/${name}-${label}-${String(index).padStart(2, '0')}.png`,
        });
      }
    }
    console.log(
      `${label}: Höhe ${metrics.height}px${problems.length ? `\n  ${[...new Set(problems)].join('\n  ')}` : ', keine Fehler'}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
