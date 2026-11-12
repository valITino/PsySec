import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { FORMS } from '../playwright.config.ts';
import { collectErrors, cutOff, horizontalOverflow, mockApi } from './helpers.ts';
import {
  answerRequired,
  atQuestion,
  hydrated,
  next,
  option,
  progress,
  skipTo,
  tile,
} from './survey.ts';

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
    // Ein Satz kündigt an, dass es nach der Auswahl von selbst weitergeht.
    await expect(page.getByText('Oft genügt es, die Antwort anzutippen')).toBeVisible();
    // Der Hinweis «lädt noch» gilt nur, solange die Umfrage nicht bedienbar ist.
    await hydrated(page);
    await expect(page.locator('.sv-stuck')).toBeHidden();
    expect(await horizontalOverflow(page)).toBe(0);
    expect(await cutOff(page)).toEqual([]);
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
    await atQuestion(page, '12 / 16');

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
    await atQuestion(page, '16 / 16');

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
    await expect(links.nth(0)).toHaveText(/Checkliste «5 Warnsignale» herunterladen/);
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

    // Zwischenstand gelöscht, localStorage nie benutzt. Es bleibt nur der Merker für den
    // Danke-Screen: Selbsteinschätzung und die gezeigten Schwerpunkte, keine weiteren Antworten.
    const storage = await page.evaluate(() => ({
      session: Object.keys(window.sessionStorage),
      marker: JSON.parse(window.sessionStorage.getItem('psyber:umfrage:fertig') ?? 'null'),
      local: Object.keys(window.localStorage),
    }));
    expect(storage).toEqual({
      session: ['psyber:umfrage:fertig'],
      marker: { s: 4, q6: { phishing: 5, anlagebetrug: 5, cybermobbing: 5 } },
      local: [],
    });
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
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
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
    await atQuestion(page, '1 / 16');
    await option(page, 'Stadt Zürich').click();
    await atQuestion(page, '2 / 16');
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

  /** API, die Einsendungen der Umfrage scheitern lässt, solange `state.fail` gesetzt ist. */
  const flakyApi = async (page: Page) => {
    const state = { fail: true, bodies: [] as { submissionId?: string; quelle?: string }[] };
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
      const survey = request.url().endsWith('/v1/survey');
      if (survey) state.bodies.push(request.postDataJSON() as (typeof state.bodies)[number]);
      const failing = state.fail && survey;
      await route.fulfill({
        status: failing ? 500 : 200,
        contentType: 'application/json',
        headers,
        body: JSON.stringify(failing ? { error: 'internal' } : { ok: true }),
      });
    });
    return state;
  };
  const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

  test('Fehler beim Senden: Meldung, «Erneut senden», Antworten bleiben', async ({ page }) => {
    const api = await flakyApi(page);
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

    api.fail = false;
    await next(page).click();
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();

    // Beide Versuche tragen dieselbe zufällige Kennung: Die API legt so nichts doppelt an.
    expect(api.bodies).toHaveLength(2);
    expect(api.bodies[0]?.submissionId).toMatch(UUID);
    expect(api.bodies[1]?.submissionId).toBe(api.bodies[0]?.submissionId);
  });

  test('Neu laden vor dem zweiten Versuch: Quelle «direkt» und Kennung bleiben', async ({
    page,
  }) => {
    const api = await flakyApi(page);
    // Ohne ?quelle= in der Adresse gilt die Quelle «direkt».
    await page.goto(`${FORMS}/`);
    await answerRequired(page);
    await skipTo(page, 8, 16);
    await next(page).click();
    await expect(page.getByRole('alert')).toBeVisible();

    await page.reload();
    await hydrated(page);
    await expect(progress(page)).toHaveText('16 / 16');
    api.fail = false;
    await next(page).click();
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();

    expect(api.bodies.map((body) => body.quelle)).toEqual(['direkt', 'direkt']);
    expect(api.bodies[0]?.submissionId).toMatch(UUID);
    expect(api.bodies[1]?.submissionId).toBe(api.bodies[0]?.submissionId);
    // Nach dem Absenden ist der Zwischenstand weg, eine neue Umfrage bekäme eine neue Kennung.
    expect(
      await page.evaluate(() => window.sessionStorage.getItem('psyber:umfrage:v1')),
    ).toBeNull();
  });

  // ------------------------------------------------------------------ Bedienung im Detail

  const REQUIRED = {
    q1: 'stadt_zh',
    q2: ['erwachsene'],
    q4: 3,
    q6: {
      phishing: 3,
      anlagebetrug: 3,
      romance: 3,
      cybermobbing: 3,
      heimnetz: 3,
      privatsphaere: 3,
    },
    q7: ['webinar'],
  };

  /** Setzt einen Zwischenstand: Der Test beginnt so direkt bei einer bestimmten Frage. */
  const openAt = async (
    page: Page,
    position: number,
    answers: Record<string, unknown> = {},
  ): Promise<void> => {
    await page.goto(`${FORMS}/`);
    await page.evaluate(
      (stored) => window.sessionStorage.setItem('psyber:umfrage:v1', stored),
      JSON.stringify({
        draft: {
          answers: { ...REQUIRED, ...answers },
          q11: { a: '', b: '', c: '', d: '' },
          waitlist: { email: '', foundingFamily: false },
        },
        position,
        quelle: 'website',
      }),
    );
    await page.reload();
    await hydrated(page);
    await expect(progress(page)).toHaveText(new RegExp(`^${position + 1} / `));
    // Kurz nach dem Wechsel der Frage zählen Klicks nicht.
    await page.waitForTimeout(450);
  };

  /** Lage eines Elements im Fenster */
  const box = async (page: Page, selector: string) =>
    page.locator(selector).evaluate((element) => {
      const rect = element.getBoundingClientRect();
      return { top: rect.top, bottom: rect.bottom, left: rect.left, right: rect.right };
    });

  test('Hinweis steht in der Leiste über den Buttons und ist immer im Bild', async ({ page }) => {
    await mockApi(page);
    // Frage 6 ist höher als der Bildschirm; zwei Zeilen fehlen noch.
    await openAt(page, 5, { q6: { phishing: 3, anlagebetrug: 3, romance: 3, cybermobbing: 3 } });
    await next(page).click();
    const hint = page.locator('.sv-hint');
    await expect(hint).toHaveText('Bitte bewerten Sie jedes Thema.');
    await expect(hint).toBeInViewport({ ratio: 1 });
    const [message, nav] = await Promise.all([box(page, '.sv-hint'), box(page, '.sv-nav')]);
    expect(message.bottom).toBeLessThanOrEqual(nav.top);
    expect(message.top).toBeGreaterThan(nav.top - 80);

    // Derselbe Hinweis nochmals: Er wird neu eingefügt, damit Screenreader ihn wieder vorlesen.
    await hint.evaluate((element) => element.setAttribute('data-alt', ''));
    await next(page).click();
    await expect(page.locator('.sv-hint')).not.toHaveAttribute('data-alt');
    await expect(page.locator('.sv-hint')).toHaveText('Bitte bewerten Sie jedes Thema.');
  });

  test('niedriges Fenster: Antworten laufen unter der Leiste durch, der Fokus bleibt sichtbar', async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Fenstergrösse eines kleinen Laptops.');
    const context = await browser.newContext({ viewport: { width: 1366, height: 650 } });
    const page = await context.newPage();
    await mockApi(page);
    await openAt(page, 9); // Frage 10: sieben Optionen, höher als das Fenster

    // Die Leiste hat auf jeder Breite einen Grund, der bis an beide Ränder reicht.
    const ground = await page.locator('.sv-foot').evaluate((element) => {
      const style = getComputedStyle(element, '::before');
      return { color: style.backgroundColor, width: parseFloat(style.width) };
    });
    expect(ground.color).toMatch(/^rgba\(8, 8, 11, 0\.9\)$/);
    expect(ground.width).toBeGreaterThanOrEqual(1350);

    // Mit den Pfeiltasten durch alle Optionen: Die fokussierte steht nie hinter Kopf oder Leiste.
    await page.locator('.sv-option input').first().focus();
    for (let index = 0; index < 7; index++) {
      if (index > 0) await page.keyboard.press('ArrowDown');
      const rects = await page.evaluate(() => {
        const rect = (element: Element | null | undefined) => element?.getBoundingClientRect();
        const option = rect(document.activeElement?.closest('.sv-option'));
        return {
          top: option?.top ?? -1,
          bottom: option?.bottom ?? -1,
          header: rect(document.querySelector('.sv-header'))?.bottom ?? 0,
          foot: rect(document.querySelector('.sv-foot'))?.top ?? 0,
        };
      });
      expect(rects.top, `Option ${index + 1} oben`).toBeGreaterThanOrEqual(rects.header);
      expect(rects.bottom, `Option ${index + 1} unten`).toBeLessThanOrEqual(rects.foot);
    }
    // Pfeiltasten wählen nur aus, sie springen nicht weiter.
    await expect(progress(page)).toHaveText('10 / 16');
    await context.close();
  });

  test('Startscreen: «Los geht’s» steht auch im niedrigen Fenster im Bild', async ({
    browser,
  }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'Fenstergrössen setzt dieser Test selbst.');
    for (const viewport of [
      { width: 1366, height: 650 },
      { width: 1024, height: 600 },
      { width: 844, height: 390 },
    ]) {
      const context = await browser.newContext({ viewport });
      const page = await context.newPage();
      await page.goto(`${FORMS}/`);
      await hydrated(page);
      await expect(
        page.getByRole('button', { name: 'Los geht’s' }),
        `${viewport.width}×${viewport.height}`,
      ).toBeInViewport({ ratio: 1 });
      await context.close();
    }
  });

  test('schmale Handys (320 px): «Überspringen» passt, «Zurück» zeigt nur den Pfeil', async ({
    browser,
  }) => {
    const context = await browser.newContext({
      viewport: { width: 320, height: 568 },
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();
    await mockApi(page);
    await openAt(page, 2); // Frage 3 ist freiwillig
    await expect(next(page)).toHaveText('Überspringen');
    const [forward, back] = await Promise.all([box(page, '.sv-next'), box(page, '.sv-back')]);
    expect(forward.right).toBeLessThanOrEqual(300);
    expect(back.right - back.left).toBeLessThan(60);
    expect(forward.top).toBe(back.top); // beide in einer Zeile
    // Der Name bleibt für Screenreader erhalten.
    await expect(page.getByRole('button', { name: 'Zurück' })).toBeVisible();
    expect(await cutOff(page)).toEqual([]);
    await context.close();
  });

  test('eine gehaltene Taste zählt nur einmal', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Tastenkürzel sind für Geräte mit Tastatur gedacht.');
    const calls = await mockApi(page);
    await openAt(page, 7); // ab Frage 8 ist alles freiwillig
    // Enter gehalten: Der Browser wiederholt die Taste; früher blätterte das bis zum Absenden.
    for (let repeat = 0; repeat < 12; repeat++) await page.keyboard.down('Enter');
    await page.keyboard.up('Enter');
    await expect(progress(page)).toHaveText('9 / 16');
    expect(calls.filter((call) => call.path === '/v1/survey')).toEqual([]);

    // Eine gehaltene Ziffer füllt in der Matrix nur eine Zeile.
    await openAt(page, 5, { q6: undefined });
    for (let repeat = 0; repeat < 6; repeat++) await page.keyboard.down('3');
    await page.keyboard.up('3');
    await expect(tile(page, 3, 'phishing').locator('input')).toBeChecked();
    await expect(page.locator('.sv-matrix input:checked')).toHaveCount(1);
  });

  test('letzte Frage: Enter im E-Mail-Feld sendet nicht ab', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Reihenfolge des Fokus mit der Tastatur.');
    const calls = await mockApi(page);
    await openAt(page, 15);
    const sent = () => calls.filter((call) => call.path === '/v1/survey');

    // Leeres Feld: Enter führt zu «Absenden», sendet aber noch nicht.
    await page.locator('#sv-email').focus();
    await page.keyboard.press('Enter');
    await expect(next(page)).toBeFocused();
    expect(sent()).toEqual([]);

    // Mit Adresse: Enter führt zum Häkchen «Founding Family», das erst jetzt wählbar ist.
    await page.locator('#sv-email').fill('familie@example.ch');
    await page.keyboard.press('Enter');
    const founding = page.getByRole('checkbox', { name: /Founding Family/ });
    await expect(founding).toBeFocused();
    expect(sent()).toEqual([]);
    await page.keyboard.press('Space');
    await expect(founding).toBeChecked();

    // Erst das zweite Enter sendet ab.
    await page.keyboard.press('Enter');
    await expect(
      page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' }),
    ).toBeVisible();
    expect(sent()).toHaveLength(1);
    expect(sent()[0]?.body).toMatchObject({
      waitlist: { email: 'familie@example.ch', foundingFamily: true },
    });
  });

  test('ein zweiter Klick trifft nach dem Weiterspringen nicht die nächste Frage', async ({
    page,
  }) => {
    await mockApi(page);
    await openAt(page, 7); // Frage 8 und 9 sind beides Skalen: gleiche Kacheln an gleicher Stelle
    const spot = await tile(page, 4).boundingBox();
    const x = spot!.x + spot!.width / 2;
    const y = spot!.y + spot!.height / 2;

    await page.mouse.click(x, y);
    await expect(progress(page)).toHaveText('9 / 16'); // springt nach 280 ms weiter
    await page.mouse.click(x, y); // zweiter Klick eines langsamen Doppelklicks
    await page.waitForTimeout(600);
    await expect(progress(page)).toHaveText('9 / 16');
    await expect(page.locator('.sv-tile input:checked')).toHaveCount(0);

    // Danach nimmt die Frage Klicks ganz normal an.
    await tile(page, 2).click();
    await expect(progress(page)).toHaveText('10 / 16');
  });

  test('Tastenkürzel gelten nur, solange der Fokus in der Frage steht', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Tastenkürzel sind für Geräte mit Tastatur gedacht.');
    await mockApi(page);
    await openAt(page, 0, { q1: undefined });

    await page.locator('.sv-back').focus();
    await page.keyboard.press('b');
    await page.waitForTimeout(400);
    await expect(progress(page)).toHaveText('1 / 16');
    await expect(page.locator('.sv-option input:checked')).toHaveCount(0);

    // Ein Klick irgendwo in die Frage holt den Fokus zurück: Jetzt wirkt das Kürzel.
    await page.locator('.sv-step').click();
    await page.keyboard.press('b');
    await expect(progress(page)).toHaveText('2 / 16');
  });

  test('Danke-Screen übersteht Neuladen und «Zurück»; ein frischer Aufruf beginnt neu', async ({
    page,
  }) => {
    const calls = await mockApi(page);
    await page.route('https://psyber.tech/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Checkliste</title>' }),
    );
    await page.goto(`${FORMS}/?quelle=instagram`);
    await answerRequired(page);
    await skipTo(page, 8, 16);
    await next(page).click();
    const thanks = page.getByRole('heading', { name: 'Danke! Sie haben uns sehr geholfen.' });
    await expect(thanks).toBeVisible();

    await page.reload();
    await hydrated(page);
    await expect(thanks).toBeVisible();
    await expect(page.locator('.sv-tip')).toHaveCount(3);
    await expect(page.locator('.sv-download').nth(1)).toHaveAttribute(
      'href',
      'https://surprise.psyber.tech/gewinn?ref=umfrage&s=4',
    );

    // Checkliste öffnen und zurück: In-App-Browser laden dabei neu, der Danke-Screen bleibt.
    await page.locator('.sv-download').first().click();
    await expect(page).toHaveTitle('Checkliste');
    await page.goBack();
    await hydrated(page);
    await expect(thanks).toBeVisible();

    // Nichts davon zählt oder sendet ein zweites Mal.
    expect(calls.map((call) => call.path)).toEqual(['/v1/event', '/v1/survey']);

    // Wer die Umfrage neu aufruft, beginnt von vorn; der Merker ist weg.
    await page.goto(`${FORMS}/?quelle=instagram`);
    await hydrated(page);
    await expect(page.getByRole('button', { name: 'Los geht’s' })).toBeVisible();
    expect(await page.evaluate(() => Object.keys(window.sessionStorage))).toEqual([]);
  });

  test('ein beschädigter Zwischenstand bringt die Umfrage nicht zum Stehen', async ({ page }) => {
    const errors = collectErrors(page);
    await mockApi(page);
    await page.goto(`${FORMS}/`);
    await page.evaluate(() =>
      window.sessionStorage.setItem(
        'psyber:umfrage:v1',
        JSON.stringify({
          draft: {
            answers: {
              q1: 'gibt_es_nicht',
              q2: 'kein Array',
              q4: 9,
              q6: { phishing: 'x' },
              q7: ['webinar'],
            },
            q11: { a: 5, b: null },
            waitlist: { email: null, foundingFamily: 'ja' },
          },
          position: 10,
          quelle: 'website',
        }),
      ),
    );
    await page.reload();
    await hydrated(page);
    // Frage 11 erscheint mit leeren Feldern statt eines Fehlers.
    await expect(progress(page)).toHaveText('11 / 16');
    await expect(page.locator('#sv-q11-a')).toHaveValue('');
    // Beim Absenden führt die Umfrage zur ersten Pflichtfrage ohne gültige Antwort zurück.
    await skipTo(page, 11, 16);
    await next(page).click();
    await expect(progress(page)).toHaveText('1 / 16');
    await expect(page.getByText('Bitte wählen Sie eine Antwort aus.')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('Frage 13 bleibt erhalten, wenn Frage 12 kurz «nicht buchen» zeigt', async ({
    page,
    isMobile,
  }) => {
    test.skip(isMobile, 'Pfeiltasten in der Optionsgruppe.');
    await mockApi(page);
    await openAt(page, 11, { q12: 'ab_45', q13: 'chf_50_69' });
    // Mit den Pfeiltasten über «Würde ich nicht buchen» hinweg und wieder zurück
    await option(page, 'ab CHF 45').locator('input').focus();
    await page.keyboard.press('ArrowDown');
    await expect(option(page, 'Würde ich nicht buchen').locator('input')).toBeChecked();
    await expect(progress(page)).toHaveText('12 / 15');
    await page.keyboard.press('ArrowUp');
    await expect(progress(page)).toHaveText('12 / 16');
    await page.keyboard.press('Enter');
    await expect(progress(page)).toHaveText('13 / 16');
    await expect(option(page, 'CHF 50–69').locator('input')).toBeChecked();
  });

  test('«Zurück» auf Frage 1 führt zum Start, der Fokus geht mit', async ({ page }) => {
    await mockApi(page);
    await page.goto(`${FORMS}/`);
    await hydrated(page);
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await expect(progress(page)).toHaveText('1 / 16');
    await page.getByRole('button', { name: 'Zurück' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Wie sicher ist Ihre Familie online?',
    );
    await expect(page.locator('#sv-start-title')).toBeFocused();
  });

  test('Felder mit Fehler sind markiert, bis man sie korrigiert', async ({ page }) => {
    await mockApi(page);
    await openAt(page, 10);
    await page.locator('#sv-q11-a').fill('500');
    await page.locator('#sv-q11-b').fill('400');
    await next(page).click();
    await expect(page.getByText('Bitte füllen Sie alle vier Felder aus')).toBeVisible();
    await expect(page.locator('#sv-q11-c')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#sv-q11-d')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#sv-q11-a')).not.toHaveAttribute('aria-invalid');

    await page.locator('#sv-q11-c').fill('600');
    await page.locator('#sv-q11-d').fill('900');
    await next(page).click();
    await expect(page.getByText('Die Beträge sollten von oben nach unten steigen.')).toBeVisible();
    await expect(page.locator('#sv-q11-b')).toHaveAttribute('aria-invalid', 'true');
    await expect(page.locator('#sv-q11-c')).not.toHaveAttribute('aria-invalid');

    // Sobald jemand tippt, verschwinden Hinweis und Markierung.
    await page.locator('#sv-q11-b').fill('550');
    await expect(page.locator('#sv-q11-b')).not.toHaveAttribute('aria-invalid');
    await next(page).click();
    await expect(progress(page)).toHaveText('12 / 16');

    await openAt(page, 15);
    await page.locator('#sv-email').fill('keine-adresse');
    await next(page).click();
    await expect(page.locator('#sv-email')).toHaveAttribute('aria-invalid', 'true');
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
