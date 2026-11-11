import type { Page } from '@playwright/test';

/** Sammelt Konsolenfehler, Seitenfehler und CSP-Verstösse einer Seite. */
export function collectErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => errors.push(`pageerror: ${error.message}`));
  return errors;
}

export const API = 'https://api.psyber.tech';

/** Fängt alle Requests an die API ab und protokolliert sie. Ins Netz geht nichts. */
export async function mockApi(
  page: Page,
  status = 200,
): Promise<{ path: string; body: unknown }[]> {
  const calls: { path: string; body: unknown }[] = [];
  await page.route(`${API}/**`, async (route) => {
    const request = route.request();
    if (request.method() === 'OPTIONS') {
      await route.fulfill({
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Headers': 'content-type',
          'Access-Control-Allow-Methods': 'POST',
        },
      });
      return;
    }
    calls.push({ path: new URL(request.url()).pathname, body: request.postDataJSON() });
    await route.fulfill({
      status,
      contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(status === 200 ? { ok: true } : { error: 'server_error' }),
    });
  });
  return calls;
}

/** Die Seite darf nie horizontal scrollen. */
export async function horizontalOverflow(page: Page): Promise<number> {
  return page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
}

/**
 * Die Startseite stellt Sektionen weit unter dem ersten Bildschirm zurück (data-lazy) und rechnet
 * sie erst bei der ersten Interaktion. Für Prüfungen der ganzen Seite hier sofort nachholen.
 */
export async function layOutAll(page: Page): Promise<void> {
  await page.evaluate(async () => {
    // Wie home.ts: erst «neu» (ohne Übergänge), zwei Bilder später fertig.
    const lazy = [...document.querySelectorAll<HTMLElement>('[data-lazy]:not([data-laid])')];
    for (const element of lazy) element.dataset.laid = 'new';
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
    for (const element of document.querySelectorAll<HTMLElement>('[data-lazy]')) {
      element.dataset.laid = '';
    }
  });
}
