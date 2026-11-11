import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { FORMS } from '../playwright.config.ts';
import { collectErrors, horizontalOverflow, mockApi } from './helpers.ts';
import { answerRequired, hydrated, next, option, progress, skipTo, tile } from './survey.ts';

test.describe('forms.psyber.tech', () => {
  test('Startscreen: Texte, Datenschutz-Hinweis, kein Menü', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(`${FORMS}/`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Wie sicher ist Ihre Familie online?',
    );
    await expect(page.getByText('Rund 4 Minuten. Anonym. Mit Gratis-Checkliste.')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Datenschutzerklärung' })).toHaveAttribute(
      'href',
      'https://psyber.tech/datenschutz',
    );
    await expect(page.getByRole('link', { name: /PSYber, zur Website/ })).toHaveAttribute(
      'href',
      'https://psyber.tech/',
    );
    await expect(page.getByRole('navigation')).toHaveCount(0);
    expect(await horizontalOverflow(page)).toBe(0);
    expect(errors).toEqual([]);
  });

  test('Umfrage komplett bis zum Danke-Screen mit beiden Links', async ({ page }) => {
    const errors = collectErrors(page);
    const calls = await mockApi(page);
    await page.goto(`${FORMS}/?quelle=instagram&fokus=vor`);
    await answerRequired(page);

    // Frage 8–10 überspringen, Frage 11 (Van Westendorp) ausfüllen
    await skipTo(page, 8, 11);
    await page.locator('#sv-q11-a').fill('500');
    await page.locator('#sv-q11-b').fill('400');
    await page.locator('#sv-q11-c').fill('600');
    await page.locator('#sv-q11-d').fill('900');
    await next(page).click();
    await expect(page.getByText('Die Beträge sollten von oben nach unten steigen.')).toBeVisible();
    await page.locator('#sv-q11-a').fill('200');
    await next(page).click();
    await expect(progress(page)).toHaveText('12 / 16');

    await option(page, 'CHF 15–24').click();
    await expect(progress(page)).toHaveText('13 / 16');
    await skipTo(page, 13, 14);

    // Frage 14: höchstens zwei Antworten
    await option(page, 'Preis').click();
    await option(page, 'Datenschutz').click();
    await option(page, 'Vertrauen und Seriosität').click();
    await expect(page.getByText('Bitte wählen Sie höchstens zwei Antworten.')).toBeVisible();
    await expect(option(page, 'Vertrauen und Seriosität').locator('input')).not.toBeChecked();
    await next(page).click();
    await expect(progress(page)).toHaveText('15 / 16');

    await page.locator('#sv-q15').fill('Ich weiss nicht, mit wem mein Kind online chattet.');
    await next(page).click();
    await expect(progress(page)).toHaveText('16 / 16');

    // Frage 16: Founding Family erst mit gültiger E-Mail
    const founding = page.getByRole('checkbox', { name: /Founding Family/ });
    await expect(founding).toBeDisabled();
    await page.locator('#sv-email').fill('familie@example.ch');
    await expect(founding).toBeEnabled();
    await founding.check();
    await expect(next(page)).toHaveText('Absenden');
    await next(page).click();

    // Danke-Screen
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Ihre Schwerpunkte' })).toBeVisible();
    await expect(page.locator('.sv-tip')).toHaveCount(3);
    await expect(page.locator('.sv-tip').first()).toContainText('Phishing und Fake-SMS');

    const links = page.locator('.sv-download');
    await expect(links).toHaveCount(2);
    await expect(links.nth(0)).toHaveText(/Checkliste ‹5 Warnsignale› herunterladen/);
    await expect(links.nth(0)).toHaveAttribute(
      'href',
      'https://psyber.tech/checkliste?ref=umfrage',
    );
    await expect(links.nth(1)).toHaveText(
      /🎉 Glückwunsch, Sie wurden ausgewählt! Gratis-Session im Wert von CHF 250 – nur heute einlösbar/,
    );
    await expect(links.nth(1)).toHaveAttribute(
      'href',
      'https://surprise.psyber.tech/gewinn?ref=umfrage&s=4',
    );
    // Beide Links sind gleich gestaltet, ohne Hinweis auf den Test.
    expect(await links.nth(0).getAttribute('class')).toBe(await links.nth(1).getAttribute('class'));
    await expect(page.getByText(/Test|Phishing-Test/)).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Link teilen' })).toBeVisible();

    // Requests: einmal Start gezählt, einmal Antworten gesendet
    expect(calls.map((call) => call.path)).toEqual(['/v1/event', '/v1/survey']);
    expect(calls[0]?.body).toEqual({ event: 'survey_started' });
    expect(calls[1]?.body).toMatchObject({
      schemaVersion: 1,
      quelle: 'instagram',
      fokus: 'vor',
      answers: {
        q1: 'stadt_zh',
        q2: ['kinder_10_15', 'erwachsene'],
        q4: 4,
        q6: { phishing: 5, romance: 2, privatsphaere: 5 },
        q7: ['session_zuhause'],
        q11: { a: 200, b: 400, c: 600, d: 900 },
        q12: 'chf_15_24',
        q14: ['preis', 'datenschutz'],
        q15: 'Ich weiss nicht, mit wem mein Kind online chattet.',
      },
      waitlist: { email: 'familie@example.ch', foundingFamily: true },
    });
    const answers = (calls[1]?.body as { answers: Record<string, unknown> }).answers;
    expect(Object.keys(answers)).not.toContain('q3');

    // Zwischenstand gelöscht, localStorage nie benutzt
    const storage = await page.evaluate(() => ({
      session: Object.keys(window.sessionStorage),
      local: Object.keys(window.localStorage),
    }));
    expect(storage).toEqual({ session: [], local: [] });
    expect(errors).toEqual([]);
  });

  test('Tastatur: Enter, Buchstaben und Ziffern', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Tastenkürzel sind für Geräte mit Tastatur gedacht.');
    await mockApi(page);
    await page.goto(`${FORMS}/`);
    await hydrated(page);
    await page.keyboard.press('Enter'); // Los geht’s
    await expect(progress(page)).toHaveText('1 / 16');

    await page.keyboard.press('Enter'); // Pflichtfrage ohne Antwort
    await expect(page.getByText('Bitte wählen Sie eine Antwort aus.')).toBeVisible();
    await expect(progress(page)).toHaveText('1 / 16');

    await page.keyboard.press('b'); // Kanton Zürich, springt weiter
    await expect(progress(page)).toHaveText('2 / 16');
    await page.keyboard.press('a');
    await page.keyboard.press('d');
    await expect(option(page, 'Kinder bis 9').locator('input')).toBeChecked();
    await expect(option(page, 'Erwachsene').locator('input')).toBeChecked();
    await page.keyboard.press('a'); // wieder abwählen
    await expect(option(page, 'Kinder bis 9').locator('input')).not.toBeChecked();
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('3 / 16');

    // Freiwillig und unbeantwortet: «Überspringen»
    await expect(next(page)).toHaveText('Überspringen');
    await page.keyboard.press('c');
    await expect(progress(page)).toHaveText('4 / 16');

    await page.keyboard.press('2'); // Skala
    await expect(progress(page)).toHaveText('5 / 16');
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('6 / 16');

    // Matrix: sechs Ziffern füllen die Zeilen der Reihe nach
    for (const digit of ['5', '4', '3', '2', '1', '5']) await page.keyboard.press(digit);
    await expect(tile(page, 5, 'phishing').locator('input')).toBeChecked();
    await expect(tile(page, 1, 'heimnetz').locator('input')).toBeChecked();
    await expect(tile(page, 5, 'privatsphaere').locator('input')).toBeChecked();
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('7 / 16');

    // Zurück behält die Antworten
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(progress(page)).toHaveText('6 / 16');
    await expect(tile(page, 4, 'anlagebetrug').locator('input')).toBeChecked();
  });

  test('Sprunglogik: ohne Abo-Interesse entfällt Frage 13', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${FORMS}/`);
    await answerRequired(page);
    await skipTo(page, 8, 12);
    await option(page, 'Würde ich nicht buchen').click();
    await expect(progress(page)).toHaveText('13 / 15');
    await expect(page.getByRole('heading', { level: 2 })).toHaveText(
      'Was ist Ihnen bei so einem Angebot am wichtigsten?',
    );
    await skipTo(page, 13, 15, 15);
    await next(page).click();
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();

    const survey = calls.find((call) => call.path === '/v1/survey');
    expect(survey?.body).toMatchObject({ quelle: 'direkt', answers: { q12: 'nicht_buchen' } });
    const body = survey?.body as { answers: Record<string, unknown>; fokus?: string };
    expect(body.answers).not.toHaveProperty('q13');
    expect(body).not.toHaveProperty('fokus');
    expect(body).not.toHaveProperty('waitlist');
  });

  test('Zwischenstand überlebt ein Neuladen, unbekannte Quelle wird «andere»', async ({ page }) => {
    const calls = await mockApi(page);
    await page.goto(`${FORMS}/?quelle=newsletter`);
    await hydrated(page);
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await option(page, 'Stadt Zürich').click();
    await expect(progress(page)).toHaveText('2 / 16');
    await option(page, 'Personen ab 65').click();

    await page.reload();
    await expect(progress(page)).toHaveText('2 / 16');
    await expect(option(page, 'Personen ab 65').locator('input')).toBeChecked();

    // Neu laden zählt den Start nicht doppelt.
    expect(calls.filter((call) => call.path === '/v1/event')).toHaveLength(1);

    const stored = await page.evaluate(() => window.sessionStorage.getItem('psyber:umfrage:v1'));
    expect(JSON.parse(stored ?? '{}')).toMatchObject({ quelle: 'andere', position: 1 });
    expect(await page.evaluate(() => Object.keys(window.localStorage))).toEqual([]);
  });

  test('Fehler beim Senden: Meldung, «Erneut senden», Antworten bleiben', async ({ page }) => {
    let fail = true;
    await page.route('https://api.psyber.tech/**', async (route) => {
      const request = route.request();
      const headers = { 'Access-Control-Allow-Origin': '*' };
      if (request.method() === 'OPTIONS') {
        await route.fulfill({
          status: 204,
          headers: { ...headers, 'Access-Control-Allow-Headers': 'content-type' },
        });
        return;
      }
      const failing = fail && request.url().endsWith('/v1/survey');
      await route.fulfill({
        status: failing ? 500 : 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(failing ? { error: 'internal' } : { ok: true }),
      });
    });
    await page.goto(`${FORMS}/`);
    await answerRequired(page);
    await skipTo(page, 8, 16);
    await next(page).click();

    await expect(page.getByRole('alert')).toContainText(
      'Ihre Antworten konnten nicht gesendet werden. Bitte versuchen Sie es nochmals.',
    );
    await expect(next(page)).toHaveText('Erneut senden');
    expect(
      await page.evaluate(() => window.sessionStorage.getItem('psyber:umfrage:v1')),
    ).not.toBeNull();

    fail = false;
    await next(page).click();
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();
  });

  test('Barrierefreiheit (axe, WCAG 2.2 AA): Start, Frage, Matrix, Danke', async ({ browser }) => {
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await mockApi(page);
    const scan = async (name: string) => {
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        results.violations.map((violation) => ({
          id: violation.id,
          nodes: violation.nodes.map((node) => node.target.join(' ')).slice(0, 5),
        })),
        name,
      ).toEqual([]);
    };

    await page.goto(`${FORMS}/`);
    await hydrated(page);
    await scan('Start');
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expect(progress(page)).toHaveText('1 / 16');
    await scan('Frage 1');
    await page.goto(`${FORMS}/`);
    await page.evaluate(() => window.sessionStorage.clear());
    await page.reload();
    await answerRequired(page);
    await page.getByRole('button', { name: 'Zurück' }).click();
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(progress(page)).toHaveText('6 / 16');
    await scan('Frage 6 (Matrix)');
    await next(page).click();
    await next(page).click();
    await skipTo(page, 8, 16);
    await scan('Frage 16 (Warteliste)');
    await next(page).click();
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();
    await scan('Danke');
    await context.close();
  });
});
