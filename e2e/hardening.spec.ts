import { expect, test } from '@playwright/test';
import { FORMS, SURPRISE, WEB } from '../playwright.config.ts';
import {
  API,
  brokenWords,
  collectErrors,
  cutOff,
  horizontalOverflow,
  layOutAll,
  mockApi,
} from './helpers.ts';

/**
 * Härtung (Auftrag, Abschnitt 9): Diese Prüfungen laufen über alle Seiten der drei Websites.
 */
const PAGES = [
  { name: 'web /', url: `${WEB}/`, origin: WEB },
  { name: 'web /checkliste', url: `${WEB}/checkliste`, origin: WEB },
  { name: 'web /impressum', url: `${WEB}/impressum`, origin: WEB },
  { name: 'web /datenschutz', url: `${WEB}/datenschutz`, origin: WEB },
  { name: 'web /styleguide', url: `${WEB}/styleguide`, origin: WEB },
  { name: 'web 404', url: `${WEB}/gibt-es-nicht`, origin: WEB },
  { name: 'forms /', url: `${FORMS}/`, origin: FORMS },
  { name: 'forms 404', url: `${FORMS}/gibt-es-nicht`, origin: FORMS },
  { name: 'surprise /gewinn', url: `${SURPRISE}/gewinn?ref=umfrage&s=3`, origin: SURPRISE },
  { name: 'surprise 404', url: `${SURPRISE}/gibt-es-nicht`, origin: SURPRISE },
] as const;

const FAKE_DOMAINS = [
  'paket-zustellung-ch.info',
  'karten-sicherheit-ch.com',
  'gutschein-sofort.ch',
];

for (const entry of PAGES) {
  test.describe(entry.name, () => {
    test('keine Requests an Dritte, keine Cookies, keine Konsolenfehler', async ({
      page,
      context,
    }) => {
      const errors = collectErrors(page);
      await mockApi(page);
      const foreign: string[] = [];
      page.on('request', (request) => {
        const url = request.url();
        if (url.startsWith(entry.origin) || url.startsWith(API) || url.startsWith('data:')) return;
        foreign.push(url);
      });
      const response = await page.goto(entry.url, { waitUntil: 'networkidle' });
      expect(response?.status()).toBe(entry.name.endsWith('404') ? 404 : 200);

      // Bis ganz nach unten scrollen: alles, was erst bei Bedarf lädt, lädt jetzt.
      await page.evaluate(async () => {
        const step = window.innerHeight;
        for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
          window.scrollTo(0, y);
          await new Promise((resolve) => setTimeout(resolve, 60));
        }
      });
      await page.waitForLoadState('networkidle');

      expect(foreign).toEqual([]);
      expect(await context.cookies()).toEqual([]);
      expect(await page.evaluate(() => document.cookie)).toBe('');
      // Auf der 404-Seite meldet der Browser den Status der Seite selbst; das ist gewollt.
      const expected = entry.name.endsWith('404') ? /status of 404/ : null;
      expect(errors.filter((error) => !expected?.test(error))).toEqual([]);
    });

    for (const reducedMotion of ['no-preference', 'reduce'] as const) {
      test(`kein horizontales Scrollen (Bewegung: ${reducedMotion})`, async ({
        browser,
      }, testInfo) => {
        // Beide Modi prüfen: Bei reduzierter Bewegung sind andere Zustände sichtbar.
        const context = await browser.newContext({ ...testInfo.project.use, reducedMotion });
        const page = await context.newPage();
        await mockApi(page);
        await page.goto(entry.url, { waitUntil: 'networkidle' });
        await layOutAll(page);
        await page.waitForTimeout(300);
        expect(await horizontalOverflow(page)).toBe(0);
        await context.close();
      });
    }

    test('nichts ragt über den Bildrand, kein Wort bricht mittendrin um (320 bis 1920 px)', async ({
      browser,
    }, testInfo) => {
      test.skip(testInfo.project.name !== 'desktop', 'Die Breiten setzt dieser Test selbst.');
      // Reduzierte Bewegung: Alles steht im Endzustand, nichts ist gerade unterwegs.
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await mockApi(page);
      await page.setViewportSize({ width: 1440, height: 900 });
      await page.goto(entry.url, { waitUntil: 'networkidle' });
      await layOutAll(page);
      await page.evaluate(() => document.fonts.ready);
      for (const width of [320, 360, 390, 600, 640, 768, 960, 1024, 1152, 1280, 1440, 1920]) {
        await page.setViewportSize({ width, height: 900 });
        await page.waitForTimeout(150);
        expect(await cutOff(page), `${width} px`).toEqual([]);
        expect(await brokenWords(page), `${width} px`).toEqual([]);
      }
      await context.close();
    });

    test('Struktur: Sprache, ein H1, lückenlose Überschriften, ein main', async ({ page }) => {
      await page.goto(entry.url);
      await expect(page.locator('html')).toHaveAttribute('lang', 'de-CH');
      await expect(page.locator('main')).toHaveCount(1);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page).toHaveTitle(/PSYber/);
      expect(
        (await page.locator('meta[name="description"]').getAttribute('content'))?.length,
      ).toBeGreaterThan(20);

      // Keine Stufe wird übersprungen (h2 → h4 wäre ein Fehler).
      const levels = await page.evaluate(() =>
        [...document.querySelectorAll('h1, h2, h3, h4, h5, h6')]
          .filter((heading) => heading.closest('[hidden], [aria-hidden="true"]') === null)
          .map((heading) => Number(heading.tagName.slice(1))),
      );
      expect(levels[0]).toBe(1);
      for (let index = 1; index < levels.length; index++) {
        const jump = (levels[index] ?? 0) - (levels[index - 1] ?? 0);
        expect(
          jump,
          `Überschrift ${index + 1} springt von h${levels[index - 1]} auf h${levels[index]}`,
        ).toBeLessThanOrEqual(1);
      }
    });

    test('Markup: keine Inline-Styles und -Handler, Bilder mit alt, sichere Links', async ({
      page,
    }) => {
      await page.goto(entry.url);
      const findings = await page.evaluate((fakeDomains) => {
        const problems: string[] = [];
        for (const element of document.querySelectorAll('*')) {
          for (const attribute of element.getAttributeNames()) {
            if (attribute.startsWith('on')) problems.push(`Inline-Handler ${attribute}`);
          }
        }
        for (const image of document.querySelectorAll('img')) {
          if (!image.hasAttribute('alt')) problems.push(`Bild ohne alt: ${image.src}`);
        }
        for (const link of document.querySelectorAll('a')) {
          const href = link.getAttribute('href') ?? '';
          if (/^\s*javascript:/i.test(href)) problems.push(`javascript:-Link`);
          if (link.target === '_blank' && !link.relList.contains('noopener')) {
            problems.push(`target=_blank ohne noopener: ${href}`);
          }
          if (fakeDomains.some((domain) => href.includes(domain))) {
            problems.push(`fiktive Adresse als Link: ${href}`);
          }
          if (!(link.textContent ?? '').trim() && !link.getAttribute('aria-label')) {
            problems.push(`Link ohne Namen: ${href}`);
          }
        }
        for (const button of document.querySelectorAll('button')) {
          if (!(button.textContent ?? '').trim() && !button.getAttribute('aria-label')) {
            problems.push('Button ohne Namen');
          }
        }
        return problems;
      }, FAKE_DOMAINS);
      expect(findings).toEqual([]);

      // Im ausgelieferten HTML steht kein style-Attribut (zur Laufzeit darf das Skript Werte
      // setzen). Inline-Skripte gibt es nur von Astro selbst (Island-Start), per Hash erlaubt:
      // Ein Skript ohne Hash würde der Browser blockieren und als Konsolenfehler melden.
      const html = await (await page.request.get(entry.url)).text();
      expect(/<[a-z][^>]*\sstyle=/i.test(html), 'style-Attribut im HTML').toBe(false);
    });

    test('Tastatur: das erste Element zeigt den Fokus-Ring in Acid', async ({ page, isMobile }) => {
      test.skip(isMobile, 'Fokus per Tabulator gibt es am Gerät mit Tastatur.');
      await page.goto(entry.url);
      await page.keyboard.press('Tab');
      const focus = await page.evaluate(() => {
        const element = document.activeElement;
        if (!element || element === document.body) return null;
        const style = getComputedStyle(element);
        return {
          tag: element.tagName,
          outline: `${style.outlineStyle} ${style.outlineWidth} ${style.outlineColor}`,
        };
      });
      expect(focus, 'Tab erreicht ein Element').not.toBeNull();
      // Überall derselbe Ring: 3 px Acid als Outline.
      const acid = 'rgb(201, 251, 82)';
      expect(focus?.outline, `Fokus-Stil: ${JSON.stringify(focus)}`).toBe(`solid 3px ${acid}`);
    });
  });
}
