// Klickt die Umfrage einmal durch und speichert Screenshots der wichtigsten Screens.
// Aufruf: pnpm build && node scripts/states-forms.mjs
// Die API wird abgefangen; es geht kein Request ins Netz.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { serve } from './serve.mjs';

const port = 4393;
const base = `http://localhost:${port}`;
mkdirSync('shots', { recursive: true });
const server = await serve({ dir: 'apps/forms/dist', port, quiet: true });
const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

const VIEWPORTS = {
  mobile: { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true },
  desktop: { viewport: { width: 1440, height: 900 } },
};

try {
  for (const [label, options] of Object.entries(VIEWPORTS)) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    await page.route('https://api.psyber.tech/**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type',
        },
        body: '{"ok":true}',
      }),
    );
    const problems = [];
    page.on('console', (message) => {
      if (message.type() === 'error') problems.push(message.text());
    });
    page.on('pageerror', (error) => problems.push(error.message));
    const shot = async (name) => {
      await page.waitForTimeout(450);
      await page.screenshot({ path: `shots/forms-${label}-${name}.png` });
    };
    const next = () => page.locator('.sv-next').click();
    const option = (text) => page.locator('.sv-option', { hasText: text }).click();

    await page.goto(`${base}/?quelle=instagram&fokus=vor`, { waitUntil: 'networkidle' });
    await shot('00-start');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await shot('01-q1');
    await option('Stadt Zürich'); // Einfachauswahl springt von selbst weiter → q2
    await page.getByRole('heading', { name: 'Wer lebt in Ihrem Haushalt?' }).waitFor();
    await option('Kinder 10–15');
    await option('Erwachsene');
    await shot('02-q2');
    await next(); // q3
    await next(); // q4 (übersprungen: q3 ist freiwillig)
    await next(); // Pflicht ohne Antwort → Hinweis
    await shot('04-q4-hint');
    await page.locator('.sv-tile', { hasText: '4' }).click(); // Skala springt weiter → q5
    await page.getByRole('heading', { name: /schon Erfahrungen/ }).waitFor();
    await next(); // q6
    await shot('06-q6-empty');
    for (const row of [
      'phishing',
      'anlagebetrug',
      'romance',
      'cybermobbing',
      'heimnetz',
      'privatsphaere',
    ]) {
      await page
        .locator(`.sv-tile:has(input[name="q6-${row}"][value="${row === 'romance' ? 2 : 5}"])`)
        .click();
    }
    await shot('06-q6-filled');
    await next(); // q7
    await option('Session bei uns zu Hause');
    await next(); // q8
    await next(); // q9
    await next(); // q10
    await shot('10-q10');
    await next(); // q11
    await page.locator('#sv-q11-a').fill('500');
    await page.locator('#sv-q11-b').fill('400');
    await page.locator('#sv-q11-c').fill('600');
    await page.locator('#sv-q11-d').fill('900');
    await next();
    await shot('11-q11-order');
    await page.locator('#sv-q11-a').fill('200');
    await next(); // q12
    await next(); // q13
    await next(); // q14
    await option('Preis');
    await option('Datenschutz');
    await option('Vertrauen und Seriosität');
    await shot('14-q14-max');
    await next(); // q15
    await page.locator('#sv-q15').fill('Ich weiss nicht, mit wem mein Kind online chattet.');
    await shot('15-q15');
    await next(); // q16
    await page.locator('#sv-email').fill('familie@example.ch');
    await page.locator('.check', { hasText: 'Founding Family' }).click();
    await shot('16-q16');
    await next(); // absenden
    await page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }).waitFor();
    await shot('17-done');
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await shot('18-done-bottom');
    console.log(
      `${label}: ${problems.length ? [...new Set(problems)].join(' | ') : 'keine Fehler'}`,
    );
    await context.close();
  }
} finally {
  await browser.close();
  server.close();
}
