import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { SURPRISE } from '../playwright.config.ts';
import { collectErrors, cutOff, horizontalOverflow, mockApi } from './helpers.ts';

const URL = `${SURPRISE}/gewinn`;

/** Wartet, bis das Skript der Seite gelaufen ist. */
const ready = (page: Page) => page.locator('[data-surprise][data-ready]').waitFor();

/** Hält die CSS-Zeitleiste an und stellt sie auf einen Zeitpunkt (ms nach dem Laden). */
const freezeAt = (page: Page, time: number) =>
  page.evaluate((t) => {
    for (const animation of document.getAnimations()) {
      animation.pause();
      animation.currentTime = t;
    }
  }, time);

const teaserOffTime = (page: Page) =>
  page.evaluate(() => {
    const animation = document
      .getAnimations()
      .find((item) => (item as CSSAnimation).animationName === 'sp-teaser-off');
    return animation ? Number(animation.currentTime) : -1;
  });

test.describe('surprise.psyber.tech', () => {
  test('Auflösung: Teaser endet von selbst, keine Fehler, kein horizontales Scrollen', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(URL);
    await ready(page);

    const teaser = page.locator('[data-teaser]');
    await expect(teaser).toBeHidden({ timeout: 4000 });
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erwischt!');
    await expect(page.getByText('Zum Glück nur von uns.')).toBeVisible();
    await expect(page.getByText('Diesen Link haben Sie angeklickt:')).toBeVisible();
    await expect(page.locator('.sp-url')).toHaveText(/https:\/\/surprise\.\s*psyber\.tech/);
    await expect(
      page.getByRole('heading', { name: 'Diese drei Signale hätten Sie warnen können' }),
    ).toBeVisible();
    await expect(page.locator('.signal')).toHaveCount(3);
    expect(await horizontalOverflow(page)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('Teaser: sichtbar bis zum Schnitt, per Taste überspringbar', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    const teaser = page.locator('[data-teaser]');

    // Zeitleiste anhalten: bei 300 ms steht der Teaser, nach dem Schnitt (1200 ms) ist er weg.
    await freezeAt(page, 300);
    await expect(teaser).toBeVisible();
    await expect(teaser).toContainText('Ihr Gutschein wird vorbereitet');
    await expect(teaser).toHaveAttribute('aria-hidden', 'true');
    await freezeAt(page, 1250);
    await expect(teaser).toBeHidden();

    // Zurück an den Anfang: eine Taste spult alles an den Beginn des Glitchs (1000 ms).
    await freezeAt(page, 300);
    await page.keyboard.press('Space');
    expect(await teaserOffTime(page)).toBe(1000);
  });

  test('Teaser: per Klick überspringbar', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await freezeAt(page, 200);
    await page.locator('[data-teaser]').click();
    expect(await teaserOffTime(page)).toBe(1000);
  });

  test('fragt nichts ab: keine Eingabefelder, keine Cookies, kein Speicher', async ({
    page,
    context,
  }) => {
    await page.goto(`${URL}?ref=umfrage&s=3`);
    await ready(page);
    await expect(page.locator('input, textarea, select, form, [contenteditable]')).toHaveCount(0);
    expect(await context.cookies()).toEqual([]);
    expect(
      await page.evaluate(() => window.localStorage.length + window.sessionStorage.length),
    ).toBe(0);
  });

  test('noindex, no-referrer und Links auf psyber.tech', async ({ page }) => {
    await page.goto(URL);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'noindex, nofollow',
    );
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute('content', 'no-referrer');
    await expect(page.getByRole('link', { name: 'Session anfragen' })).toHaveAttribute(
      'href',
      'https://psyber.tech/?ref=surprise#kontakt',
    );
    await expect(page.getByRole('link', { name: 'Impressum' })).toHaveAttribute(
      'href',
      'https://psyber.tech/impressum',
    );
    await expect(page.getByRole('link', { name: 'Datenschutz' })).toHaveAttribute(
      'href',
      'https://psyber.tech/datenschutz',
    );
    await expect(
      page.getByText('Diese Seite setzt keine Cookies und fragt nichts ab.'),
    ).toBeVisible();

    const robots = await page.request.get(`${SURPRISE}/robots.txt`);
    expect(await robots.text()).toContain('Disallow: /');

    // Header, die Cloudflare aus der Datei _headers setzt
    const headers = readFileSync('apps/surprise/dist/_headers', 'utf8');
    expect(headers).toContain('X-Robots-Tag: noindex, nofollow');
    expect(headers).toContain('Referrer-Policy: no-referrer');
    expect(readFileSync('apps/surprise/dist/_redirects', 'utf8')).toContain('/ /gewinn 302');
  });

  test('«/» führt auf /gewinn', async ({ page }) => {
    await page.goto(`${SURPRISE}/`);
    await page.waitForURL(/\/gewinn$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erwischt!');
  });

  test('zählt bait_click genau einmal und nur mit ref=umfrage', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${URL}?ref=umfrage&s=4`);
    await ready(page);
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]).toEqual({ path: '/v1/event', body: { event: 'bait_click', s: 4 } });

    // Die Parameter sind weg: Neuladen zählt nicht noch einmal.
    expect(new globalThis.URL(page.url()).search).toBe('');
    await page.reload();
    await ready(page);
    await page.waitForTimeout(300);
    expect(calls).toHaveLength(1);
  });

  test('bait_click ohne gültige Selbsteinschätzung kommt ohne «s»', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${URL}?ref=umfrage&s=9`);
    await ready(page);
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]?.body).toEqual({ event: 'bait_click' });
  });

  test('ohne ref=umfrage wird nichts gezählt', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${URL}?s=4`);
    await ready(page);
    await page.waitForTimeout(400);
    expect(calls).toEqual([]);
  });

  test('«Adressen lesen»: Umschalter Echt / Fälschung, auch per Tastatur', async ({ page }) => {
    await page.goto(URL);
    await ready(page);
    await page.keyboard.press('Shift'); // Teaser überspringen
    const echt = page.getByRole('button', { name: 'Echt', exact: true });
    const fake = page.getByRole('button', { name: 'Fälschung' });
    const echtPanel = page.locator('[data-reader-panel="echt"]');
    const fakePanel = page.locator('[data-reader-panel="faelschung"]');

    await expect(echt).toHaveAttribute('aria-pressed', 'true');
    await expect(echtPanel).toBeVisible();
    await expect(echtPanel).toContainText('https://surprise.psyber.tech/gewinn');
    await expect(echtPanel).toContainText('Echte Website: psyber.tech');
    await expect(fakePanel).toBeHidden();

    await fake.click();
    await expect(fake).toHaveAttribute('aria-pressed', 'true');
    await expect(echt).toHaveAttribute('aria-pressed', 'false');
    await expect(fakePanel).toBeVisible();
    await expect(fakePanel).toContainText('https://psyber.tech.gutschein-sofort.ch/gewinn');
    await expect(fakePanel).toContainText(
      'Echte Website: gutschein-sofort.ch. Eine fremde Seite, auch wenn «psyber.tech» in der Adresse vorkommt.',
    );
    await expect(echtPanel).toBeHidden();

    await echt.focus();
    await page.keyboard.press('Enter');
    await expect(echt).toHaveAttribute('aria-pressed', 'true');
    await expect(echtPanel).toBeVisible();
    await expect(fakePanel).toBeHidden();

    // Die fiktive Adresse ist nie ein Link.
    await expect(page.locator('a[href*="gutschein-sofort"]')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBe(0);
  });

  test('Rabattcode kopieren: Zwischenablage und Rückmeldung «Kopiert»', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(URL);
    await ready(page);
    await page.keyboard.press('Shift');
    const button = page.getByRole('button', { name: 'LAYER8 kopieren' });
    await button.click();
    await expect(page.locator('[data-copy-status]')).toHaveText('Kopiert');
    await expect(page.locator('[data-copy-status]')).toHaveAttribute('aria-live', 'polite');
    // Der zugängliche Name wechselt für drei Sekunden auf «LAYER8 Kopiert».
    await expect(page.locator('[data-copy]')).toContainText('Kopiert');
    expect(await page.evaluate(() => navigator.clipboard.readText())).toBe('LAYER8');
  });

  test('Rabattcode kopieren: Rückfall ohne Clipboard API', async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, 'clipboard', { value: undefined, configurable: true });
      document.addEventListener('copy', () => {
        (window as unknown as { copied: string }).copied = String(window.getSelection());
      });
    });
    await page.goto(URL);
    await ready(page);
    await page.keyboard.press('Shift');
    await page.locator('[data-copy]').click();
    await expect(page.locator('[data-copy-status]')).toHaveText('Kopiert');
    expect(
      (await page.evaluate(() => (window as unknown as { copied: string }).copied)).trim(),
    ).toBe('LAYER8');
  });

  test('ohne JavaScript: sofort die Auflösung, beide Beispiele sichtbar', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    await page.goto(URL);
    await expect(page.locator('[data-teaser]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erwischt!');
    await expect(page.locator('[data-reader-panel="echt"]')).toBeVisible();
    await expect(page.locator('[data-reader-panel="faelschung"]')).toBeVisible();
    await expect(page.locator('.reader-switch')).toBeHidden();
    await expect(page.locator('[data-copy-code]')).toHaveText('LAYER8');
    await context.close();
  });

  test('reduzierte Bewegung: kein Teaser, kein Glitch', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(URL, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('[data-teaser]')).toBeHidden();
    await expect(page.locator('[data-glitch]')).toBeHidden();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Erwischt!');
    await context.close();
  });

  test('schmaler Bildschirm (320 px): nichts läuft über', async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width: 320, height: 640 } });
    const page = await context.newPage();
    await page.goto(URL);
    await ready(page);
    await page.keyboard.press('Shift');
    expect(await horizontalOverflow(page)).toBe(0);
    expect(await cutOff(page)).toEqual([]);
    await page.getByRole('button', { name: 'Fälschung' }).click();
    expect(await horizontalOverflow(page)).toBe(0);
    expect(await cutOff(page)).toEqual([]);

    // Die angeklickte Adresse bleibt in ihrer Spalte und bricht nur vor dem Pfad um.
    const [box, column] = await Promise.all([
      page.locator('.sp-url').boundingBox(),
      page.locator('.sp-clicked').boundingBox(),
    ]);
    expect(box!.x + box!.width).toBeLessThanOrEqual(column!.x + column!.width + 0.5);
    await expect(page.locator('.sp-url')).toHaveText(
      /https:\/\/surprise\.\s*psyber\.tech\s*\/gewinn/,
    );
    // Der Rabattcode bleibt in der Angebotskarte.
    const [code, offer] = await Promise.all([
      page.locator('.code').boundingBox(),
      page.locator('.offer').boundingBox(),
    ]);
    expect(code!.x + code!.width).toBeLessThanOrEqual(offer!.x + offer!.width);
    await context.close();
  });

  for (const state of ['Echt', 'Fälschung'] as const) {
    test(`Barrierefreiheit (axe, WCAG 2.2 AA): Beispiel «${state}»`, async ({ browser }) => {
      // Statischer Endzustand: so prüft axe die Kontraste der fertigen Seite.
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(URL);
      await ready(page);
      await page.getByRole('button', { name: state, exact: true }).click();
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
        })),
      ).toEqual([]);
      await context.close();
    });
  }
});
