/** Helfer für die Umfrage-Tests (forms.spec.ts und turnstile.spec.ts). */
import { expect, type Page } from '@playwright/test';

export const progress = (page: Page) => page.locator('.sv-progress-text');
export const next = (page: Page) => page.locator('.sv-next');
export const option = (page: Page, text: string) => page.locator('.sv-option', { hasText: text });
export const tile = (page: Page, value: number, row?: string) =>
  page.locator(
    row
      ? `.sv-tile:has(input[name="q6-${row}"][value="${value}"])`
      : `.sv-tile:has(input[value="${value}"])`,
  );

export const ROWS = [
  'phishing',
  'anlagebetrug',
  'romance',
  'cybermobbing',
  'heimnetz',
  'privatsphaere',
];

/** Wartet, bis das Preact-Island die Seite übernommen hat (Zwischenstand geladen, Tastatur aktiv). */
export const hydrated = (page: Page) => page.locator('.sv[data-ready]').waitFor();

/** Füllt die Pflichtfragen aus und landet auf Frage 8. */
export async function answerRequired(page: Page): Promise<void> {
  await hydrated(page);
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await expect(progress(page)).toHaveText('1 / 16');
  await option(page, 'Stadt Zürich').click(); // springt von selbst weiter
  await expect(progress(page)).toHaveText('2 / 16');
  await option(page, 'Kinder 10–15').click();
  await option(page, 'Erwachsene').click();
  await next(page).click();
  await expect(progress(page)).toHaveText('3 / 16');
  await next(page).click(); // freiwillig: überspringen
  await expect(progress(page)).toHaveText('4 / 16');
  await tile(page, 4).click(); // springt von selbst weiter
  await expect(progress(page)).toHaveText('5 / 16');
  await next(page).click();
  await expect(progress(page)).toHaveText('6 / 16');
  for (const row of ROWS) await tile(page, row === 'romance' ? 2 : 5, row).click();
  await next(page).click();
  await expect(progress(page)).toHaveText('7 / 16');
  await option(page, 'Session bei uns zu Hause').click();
  await next(page).click();
  await expect(progress(page)).toHaveText('8 / 16');
}

/** Überspringt die freiwilligen Fragen ab der aktuellen Position bis zur letzten. */
export async function skipTo(page: Page, from: number, to: number, total = 16): Promise<void> {
  for (let step = from; step < to; step++) {
    await next(page).click();
    await expect(progress(page)).toHaveText(`${step + 1} / ${total}`);
  }
}
