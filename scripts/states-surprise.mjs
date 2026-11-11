// Fotografiert die Zeitleiste von surprise.psyber.tech Bild für Bild (Teaser, Glitch, Marker)
// sowie die Zustände «Fälschung», «Kopiert», ohne JS und mit reduzierter Bewegung.
// Aufruf: pnpm --filter @psyber/surprise build && node scripts/states-surprise.mjs
// Ergebnis: shots/surprise-tl-<mobile|desktop>-<ms>.png (Zeitleiste; Kontaktbogen mit
// `node scripts/sheet.mjs surprise-tl desktop`) und shots/surprise-<mobile|desktop>-<zustand>.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const port = 4394;
const url = `http://localhost:${port}/gewinn`;
mkdirSync('shots', { recursive: true });
const server = await serve({ dir: 'apps/surprise/dist', port, quiet: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};

/** Zeitpunkte in ms nach dem Laden: Teaser, Glitch (1000–1400), Marker (1900–2420). */
const FRAMES = [0, 500, 1010, 1060, 1110, 1160, 1210, 1260, 1320, 1370, 1500, 2150, 2600];

try {
  for (const [label, options] of Object.entries(VIEWPORTS)) {
    // --- Zeitleiste: alle Animationen anhalten und gezielt auf einen Zeitpunkt stellen
    {
      const context = await browser.newContext(options);
      const page = await context.newPage();
      const problems = [];
      page.on('console', (message) => {
        if (message.type() === 'error') problems.push(message.text());
      });
      page.on('pageerror', (error) => problems.push(error.message));
      await page.addInitScript(() => {
        const held = new Set();
        const hold = () => {
          for (const animation of document.getAnimations()) {
            if (!held.has(animation)) {
              animation.pause();
              held.add(animation);
            }
          }
          if (performance.now() < 3000) requestAnimationFrame(hold);
        };
        requestAnimationFrame(hold);
        window.__seek = (time) => {
          for (const animation of held) animation.currentTime = time;
          return held.size;
        };
      });
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      for (const time of FRAMES) {
        const count = await page.evaluate((t) => window.__seek(t), time);
        if (!count) problems.push('keine Animationen gefunden');
        await page.waitForTimeout(60);
        await page.screenshot({
          path: `shots/surprise-tl-${label}-${String(time).padStart(4, '0')}.png`,
        });
      }
      console.log(`${label}: Zeitleiste ${problems.length ? problems.join(' | ') : 'ohne Fehler'}`);
      await context.close();
    }

    // --- Zustände nach der Auflösung
    {
      const context = await browser.newContext({ ...options, permissions: ['clipboard-write'] });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.keyboard.press('Shift'); // Teaser überspringen
      await page.waitForTimeout(700);
      await page.screenshot({ path: `shots/surprise-${label}-skipped.png` });
      const reader = page.locator('[data-reader]');
      await reader.scrollIntoViewIfNeeded();
      await page.getByRole('button', { name: 'Fälschung' }).click();
      await page.waitForTimeout(200);
      await reader.screenshot({ path: `shots/surprise-${label}-faelschung.png` });
      await page.getByRole('button', { name: 'Echt', exact: true }).click();
      await page.waitForTimeout(200);
      await reader.screenshot({ path: `shots/surprise-${label}-echt.png` });
      const code = page.locator('[data-copy]');
      await code.scrollIntoViewIfNeeded();
      await code.click();
      await page.waitForTimeout(200);
      await page.locator('.offer').screenshot({ path: `shots/surprise-${label}-kopiert.png` });
      await context.close();
    }

    // --- Ohne JavaScript: sofort die Auflösung, beide Beispiele untereinander
    {
      const context = await browser.newContext({ ...options, javaScriptEnabled: false });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'load' });
      await page.screenshot({ path: `shots/surprise-${label}-nojs.png`, fullPage: true });
      await context.close();
    }

    // --- Reduzierte Bewegung: kein Teaser, kein Glitch
    {
      const context = await browser.newContext({ ...options, reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'domcontentloaded' });
      await page.screenshot({ path: `shots/surprise-${label}-reduced.png` });
      await context.close();
    }
  }
} finally {
  await browser.close();
  server.close();
}
