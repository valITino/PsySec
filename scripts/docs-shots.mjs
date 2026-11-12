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
  // Die Startseite stellt Sektionen weiter unten zurück: für stabile Positionen sofort berechnen.
  await page.evaluate(async () => {
    const lazy = [...document.querySelectorAll('[data-lazy]:not([data-laid])')];
    for (const element of lazy) element.dataset.laid = 'new';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const element of document.querySelectorAll('[data-lazy]')) element.dataset.laid = '';
  });
  await page.waitForTimeout(300);
  return page;
}

/** Scrollt so, dass das Element knapp unter der Kapsel steht, und wartet auf Einblendungen. */
async function scrollTo(page, selector, offset = 84) {
  await page.evaluate(
    ([sel, gap]) => {
      const top = document.querySelector(sel).getBoundingClientRect().top + window.scrollY;
      window.scrollTo(0, Math.max(0, top - gap));
    },
    [selector, offset],
  );
  await page.waitForTimeout(700);
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
    // Der Globus entsteht kurz nach dem ersten Bild
    await page.waitForTimeout(1800);
    await shot(page, 'web-hero-desktop');
    await done(page);
  }
  {
    const page = await open(MOBILE, `${WEB}/`, { reduced: true });
    await page.waitForTimeout(600);
    await shot(page, 'web-hero-mobile');
    await page.getByRole('button', { name: 'Menü' }).click();
    await page.waitForTimeout(300);
    await shot(page, 'web-menu-mobile');
    await done(page);
  }
  {
    const page = await open(DESKTOP, `${WEB}/`, { reduced: true });
    // Klick-Simulator in Schritt 2: der DNS-Filter hat blockiert, der Sticker klebt
    await scrollTo(page, '[data-sim]', 40);
    await page.getByRole('button', { name: /Schritt 2/ }).click();
    await page.waitForTimeout(700);
    await shot(page, 'web-simulator-desktop');
    for (const [selector, name] of [
      ['.drehbuch', 'web-drehbuch-desktop'],
      ['#maschen', 'web-maschen-desktop'],
      ['#pakete', 'web-pakete-desktop'],
      ['#ueber', 'web-ueber-desktop'],
    ]) {
      // «Über» etwas tiefer, damit Karte und Sticker ganz im Bild sind
      const offset = { '.drehbuch': 0, '#ueber': -26 }[selector] ?? 84;
      await scrollTo(page, selector, offset);
      await shot(page, name);
    }
    // Footer ganz zeigen: Fenster so hoch wie der Footer plus Platz für die Kapsel darüber
    const footerHeight = await page.evaluate(() =>
      Math.ceil(document.querySelector('footer').getBoundingClientRect().height),
    );
    await page.setViewportSize({ width: 1280, height: Math.min(1500, footerHeight + 96) });
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await page.waitForTimeout(700);
    await shot(page, 'web-footer-desktop');
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
    // Wartet auf die Frage und kurz darüber hinaus: Direkt nach einem Fragenwechsel zählen
    // Klicks auf Antworten nicht (Schutz vor Doppelklicks).
    const progress = async (text) => {
      await page.locator('.sv-progress-text', { hasText: text }).waitFor();
      await page.waitForTimeout(450);
    };
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
      let released = false;
      const hold = () => {
        if (released) return;
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
      // Zeitleiste zu Ende führen und nichts mehr anhalten: Sonst blieben auch die Übergänge
      // der Tasten stehen, die danach gedrückt werden.
      window.__release = () => {
        released = true;
        for (const animation of held) animation.finish();
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
    await page.evaluate(() => window.__release());
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
    // Reichweite: Überschrift, Kacheln, Verlauf und die erste Reihe der Listen
    const reachTop = await page
      .locator('h2', { hasText: 'Reichweite der Websites' })
      .evaluate((element) => element.getBoundingClientRect().top + window.scrollY);
    await page.screenshot({
      path: `${OUT}/report-reichweite.jpg`,
      type: 'jpeg',
      quality: 82,
      fullPage: true,
      clip: { x: 0, y: reachTop - 24, width: 1180, height: 1230 },
    });
    console.log('✓ report-reichweite.jpg');
    await context.close();
  } else {
    console.log('– Bericht übersprungen: zuerst «node scripts/analyze.ts --demo» ausführen');
  }
} finally {
  await browser.close();
  for (const server of servers) server.close();
}
