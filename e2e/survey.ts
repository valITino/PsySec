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

/**
 * Wartet auf eine Frage («3 / 16») und darauf, dass sie Klicks annimmt: Kurz nach dem Wechsel
 * zählen Klicks auf Antworten nicht (Schutz vor Doppelklicks, 400 ms). Menschen merken davon
 * nichts, der Test wäre sonst schneller.
 */
export async function atQuestion(page: Page, text: string): Promise<void> {
  await expect(progress(page)).toHaveText(text);
  await page.waitForTimeout(420);
}

/** Füllt die Pflichtfragen aus und landet auf Frage 8. */
export async function answerRequired(page: Page): Promise<void> {
  await hydrated(page);
  await page.getByRole('button', { name: 'Los geht’s' }).click();
  await atQuestion(page, '1 / 16');
  await option(page, 'Stadt Zürich').click(); // springt von selbst weiter
  await atQuestion(page, '2 / 16');
  await option(page, 'Kinder 10–15').click();
  await option(page, 'Erwachsene').click();
  await next(page).click();
  await expect(progress(page)).toHaveText('3 / 16');
  await next(page).click(); // freiwillig: überspringen
  await atQuestion(page, '4 / 16');
  await tile(page, 4).click(); // springt von selbst weiter
  await expect(progress(page)).toHaveText('5 / 16');
  await next(page).click();
  await atQuestion(page, '6 / 16');
  for (const row of ROWS) await tile(page, row === 'romance' ? 2 : 5, row).click();
  await next(page).click();
  await atQuestion(page, '7 / 16');
  await option(page, 'Session bei uns zu Hause').click();
  await next(page).click();
  await atQuestion(page, '8 / 16');
}

/** Überspringt die freiwilligen Fragen ab der aktuellen Position bis zur letzten. */
export async function skipTo(page: Page, from: number, to: number, total = 16): Promise<void> {
  for (let step = from; step < to; step++) {
    await next(page).click();
    await expect(progress(page)).toHaveText(`${step + 1} / ${total}`);
  }
  // Die Zielfrage nimmt nach kurzer Zeit Klicks an (siehe atQuestion).
  await page.waitForTimeout(420);
}
