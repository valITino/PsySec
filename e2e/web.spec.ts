import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { WEB } from '../playwright.config.ts';
import { collectErrors, horizontalOverflow, mockApi } from './helpers.ts';

/** Wartet, bis das Skript der Startseite gelaufen ist (der Simulator meldet sich bereit). */
const ready = (page: Page) => page.locator('[data-sim][data-ready]').waitFor();

test.describe('psyber.tech', () => {
  test('Startseite lädt ohne Fehler, ohne Preise und ohne horizontales Scrollen', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    await page.goto(`${WEB}/`);
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Ein Klick zu viel?');
    await expect(page.getByRole('link', { name: 'Zur Umfrage' }).first()).toHaveAttribute(
      'href',
      'https://forms.psyber.tech/?quelle=website',
    );
    expect(await horizontalOverflow(page)).toBe(0);

    // Phase «survey»: Preise dürfen nicht einmal im Quelltext stehen.
    const html = await page.content();
    for (const price of ['CHF 190', 'CHF 490', 'CHF 29', 'CHF 79', '190–250', '490–690']) {
      expect(html, `Preis «${price}» im HTML`).not.toContain(price);
    }
    await expect(page.getByText('Preise folgen nach der Pilotphase.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('fiktive Adressen sind nie klickbare Links', async ({ page }) => {
    await page.goto(`${WEB}/`);
    for (const domain of ['paket-zustellung-ch.info', 'karten-sicherheit-ch.com']) {
      await expect(page.locator(`a[href*="${domain}"]`)).toHaveCount(0);
    }
  });

  test('mobiles Menü: öffnet, hält den Fokus, schliesst mit Esc', async ({ page, isMobile }) => {
    test.skip(!isMobile, 'Das Vollbild-Menü gibt es nur auf schmalen Bildschirmen.');
    await page.goto(`${WEB}/`);
    await ready(page);
    const toggle = page.getByRole('button', { name: 'Menü' });
    await toggle.click();

    const close = page.getByRole('button', { name: 'Schliessen' });
    await expect(close).toHaveAttribute('aria-expanded', 'true');
    const menu = page.locator('#mobile-menu');
    await expect(menu).toBeVisible();
    await expect(menu.getByRole('link', { name: /Kontakt/ })).toBeVisible();
    await expect(menu.getByText('[TODO: E-Mail]')).toBeVisible();

    // Fokus bleibt im Menü: auch nach vielen Tabs liegt er im Header.
    for (let index = 0; index < 14; index++) await page.keyboard.press('Tab');
    expect(
      await page.evaluate(() => document.activeElement?.closest('[data-header]') !== null),
    ).toBe(true);
    expect(await page.evaluate(() => document.querySelector('main')?.inert)).toBe(true);

    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(page.getByRole('button', { name: 'Menü' })).toBeFocused();
    expect(await page.evaluate(() => document.querySelector('main')?.inert)).toBe(false);
  });

  test('Klick-Simulator lässt sich per Tastatur bedienen', async ({ page }) => {
    await page.goto(`${WEB}/`);
    await ready(page);
    const range = page.getByLabel('Ziehen zum Abspielen');
    await range.focus();

    await page.keyboard.press('End');
    await expect(range).toHaveAttribute('aria-valuetext', /Schritt 2 von 2: Technik/);
    await expect(page.getByText('Diese Seite ist nicht erreichbar')).toBeVisible();
    await expect(page.getByRole('button', { name: /Schritt 2/ })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    await page.keyboard.press('Home');
    await expect(range).toHaveAttribute('aria-valuetext', /Schritt 1 von 2: Psychologie/);

    await page.getByRole('button', { name: /Schritt 1/ }).press('Enter');
    await expect(range).toHaveAttribute('aria-valuetext', /3 Warnsignale erkannt/, {
      timeout: 6000,
    });
    await expect(page.getByText('3 Warnsignale erkannt. Nicht klicken.')).toBeVisible();

    // Uhrzeit in Zürich statt Platzhalter
    await expect(page.locator('[data-sim-time]')).toHaveText(/^\d{2}:\d{2}$/);
  });

  test('Kontaktformular: Inline-Validierung, dann Versand mit Erfolgsmeldung', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${WEB}/?ref=surprise#kontakt`);
    const submit = page.getByRole('button', { name: 'Anfrage senden' });
    await submit.scrollIntoViewIfNeeded();

    // ?ref=surprise wählt «Familien-Session» vor
    await expect(page.getByLabel('Familien-Session')).toBeChecked();

    await submit.click();
    await expect(page.getByText('Bitte geben Sie Ihren Namen ein.')).toBeVisible();
    await expect(page.getByText('Bitte geben Sie eine gültige E-Mail-Adresse ein.')).toBeVisible();
    await expect(page.getByText('Bitte geben Sie PLZ und Ort ein.')).toBeVisible();
    const name = page.getByLabel('Name');
    await expect(name).toBeFocused();
    await expect(name).toHaveAttribute('aria-invalid', 'true');
    await expect(name).toHaveAttribute('aria-describedby', /kontakt-name-error/);
    expect(calls).toHaveLength(0);

    await name.fill('Familie Muster');
    await expect(page.getByText('Bitte geben Sie Ihren Namen ein.')).toBeHidden();
    await page.getByLabel('E-Mail').fill('familie@example.ch');
    await page.getByLabel('PLZ und Ort').fill('8000 Zürich');
    await page
      .getByRole('textbox', { name: /Nachricht/ })
      .fill('Wir haben drei Kinder und viele Geräte.');
    await page.getByLabel(/Datenschutzerklärung/).check();
    await submit.click();

    await expect(
      page.getByText('Danke! Wir melden uns innert zwei Arbeitstagen', { exact: false }),
    ).toBeVisible();
    expect(calls).toHaveLength(1);
    expect(calls[0]?.path).toBe('/v1/contact');
    expect(calls[0]?.body).toMatchObject({
      name: 'Familie Muster',
      email: 'familie@example.ch',
      plzOrt: '8000 Zürich',
      interesse: 'familien_session',
      datenschutz: true,
      ref: 'surprise',
    });
  });

  test('Kontaktformular: Fehlermeldung, Eingaben bleiben erhalten', async ({ page }) => {
    await mockApi(page, 500);
    await page.goto(`${WEB}/#kontakt`);
    const submit = page.getByRole('button', { name: 'Anfrage senden' });
    await submit.scrollIntoViewIfNeeded();
    await page.getByLabel('Name').fill('Familie Muster');
    await page.getByLabel('E-Mail').fill('familie@example.ch');
    await page.getByLabel('PLZ und Ort').fill('8000 Zürich');
    await page.getByLabel('LAN-Party').check();
    await page.getByLabel(/Datenschutzerklärung/).check();
    await submit.click();

    await expect(page.getByRole('alert')).toContainText('Das hat nicht geklappt.');
    await expect(page.getByLabel('Name')).toHaveValue('Familie Muster');
    await expect(submit).toBeEnabled();
  });

  test('«Der erste Schritt» gibt die Auswahl als fokus an die Umfrage weiter', async ({ page }) => {
    await page.goto(`${WEB}/`);
    await ready(page);
    const cta = page.getByRole('link', { name: 'Umfrage starten' });
    await expect(cta).toHaveAttribute('href', 'https://forms.psyber.tech/?quelle=website');
    await page.getByRole('radio', { name: /Nach dem Klick/ }).check({ force: true });
    await expect(cta).toHaveAttribute(
      'href',
      'https://forms.psyber.tech/?quelle=website&fokus=nach',
    );
  });

  test('Checkliste: P.S. und Zähler nur mit ?ref=umfrage', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${WEB}/checkliste`);
    await expect(
      page.getByRole('heading', { level: 1, name: '5 Warnsignale für Online-Betrug' }),
    ).toBeVisible();
    await expect(page.getByText('Er war ein Test.', { exact: false })).toBeHidden();
    expect(calls).toHaveLength(0);

    await page.goto(`${WEB}/checkliste?ref=umfrage`);
    await expect(page.getByText('Er war ein Test.', { exact: false })).toBeVisible();
    await expect.poll(() => calls.length).toBe(1);
    expect(calls[0]).toEqual({ path: '/v1/event', body: { event: 'checklist_click' } });

    // Neu laden zählt nicht doppelt.
    await page.reload();
    await expect(page.getByText('Er war ein Test.', { exact: false })).toBeVisible();
    expect(calls).toHaveLength(1);
  });

  test('404, security.txt und Rechtliches', async ({ page, request }) => {
    const response = await page.goto(`${WEB}/gibt-es-nicht`);
    expect(response?.status()).toBe(404);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      '404 – Layer 8 nicht gefunden.',
    );
    await expect(page.getByText('ping: Seite nicht gefunden')).toBeVisible();

    const security = await request.get(`${WEB}/.well-known/security.txt`);
    expect(security.ok()).toBe(true);
    const text = await security.text();
    expect(text).toContain('Contact: mailto:security@psyber.tech');
    expect(text).toMatch(/Expires: \d{4}-\d{2}-\d{2}T00:00:00Z/);
    expect(text).toContain('Canonical: https://psyber.tech/.well-known/security.txt');

    for (const path of ['/impressum', '/datenschutz']) {
      await page.goto(`${WEB}${path}`);
      await expect(page.getByText('Entwurf, rechtlich prüfen lassen.')).toBeVisible();
    }
  });

  for (const path of ['/', '/checkliste', '/datenschutz']) {
    test(`Barrierefreiheit (axe, WCAG 2.2 AA): ${path}`, async ({ browser }) => {
      // Statischer Endzustand: so prüft axe die Kontraste der fertigen Seite.
      const context = await browser.newContext({ reducedMotion: 'reduce' });
      const page = await context.newPage();
      await page.goto(`${WEB}${path}`);
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
