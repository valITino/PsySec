// Erzeugt die Screenshots für die Doku (docs/screenshots/*.jpg): eine kleine, feste Auswahl
// der wichtigsten Ansichten aller drei Websites, des Terminals und des Auswertungsberichts.
//
// Aufruf: pnpm build && node scripts/analyze.ts --demo && node scripts/docs-shots.mjs
// Die API wird abgefangen; es geht kein Request ins Netz.
import { chromium } from '@playwright/test';
import { existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { serve } from './serve.mjs';

const OUT = 'docs/screenshots';
const DESKTOP = { viewport: { width: 1280, height: 800 } };
const MOBILE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
mkdirSync(OUT, { recursive: true });

const servers = [
  await serve({ dir: 'apps/web/dist', port: 4351, quiet: true }),
  await serve({ dir: 'apps/forms/dist', port: 4352, quiet: true }),
  await serve({ dir: 'apps/surprise/dist', port: 4353, quiet: true }),
];
const WEB = 'http://localhost:4351';
const FORMS = 'http://localhost:4352';
const SURPRISE = 'http://localhost:4353';

const browser = await chromium.launch(
  process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
);

async function open(options, url, { reduced = false } = {}) {
  const context = await browser.newContext({
    ...options,
    deviceScaleFactor: 1,
    reducedMotion: reduced ? 'reduce' : 'no-preference',
    locale: 'de-CH',
    timezoneId: 'Europe/Zurich',
  });
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
  await page.goto(url, { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  return page;
}

const shot = async (page, name, options = {}) => {
  await page.screenshot({ path: `${OUT}/${name}.jpg`, type: 'jpeg', quality: 82, ...options });
  console.log(`✓ ${name}.jpg`);
};
const done = (page) => page.context().close();

try {
  // ---------------------------------------------------------------- psyber.tech
  {
    const page = await open(DESKTOP, `${WEB}/`);
    await page.locator('[data-sim][data-ready]').waitFor();
    // Der Simulator spielt einmal ab: Stand nach Schritt 1 (alle Warnsignale markiert)
    await page.waitForTimeout(5600);
    await shot(page, 'web-hero-desktop');
    await done(page);
  }
  {
    const page = await open(MOBILE, `${WEB}/`, { reduced: true });
    await shot(page, 'web-hero-mobile');
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'web-menu-mobile');
    await done(page);
  }
  {
    const page = await open(DESKTOP, `${WEB}/`, { reduced: true });
    for (const [selector, name] of [
      ['.drehbuch', 'web-drehbuch-desktop'],
      ['#maschen', 'web-maschen-desktop'],
      ['#pakete', 'web-pakete-desktop'],
    ]) {
      await page.locator(selector).first().scrollIntoViewIfNeeded();
      await page.evaluate((sel) => {
        const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
        window.scrollTo(0, Math.max(0, top - 72));
      }, selector);
      await page.waitForTimeout(500);
      await shot(page, name);
    }
    await done(page);
  }
  {
    // Easter Egg: Konami-Terminal
    const page = await open(DESKTOP, `${WEB}/`, { reduced: true });
    await page.locator('[data-sim][data-ready]').waitFor();
    for (const key of [
      'ArrowUp',
      'ArrowUp',
      'ArrowDown',
      'ArrowDown',
      'ArrowLeft',
      'ArrowRight',
      'ArrowLeft',
      'ArrowRight',
      'b',
      'a',
    ]) {
      await page.keyboard.press(key);
    }
    await page.locator('dialog.term').waitFor();
    for (const command of ['help', 'ping familie.local', 'sudo patch layer8']) {
      await page.keyboard.type(command);
      await page.keyboard.press('Enter');
    }
    await page.waitForTimeout(300);
    await shot(page, 'web-terminal-desktop');
    await done(page);
  }

  // ---------------------------------------------------------------- forms.psyber.tech
  {
    const page = await open(DESKTOP, `${FORMS}/?quelle=website`, { reduced: true });
    await page.locator('.sv[data-ready]').waitFor();
    await shot(page, 'forms-start-desktop');
    await done(page);
  }
  {
    const page = await open(MOBILE, `${FORMS}/?quelle=website`, { reduced: true });
    await page.locator('.sv[data-ready]').waitFor();
    const next = () => page.locator('.sv-next').click();
    const option = (text) => page.locator('.sv-option', { hasText: text }).click();
    const tile = (value, row) =>
      page
        .locator(
          row
            ? `.sv-tile:has(input[name="q6-${row}"][value="${value}"])`
            : `.sv-tile:has(input[value="${value}"])`,
        )
        .click();
    const progress = (text) => page.locator('.sv-progress-text', { hasText: text }).waitFor();
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await progress('1 / 16');
    await option('Stadt Zürich');
    await progress('2 / 16');
    await option('Kinder 10–15');
    await option('Erwachsene');
    await shot(page, 'forms-frage-mobile');
    await next();
    await progress('3 / 16');
    await next();
    await progress('4 / 16');
    await tile(4);
    await progress('5 / 16');
    await next();
    await progress('6 / 16');
    const rows = [
      'phishing',
      'anlagebetrug',
      'romance',
      'cybermobbing',
      'heimnetz',
      'privatsphaere',
    ];
    for (const [index, row] of rows.entries()) await tile([5, 3, 2, 4, 5, 4][index], row);
    await shot(page, 'forms-matrix-mobile');
    await next();
    await progress('7 / 16');
    await option('Session bei uns zu Hause');
    await next();
    for (let step = 8; step < 16; step++) {
      await progress(`${step} / 16`);
      await next();
    }
    await progress('16 / 16');
    await next();
    await page.getByRole('heading', { name: 'Ihre Schwerpunkte' }).waitFor();
    await page.waitForTimeout(300);
    await shot(page, 'forms-danke-mobile', { fullPage: true });
    await done(page);
  }

  // ---------------------------------------------------------------- surprise.psyber.tech
  for (const [label, options] of [
    ['desktop', DESKTOP],
    ['mobile', MOBILE],
  ]) {
    const context = await browser.newContext({ ...options, deviceScaleFactor: 1 });
    const page = await context.newPage();
    // Zeitleiste anhalten und gezielt auf einen Zeitpunkt stellen
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
      };
    });
    await page.goto(`${SURPRISE}/gewinn`, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    if (label === 'desktop') {
      await page.evaluate(() => window.__seek(600));
      await page.waitForTimeout(80);
      await shot(page, 'surprise-teaser-desktop');
      await page.evaluate(() => window.__seek(1250));
      await page.waitForTimeout(80);
      await shot(page, 'surprise-glitch-desktop');
    }
    await page.evaluate(() => window.__seek(3000));
    await page.waitForTimeout(80);
    await shot(page, `surprise-erwischt-${label}`);
    if (label === 'mobile') {
      await page.getByRole('button', { name: 'Fälschung' }).click();
      await page.locator('[data-reader]').scrollIntoViewIfNeeded();
      await page.evaluate(() => window.scrollBy(0, -90));
      await page.waitForTimeout(200);
      await shot(page, 'surprise-adressen-mobile');
    } else {
      await page.locator('.offer').scrollIntoViewIfNeeded();
      await page.waitForTimeout(200);
      await shot(page, 'surprise-angebot-desktop');
    }
    await context.close();
  }

  // ---------------------------------------------------------------- Auswertung (Demo-Daten)
  const report = resolve('reports/umfrage-demo.html');
  if (existsSync(report)) {
    const context = await browser.newContext({
      viewport: { width: 1180, height: 800 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await page.goto(`file://${report}`);
    await shot(page, 'report-ampel');
    await page
      .locator('figure.card-wide')
      .first()
      .screenshot({
        path: `${OUT}/report-kurven.jpg`,
        type: 'jpeg',
        quality: 82,
      });
    console.log('✓ report-kurven.jpg');
    await context.close();
  } else {
    console.log('– Bericht übersprungen: zuerst «node scripts/analyze.ts --demo» ausführen');
  }
} finally {
  await browser.close();
  for (const server of servers) server.close();
}
