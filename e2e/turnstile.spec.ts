import { expect, test, type Page } from '@playwright/test';
import { FORMS_TURNSTILE, WEB_TURNSTILE } from '../playwright.config.ts';
import { collectErrors, mockApi } from './helpers.ts';
import { answerRequired, next, progress, skipTo } from './survey.ts';

/**
 * Diese Tests laufen gegen den Build mit Turnstile-Testkey: so wie in Produktion.
 * Das Skript von Cloudflare wird abgefangen und durch eine Attrappe ersetzt; die CSP der Seite
 * prüft der Browser trotzdem (fehlt dort etwas, erscheint ein Konsolenfehler).
 */
const TURNSTILE = 'https://challenges.cloudflare.com/';

async function mockTurnstile(page: Page): Promise<string[]> {
  const requests: string[] = [];
  await page.route(`${TURNSTILE}**`, async (route) => {
    requests.push(route.request().url());
    await route.fulfill({
      status: 200,
      contentType: 'application/javascript',
      body: `
        window.turnstileStub = { rendered: 0, executed: 0, resets: 0, options: null };
        window.turnstile = {
          render(container, options) {
            window.turnstileStub.rendered++;
            window.turnstileStub.options = {
              sitekey: options.sitekey,
              execution: options.execution,
              appearance: options.appearance,
              language: options.language,
            };
            window.turnstileStub.callback = options.callback;
            return 'stub-widget';
          },
          execute() {
            window.turnstileStub.executed++;
            setTimeout(() => window.turnstileStub.callback('stub-token'), 20);
          },
          reset() { window.turnstileStub.resets++; },
          remove() {},
        };
      `,
    });
  });
  return requests;
}

interface Stub {
  rendered: number;
  executed: number;
  resets: number;
  options: { sitekey: string; execution: string; appearance: string; language: string } | null;
}
const stub = (page: Page) =>
  page.evaluate(() => (window as unknown as { turnstileStub?: Stub }).turnstileStub ?? null);

const csp = (page: Page) =>
  page.locator('meta[http-equiv="content-security-policy"]').getAttribute('content');

test.describe('mit Turnstile (wie in Produktion)', () => {
  test('psyber.tech: CSP erlaubt Turnstile nur auf der Seite mit Formular', async ({ page }) => {
    await page.goto(`${WEB_TURNSTILE}/`);
    const home = (await csp(page)) ?? '';
    expect(home).toMatch(/script-src [^;]*'self'/);
    expect(home).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(home).toMatch(/frame-src https:\/\/challenges\.cloudflare\.com/);
    expect(home).toMatch(/style-src [^;]*'self'/);
    expect(home).not.toMatch(/unsafe-inline|unsafe-eval/);

    for (const path of ['/checkliste', '/impressum', '/datenschutz']) {
      await page.goto(`${WEB_TURNSTILE}${path}`);
      const policy = (await csp(page)) ?? '';
      expect(policy, path).toMatch(/script-src [^;]*'self'/);
      expect(policy, path).not.toContain('challenges.cloudflare.com');
    }
  });

  test('psyber.tech: Kontaktformular lädt Turnstile erst bei Benutzung und sendet das Token', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const calls = await mockApi(page);
    const turnstile = await mockTurnstile(page);
    await page.goto(`${WEB_TURNSTILE}/#kontakt`);
    const submit = page.getByRole('button', { name: 'Anfrage senden' });
    await submit.scrollIntoViewIfNeeded();
    await expect(page.locator('[data-sim][data-ready]')).toBeVisible();
    expect(turnstile, 'Turnstile lädt nicht schon beim Seitenaufruf').toEqual([]);

    await page.getByLabel('Name').fill('Familie Muster');
    await page.getByLabel('E-Mail').fill('familie@example.ch');
    await page.getByLabel('PLZ und Ort').fill('8000 Zürich');
    await page.getByLabel('LAN-Party').check();
    await page.getByLabel(/Datenschutzerklärung/).check();
    await submit.click();

    await expect(
      page.getByText('Danke! Wir melden uns innert zwei Arbeitstagen', { exact: false }),
    ).toBeVisible();
    expect(turnstile.length).toBeGreaterThan(0);
    expect(turnstile[0]).toContain('/turnstile/v0/api.js?render=explicit');
    expect(calls).toHaveLength(1);
    expect(calls[0]?.body).toMatchObject({ turnstileToken: 'stub-token' });
    const state = await stub(page);
    expect(state?.rendered).toBe(1);
    expect(state?.options).toMatchObject({
      sitekey: '1x00000000000000000000AA',
      execution: 'execute',
      language: 'de',
    });
    // Keine CSP-Verstösse, keine Skriptfehler: die eigenen Skripte laufen neben Turnstile.
    expect(errors).toEqual([]);
  });

  test('forms.psyber.tech: Umfrage lädt Turnstile erst beim Absenden und sendet das Token', async ({
    page,
  }) => {
    const errors = collectErrors(page);
    const calls = await mockApi(page);
    const turnstile = await mockTurnstile(page);
    await page.goto(`${FORMS_TURNSTILE}/`);
    const policy = (await csp(page)) ?? '';
    expect(policy).toMatch(/script-src [^;]*'self'/);
    expect(policy).toMatch(/script-src [^;]*https:\/\/challenges\.cloudflare\.com/);
    expect(policy).toMatch(/frame-src https:\/\/challenges\.cloudflare\.com/);

    await answerRequired(page);
    await skipTo(page, 8, 16);
    await expect(progress(page)).toHaveText('16 / 16');
    expect(turnstile, 'Turnstile lädt nicht vor dem Absenden').toEqual([]);

    await expect(next(page)).toHaveText('Absenden');
    await next(page).click();
    await expect(page.getByRole('heading', { name: 'Ihre Schwerpunkte' })).toBeVisible();
    expect(turnstile.length).toBeGreaterThan(0);
    const survey = calls.find((call) => call.path === '/v1/survey');
    expect(survey?.body).toMatchObject({ turnstileToken: 'stub-token' });
    const state = await stub(page);
    expect(state?.options).toMatchObject({
      sitekey: '1x00000000000000000000BB',
      appearance: 'interaction-only',
    });
    expect(errors).toEqual([]);
  });
});
