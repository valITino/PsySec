import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { WEB } from '../playwright.config.ts';
import { collectErrors } from './helpers.ts';

const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
];

const ready = (page: Page) => page.locator('[data-sim][data-ready]').waitFor();

async function konami(page: Page): Promise<void> {
  for (const key of KONAMI) await page.keyboard.press(key);
}

async function run(page: Page, command: string): Promise<void> {
  await page.keyboard.type(command);
  await page.keyboard.press('Enter');
}

test.describe('Easter Eggs auf psyber.tech', () => {
  test('Gruss in der Konsole (wörtlich aus dem Auftrag)', async ({ page }) => {
    const messages: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'log') messages.push(message.text());
    });
    await page.goto(`${WEB}/checkliste`);
    await expect
      .poll(() => messages.join('\n'))
      .toContain('Du liest Quellcode? Layer 8 ist bei dir offensichtlich gepatcht.');
    const text = messages.join('\n');
    // Die Kontaktadresse ist noch offen: der Platzhalter steht sichtbar da, nichts Erfundenes.
    expect(text).toContain('Sag hallo: [TODO: E-Mail]');
    expect(text).toContain('↑ ↑ ↓ ↓ ← → ← → B A');
  });

  test('Konami-Code öffnet das Terminal: Befehle, Verlauf, Esc', async ({ browser, isMobile }) => {
    test.skip(isMobile, 'Der Konami-Code braucht eine Tastatur.');
    // Reduzierte Bewegung: alle Ausgaben erscheinen sofort.
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    const errors = collectErrors(page);
    await page.goto(`${WEB}/`);
    await ready(page);

    const terminal = page.getByRole('dialog', { name: 'PSYber-Terminal' });
    await expect(terminal).toHaveCount(0);
    // Das Stylesheet des Terminals lädt erst mit dem Terminal, nicht mit jeder Seite.
    const sheet = page.locator('link[rel="stylesheet"][href*="terminal"]');
    await expect(sheet).toHaveCount(0);
    await konami(page);
    await expect(terminal).toBeVisible();
    await expect(sheet).toHaveCount(1);
    expect(await terminal.evaluate((element) => getComputedStyle(element).borderTopWidth)).toBe(
      '1px',
    );
    const input = terminal.getByRole('textbox', { name: 'Befehl eingeben' });
    await expect(input).toBeFocused();
    const log = terminal.getByRole('log');
    await expect(log).toContainText('Konami-Code erkannt.');
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('scroll-locked')),
    ).toBe(true);

    await run(page, 'help');
    for (const command of ['whoami', 'ping familie.local', 'sudo patch layer8', 'exit']) {
      await expect(log).toContainText(command);
    }
    await run(page, 'whoami');
    await expect(log).toContainText('gast');
    await run(page, 'PING   familie.local');
    await expect(log).toContainText('0 Grund zur Panik');
    await run(page, 'sudo patch layer8');
    await expect(log).toContainText('Layer 8 gepatcht. Nebenwirkung: gesunde Skepsis.');
    await expect(log).toContainText('[##########] 100 %');

    // Unbekanntes wird als Text gezeigt, nie als HTML ausgeführt.
    await run(page, '<img src=x onerror=alert(1)>');
    await expect(log).toContainText('Befehl nicht gefunden: <img src=x onerror=alert(1)>');
    await expect(terminal.locator('img')).toHaveCount(0);

    // Verlauf mit Pfeil nach oben
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('<img src=x onerror=alert(1)>');
    await page.keyboard.press('ArrowUp');
    await expect(input).toHaveValue('sudo patch layer8');
    await input.fill('');

    // Fokus bleibt im Fenster: Tab erreicht nur Eingabe und «Schliessen».
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    expect(await page.evaluate(() => document.activeElement?.closest('dialog') !== null)).toBe(
      true,
    );

    await run(page, 'clear');
    await expect(log).toBeEmpty();

    await page.keyboard.press('Escape');
    await expect(terminal).toBeHidden();
    expect(
      await page.evaluate(() => document.documentElement.classList.contains('scroll-locked')),
    ).toBe(false);

    // Zweites Öffnen beginnt frisch; «exit» schliesst.
    await konami(page);
    await expect(terminal).toBeVisible();
    await expect(log).not.toContainText('whoami');
    await run(page, 'exit');
    await expect(terminal).toBeHidden();
    expect(errors).toEqual([]);
    await context.close();
  });

  test('Der Code zählt nicht, während jemand in ein Feld tippt', async ({ page, isMobile }) => {
    test.skip(isMobile, 'Der Konami-Code braucht eine Tastatur.');
    await page.goto(`${WEB}/#kontakt`);
    await ready(page);
    const name = page.getByLabel('Name');
    await name.scrollIntoViewIfNeeded();
    await name.focus();
    await konami(page);
    await page.waitForTimeout(300);
    await expect(page.locator('dialog.term')).toHaveCount(0);
    await expect(name).toHaveValue('ba');
  });

  test('Terminal: Barrierefreiheit (axe, WCAG 2.2 AA)', async ({ browser, isMobile }) => {
    test.skip(isMobile, 'Der Konami-Code braucht eine Tastatur.');
    const context = await browser.newContext({ reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${WEB}/impressum`);
    // Der Header selbst hat keine Höhe (die Leiste schwebt): auf das Logo warten.
    await page.locator('[data-header] .logo').waitFor();
    await konami(page);
    const terminal = page.getByRole('dialog', { name: 'PSYber-Terminal' });
    await expect(terminal).toBeVisible();
    await run(page, 'help');
    await run(page, 'ping familie.local');
    const results = await new AxeBuilder({ page })
      .include('dialog.term')
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
});
