import { expect, test } from '@playwright/test';
import { WEB } from '../playwright.config.ts';

test('Styleguide lädt ohne Fehler und zeigt die Marke', async ({ page }) => {
  const errors: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto(`${WEB}/styleguide`);
  await expect(page.getByRole('heading', { level: 1, name: 'Styleguide' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Psi-Netz/ })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);
  expect(errors).toEqual([]);
});
