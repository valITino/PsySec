import { expect, test, type Page } from '@playwright/test';
import { eventSchema } from '../packages/survey/src/index.ts';
import { FORMS, SURPRISE, WEB } from '../playwright.config.ts';
import { mockApi } from './helpers.ts';
import { atQuestion, hydrated, next, option } from './survey.ts';

/**
 * Anonyme Zähler der Reichweite (packages/ui/src/lib/track.ts): Seitenaufrufe, Einstiege nach
 * Herkunft, Klicks auf die Haupt-Knöpfe und die erreichte Frage der Umfrage.
 *
 * Playwright steuert den Browser fern, und ferngesteuerte Browser zählen nicht. Für diese Tests
 * gibt er sich darum als gewöhnlicher Besucher aus, auf Wunsch mit einem Signal «nicht zählen».
 */
const asVisitor = (page: Page, signals: { gpc?: boolean; dnt?: boolean } = {}) =>
  page.addInitScript(({ gpc, dnt }) => {
    const define = (name: string, value: unknown) =>
      Object.defineProperty(Navigator.prototype, name, { get: () => value, configurable: true });
    define('webdriver', false);
    if (gpc) define('globalPrivacyControl', true);
    if (dnt) define('doNotTrack', '1');
  }, signals);

type Calls = Awaited<ReturnType<typeof mockApi>>;

const events = (calls: Calls) =>
  calls.filter((call) => call.path === '/v1/event').map((call) => call.body);

/** Reihenfolge egal: Zwei Zählungen aus demselben Augenblick können vertauscht ankommen. */
const sorted = (list: unknown[]) => list.map((item) => JSON.stringify(item)).sort();

/** Was der Browser sendet, muss die API annehmen: gleiche Prüfung wie auf dem Server. */
const expectAccepted = (calls: Calls) => {
  for (const body of events(calls)) {
    expect(eventSchema.safeParse(body).success, JSON.stringify(body)).toBe(true);
  }
};

const homeReady = (page: Page) => page.locator('[data-sim][data-ready]').waitFor();

test.describe('Anonyme Zähler', () => {
  test('ferngesteuerte Browser zählen nicht: Kein Test geht ins Netz', async ({ page }) => {
    const calls = await mockApi(page);
    for (const url of [`${WEB}/`, `${WEB}/checkliste`, `${FORMS}/`, `${SURPRISE}/gewinn`]) {
      await page.goto(url);
      await page.waitForLoadState('networkidle');
    }
    expect(calls).toEqual([]);
  });

  const arrivals: { name: string; search?: string; referer?: string; source: string }[] = [
    { name: 'ohne verweisende Seite', source: 'direkt' },
    { name: 'mit ?quelle=flyer', search: '?quelle=flyer', source: 'flyer' },
    { name: 'mit unbekannter ?quelle=', search: '?quelle=Mein-Newsletter', source: 'andere' },
    {
      name: 'aus der Suche',
      referer: 'https://www.google.ch/search?q=familie+muster',
      source: 'suche',
    },
    { name: 'aus einem sozialen Netz', referer: 'https://l.instagram.com/', source: 'social' },
    { name: 'von einer anderen Website', referer: 'https://www.srf.ch/news', source: 'verweis' },
  ];
  for (const arrival of arrivals) {
    test(`Einstieg ${arrival.name}: ein Seitenaufruf mit der Herkunft «${arrival.source}»`, async ({
      page,
    }) => {
      await asVisitor(page);
      const calls = await mockApi(page);
      await page.goto(
        `${WEB}/${arrival.search ?? ''}`,
        arrival.referer ? { referer: arrival.referer } : {},
      );
      await expect.poll(() => calls.length).toBe(1);
      expect(calls[0]).toEqual({
        path: '/v1/event',
        body: { event: 'page_view', page: 'home', source: arrival.source },
      });
      // Von der verweisenden Seite und vom eigenen Wert bleibt nur die Art, nie die Adresse.
      expect(JSON.stringify(calls)).not.toMatch(/google|instagram|srf|muster|newsletter/i);
      expectAccepted(calls);
    });
  }

  test('innerhalb der Website: Aufruf ohne Herkunft; Neuladen ist kein neuer Einstieg', async ({
    page,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${WEB}/checkliste?quelle=flyer`);
    await expect.poll(() => calls.length).toBe(1);
    await page.locator('footer nav a', { hasText: 'Impressum' }).click();
    await page.waitForURL(/\/impressum$/);
    await expect.poll(() => calls.length).toBe(2);
    await page.reload();
    await expect.poll(() => calls.length).toBe(3);
    expect(events(calls)).toEqual([
      { event: 'page_view', page: 'checkliste', source: 'flyer' },
      { event: 'page_view', page: 'impressum' },
      { event: 'page_view', page: 'impressum' },
    ]);
    expectAccepted(calls);
  });

  test('404-Seite und Datenschutzerklärung zählen als eigene Seiten, der Styleguide nicht', async ({
    page,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${WEB}/gibt-es-nicht`);
    await expect.poll(() => calls.length).toBe(1);
    await page.goto(`${WEB}/datenschutz`);
    await expect.poll(() => calls.length).toBe(2);
    await page.goto(`${WEB}/styleguide`);
    await page.waitForLoadState('networkidle');
    expect(events(calls).map((body) => (body as { page: string }).page)).toEqual([
      'notfound',
      'datenschutz',
    ]);
    expectAccepted(calls);
  });

  for (const signal of ['gpc', 'dnt'] as const) {
    const label = signal === 'gpc' ? 'Global Privacy Control' : 'Do Not Track';
    test(`mit «${label}» wird niemand gezählt, auch kein Klick`, async ({ page }) => {
      await asVisitor(page, { [signal]: true });
      const calls = await mockApi(page);
      await page.goto(`${WEB}/?quelle=flyer`);
      await homeReady(page);
      await page.locator('[data-track="hero_mehr"]').click();
      await page.goto(`${SURPRISE}/gewinn`);
      await page.locator('[data-surprise][data-ready]').waitFor();
      await page.waitForTimeout(400);
      expect(calls).toEqual([]);
    });
  }

  test('Klick auf einen Haupt-Knopf zählt mit seinem Platz, auch wenn er die Seite verlässt', async ({
    page,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    // Die Umfrage liegt im Build unter der echten Adresse: abfangen, nichts geht ins Netz.
    await page.route('https://forms.psyber.tech/**', (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<title>Umfrage</title>' }),
    );
    await page.goto(`${WEB}/`);
    await homeReady(page);
    await page.locator('[data-track="hero_cta"]').click();
    await page.waitForURL(/forms\.psyber\.tech/);
    await expect.poll(() => calls.length).toBe(2);
    expect(events(calls)).toEqual([
      { event: 'page_view', page: 'home', source: 'direkt' },
      { event: 'cta_click', target: 'hero_cta' },
    ]);
    expectAccepted(calls);
  });

  test('Klick auf einen Knopf innerhalb der Seite zählt genau einmal', async ({ page }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${WEB}/`);
    await homeReady(page);
    await page.locator('[data-track="hero_mehr"]').click();
    await expect.poll(() => calls.length).toBe(2);
    await page.waitForTimeout(300);
    expect(events(calls)[1]).toEqual({ event: 'cta_click', target: 'hero_mehr' });
    expect(calls).toHaveLength(2);
    expectAccepted(calls);
  });

  test('Umfrage: jede erreichte Frage zählt einmal, auch nach «Zurück» und Neuladen', async ({
    page,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${FORMS}/?quelle=flyer`);
    await hydrated(page);
    await page.getByRole('button', { name: 'Los geht’s' }).click();
    await atQuestion(page, '1 / 16');
    await option(page, 'Stadt Zürich').click(); // springt von selbst weiter
    await atQuestion(page, '2 / 16');

    // Zurück und wieder vor: keine zweite Zählung.
    await page.locator('.sv-back').click();
    await atQuestion(page, '1 / 16');
    await next(page).click();
    await atQuestion(page, '2 / 16');

    // Neuladen mitten in der Umfrage: neuer Seitenaufruf ohne Herkunft, Frage 2 zählt nicht erneut.
    await page.reload();
    await hydrated(page);
    await atQuestion(page, '2 / 16');
    await option(page, 'Erwachsene').click();
    await next(page).click();
    await atQuestion(page, '3 / 16');

    await expect.poll(() => calls.length).toBe(6);
    expect(sorted(events(calls))).toEqual(
      sorted([
        { event: 'page_view', page: 'umfrage', source: 'flyer' },
        { event: 'survey_step', step: 'q1' },
        { event: 'survey_started' },
        { event: 'survey_step', step: 'q2' },
        { event: 'page_view', page: 'umfrage' },
        { event: 'survey_step', step: 'q3' },
      ]),
    );
    // Gezählt wird, wie weit jemand kommt, nie eine Antwort.
    expect(JSON.stringify(calls)).not.toMatch(/stadt_zh|erwachsene/);
    expectAccepted(calls);
  });

  test('«Erwischt!»: Aufruf und Knöpfe als Summen, der Test-Link zählt wie bisher', async ({
    page,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${SURPRISE}/gewinn?ref=umfrage&s=4`);
    await page.locator('[data-surprise][data-ready]').waitFor();
    await expect.poll(() => calls.length).toBe(2);
    // Wer von der Umfrage kommt, ist kein neuer Einstieg: Der Aufruf trägt keine Herkunft.
    expect(sorted(events(calls))).toEqual(
      sorted([
        { event: 'bait_click', s: 4 },
        { event: 'page_view', page: 'erwischt' },
      ]),
    );
    await page.locator('[data-track="erwischt_code"]').click();
    await expect.poll(() => calls.length).toBe(3);
    expect(events(calls)[2]).toEqual({ event: 'cta_click', target: 'erwischt_code' });
    expectAccepted(calls);
  });

  test('die Zählung setzt keine Cookies und legt nichts im Browser ab', async ({
    page,
    context,
  }) => {
    await asVisitor(page);
    const calls = await mockApi(page);
    await page.goto(`${WEB}/?quelle=flyer`);
    await homeReady(page);
    await page.locator('[data-track="hero_mehr"]').click();
    await page.goto(`${WEB}/impressum`);
    await expect.poll(() => calls.length).toBe(3);
    expect(await context.cookies()).toEqual([]);
    const stored = await page.evaluate(() => ({
      local: Object.keys(window.localStorage),
      session: Object.keys(window.sessionStorage),
    }));
    expect(stored).toEqual({ local: [], session: [] });
    // Die Anfragen selbst tragen weder Cookies noch die Adresse der Seite.
    expectAccepted(calls);
  });
});
