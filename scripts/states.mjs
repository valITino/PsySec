// Screenshots interaktiver Zustände von psyber.tech (für die Sichtprüfung).
// Aufruf: pnpm build && node scripts/states.mjs   → shots/state-*.png
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const port = 4391;
const base = `http://localhost:${port}`;
mkdirSync('shots', { recursive: true });
const server = await serve({ dir: 'apps/web/dist', port, quiet: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);
const shot = (page, name) => page.screenshot({ path: `shots/state-${name}.png` });

try {
  // ---------- Mobile ----------
  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
  });
  let page = await mobile.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  await page.getByRole('button', { name: 'Menü' }).click();
  await page.waitForTimeout(400);
  await shot(page, 'mobile-menu');
  await page.keyboard.press('Escape');

  await page.locator('[data-sim]').scrollIntoViewIfNeeded();
  await page.getByRole('button', { name: /Schritt 2/ }).click();
  await page.waitForTimeout(3200);
  await page.evaluate(() => {
    const phone = document.querySelector('.sim-phone');
    window.scrollTo({
      top: phone.getBoundingClientRect().top + window.scrollY - 90,
      behavior: 'instant',
    });
  });
  await page.waitForTimeout(500);
  await shot(page, 'mobile-sim-2');
  await mobile.close();

  // ---------- Desktop ----------
  const desktop = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  page = await desktop.newPage();
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });

  const firstFile = page.locator('.file summary').first();
  await firstFile.scrollIntoViewIfNeeded();
  await firstFile.click();
  await page.waitForTimeout(500);
  await shot(page, 'desktop-file-open');

  await page.locator('#kontakt').scrollIntoViewIfNeeded();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Anfrage senden' }).click();
  await page.waitForTimeout(500);
  await page.evaluate(() => {
    const form = document.querySelector('[data-contact]');
    window.scrollTo({
      top: form.getBoundingClientRect().top + window.scrollY - 110,
      behavior: 'instant',
    });
  });
  await page.waitForTimeout(400);
  await shot(page, 'desktop-contact-errors');

  await page.getByLabel('Name').fill('Familie Muster');
  await page.getByLabel('E-Mail').fill('familie@example.ch');
  await page.getByLabel('PLZ und Ort').fill('8000 Zürich');
  await page.getByLabel('Familien-Session').check();
  await page.getByLabel(/Datenschutzerklärung/).check();
  await page.getByRole('button', { name: 'Anfrage senden' }).click();
  await page.waitForTimeout(1600);
  await shot(page, 'desktop-contact-success');

  // Tastaturfokus: Fokus-Ring auf dem primären Button im Hero
  await page.goto(`${base}/`, { waitUntil: 'networkidle' });
  for (let index = 0; index < 9; index++) await page.keyboard.press('Tab');
  await page.waitForTimeout(300);
  await shot(page, 'desktop-focus');
  await desktop.close();
  console.log('Zustände gespeichert: shots/state-*.png');
} finally {
  await browser.close();
  server.close();
}
