import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { WEB } from '../playwright.config.ts';
import { collectErrors, horizontalOverflow, layOutAll, mockApi } from './helpers.ts';

/**
 * Wartet, bis die Skripte der Startseite gelaufen sind: Der Simulator meldet sich bereit, und
 * die Scroll-Animationen sind eingerichtet (danach ändert sich die Höhe der Seite nicht mehr).
 */
const ready = async (page: Page) => {
  await page.locator('[data-sim][data-ready]').waitFor();
  await wake(page);
  await layOutAll(page);
};

/**
 * Smooth Scroll und Scroll-Animationen laden erst beim ersten Lebenszeichen. Eine Zeigerbewegung
 * genügt dafür; die zurückgestellten Sektionen bleiben dabei noch unberechnet.
 */
const wake = async (page: Page) => {
  let x = 10;
  // Zeigerbewegungen zählen erst eine Sekunde nach dem Laden: bewegen, bis es wirkt.
  await expect(async () => {
    x += 7;
    await page.mouse.move(x, 14);
    await expect(page.locator('html[data-scroll="ready"]')).toBeAttached({ timeout: 300 });
  }).toPass({ timeout: 15_000 });
};

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

  test('Marke: Logo aus dem Kit, Slogan, Leitsatz ohne «Zürich», kein alter Claim', async ({
    page,
    request,
  }) => {
    await page.goto(`${WEB}/`);
    await expect(page).toHaveTitle('PSYber – Cyber-Prävention für Familien');
    await expect(page.locator('.hero-head .kicker')).toHaveText(
      /Cyber-Prävention für Familien\s*$/,
    );

    // Das Logo ist ein Bild aus dem Kit und lädt wirklich.
    const logo = page.locator('[data-header] .logo-img');
    await expect(logo).toBeVisible();
    await expect
      .poll(() => logo.evaluate((image: HTMLImageElement) => image.naturalWidth))
      .toBeGreaterThan(0);

    await layOutAll(page);
    await expect(page.locator('footer').getByText('Betrüger hassen diesen Blick.')).toBeVisible();
    await expect(page.locator('footer').getByText('Wir patchen Layer 8.')).toBeVisible();

    // Der frühere Claim steht nirgends: weder im HTML noch in den Logo-Dateien.
    for (const path of ['/', '/checkliste', '/styleguide']) {
      const html = await (await request.get(`${WEB}${path}`)).text();
      expect(html, `früherer Claim auf ${path}`).not.toMatch(/Erst Kopf/i);
    }
    const source = await logo.getAttribute('src');
    const svg = await (await request.get(new URL(source ?? '', WEB).href)).text();
    expect(svg).not.toMatch(/Erst Kopf/i);
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

  test('Menü aus der Kapsel: nach dem Scrollen bleibt «Schliessen» erreichbar', async ({
    page,
  }) => {
    await page.goto(`${WEB}/`);
    await ready(page);
    await page.evaluate(() => window.scrollTo({ top: 3200, behavior: 'instant' }));
    const header = page.locator('[data-header]');
    await expect(header).toHaveClass(/is-scrolled/);

    await page.getByRole('button', { name: 'Menü' }).click();
    const close = page.getByRole('button', { name: 'Schliessen' });
    await expect(close).toBeInViewport();
    await expect(page.locator('#mobile-menu').getByRole('link', { name: /Ablauf/ })).toBeVisible();

    await close.click();
    await expect(page.locator('#mobile-menu')).toBeHidden();
    // Die Seite steht noch dort, wo sie war.
    expect(await page.evaluate(() => window.scrollY)).toBeGreaterThan(3000);
  });

  test('Sektionen weiter unten: erst bei Bedarf berechnet, Sprungmarken treffen trotzdem', async ({
    page,
    isMobile,
  }) => {
    await page.goto(`${WEB}/`);
    await page.locator('[data-sim][data-ready]').waitFor();
    await wake(page);
    const waiting = page.locator('[data-lazy]:not([data-laid])');
    expect(await waiting.count()).toBeGreaterThan(5);

    // Sprung zu einer Marke: vorher wird alles berechnet, das Ziel steht unter der Leiste.
    if (isMobile) await page.getByRole('button', { name: 'Menü' }).click();
    const scope = isMobile ? page.locator('#mobile-menu') : page.getByLabel('Hauptnavigation');
    await scope.getByRole('link', { name: /Kontakt/ }).click();
    await expect(waiting).toHaveCount(0);
    await expect
      .poll(
        () => page.evaluate(() => document.querySelector('#kontakt')!.getBoundingClientRect().top),
        {
          timeout: 8000,
        },
      )
      .toBeLessThan(130);
    expect(
      await page.evaluate(() => document.querySelector('#kontakt')!.getBoundingClientRect().top),
    ).toBeGreaterThan(-40);
  });

  test('Sektionen weiter unten: nach der ersten Interaktion der Reihe nach berechnet', async ({
    page,
  }) => {
    await page.goto(`${WEB}/`);
    await wake(page);
    const waiting = page.locator('[data-lazy]:not([data-laid])');
    expect(await waiting.count()).toBeGreaterThan(5);
    await page.keyboard.press('Shift');
    await expect(waiting).toHaveCount(0, { timeout: 8000 });
  });

  test('Scroll-Bibliotheken laden erst beim ersten Lebenszeichen', async ({ page }) => {
    const scripts: string[] = [];
    page.on('request', (request) => {
      if (request.resourceType() === 'script') scripts.push(new URL(request.url()).pathname);
    });
    await page.goto(`${WEB}/`, { waitUntil: 'networkidle' });
    await page.locator('[data-sim][data-ready]').waitFor();
    expect(scripts.filter((path) => /\/scroll\./.test(path))).toEqual([]);
    await expect(page.locator('html')).not.toHaveAttribute('data-scroll', 'ready');

    await wake(page);
    expect(scripts.filter((path) => /\/scroll\./.test(path))).toHaveLength(1);
  });

  for (const reducedMotion of ['no-preference', 'reduce'] as const) {
    const mode = reducedMotion === 'reduce' ? 'reduzierte Bewegung' : 'mit Bewegung';

    test(`Direktlink auf eine Marke landet auf dem Ziel (${mode})`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({ ...testInfo.project.use, reducedMotion });
      const page = await context.newPage();
      const top = (id: string) =>
        page.evaluate(
          (target) => Math.round(document.getElementById(target)!.getBoundingClientRect().top),
          id,
        );
      // «Angebot» folgt direkt auf die angepinnte Strecke im Drehbuch, «Pakete» liegt weit unten,
      // der dritte ist der Link von surprise.psyber.tech.
      for (const address of ['/#angebot', '/#pakete', '/?ref=surprise#kontakt']) {
        const id = address.slice(address.indexOf('#') + 1);
        await page.goto(`${WEB}${address}`);
        await expect(page.locator('html[data-scroll="ready"]')).toBeAttached({ timeout: 15_000 });
        // Das Ziel steht direkt unter der Leiste (scroll-padding-top: 96 px) und bleibt dort.
        await expect.poll(() => top(id), { timeout: 5000 }).toBeLessThan(112);
        await page.waitForTimeout(400);
        expect(await top(id), address).toBeGreaterThan(80);
        expect(await top(id), address).toBeLessThan(112);
      }
      await context.close();
    });

    test(`Neu laden: derselbe Abschnitt bleibt im Bild (${mode})`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({ ...testInfo.project.use, reducedMotion });
      const page = await context.newPage();
      await page.goto(`${WEB}/`);
      await ready(page);
      const top = () =>
        page.evaluate(() =>
          Math.round(document.querySelector('#pakete')!.getBoundingClientRect().top),
        );
      await page.evaluate(() => {
        const y = document.querySelector('#pakete')!.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: y - 240, behavior: 'instant' });
      });
      // Die Seite merkt sich die Ansicht, sobald das Scrollen zur Ruhe kommt: im Verlaufseintrag,
      // nicht in einem Cookie oder Speicher.
      await expect
        .poll(() =>
          page.evaluate(
            () => (window.history.state as { view?: { index: number } } | null)?.view?.index ?? -1,
          ),
        )
        .toBeGreaterThan(0);
      expect(await page.evaluate(() => document.cookie)).toBe('');
      expect(
        await page.evaluate(() => window.localStorage.length + window.sessionStorage.length),
      ).toBe(0);
      const before = await top();
      expect(before).toBeGreaterThan(200);

      await page.reload();
      await expect(page.locator('html[data-scroll="ready"]')).toBeAttached({ timeout: 15_000 });
      await expect
        .poll(async () => Math.abs((await top()) - before), { timeout: 5000 })
        .toBeLessThan(3);
      await page.waitForTimeout(500);
      expect(Math.abs((await top()) - before)).toBeLessThan(3);
      await context.close();
    });
  }

  test('Zurückgestellte Sektionen blenden beim Auslegen nichts über', async ({ page }) => {
    await page.goto(`${WEB}/`);
    await page.locator('[data-sim][data-ready]').waitFor();
    const result = await page.evaluate(() => {
      const section = document.querySelector<HTMLElement>('#kontakt')!;
      const button = section.querySelector<HTMLElement>('.btn')!;
      const change = (color: string) => {
        void getComputedStyle(button).backgroundColor;
        button.style.backgroundColor = color;
        void getComputedStyle(button).backgroundColor;
        return button.getAnimations().length;
      };
      const waiting = change('rgb(1, 2, 3)');
      section.dataset.laid = 'new';
      const fresh = change('rgb(4, 5, 6)');
      section.dataset.laid = '';
      const settled = change('rgb(7, 8, 9)');
      return { lazy: section.hasAttribute('data-lazy'), waiting, fresh, settled };
    });
    // Solange der Teil zurückgestellt oder frisch ausgelegt ist: kein Übergang. Danach wieder.
    expect(result).toEqual({ lazy: true, waiting: 0, fresh: 0, settled: 1 });
  });

  test('Reduzierte Bewegung: Stiländerungen gelten sofort, ohne Übergang', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${WEB}/`);
    const result = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>('.hero .btn')!;
      void getComputedStyle(button).backgroundColor;
      button.style.backgroundColor = 'rgb(1, 2, 3)';
      button.style.marginTop = '40px';
      const style = getComputedStyle(button);
      return {
        transitions: button.getAnimations().length,
        color: style.backgroundColor,
        margin: style.marginTop,
      };
    });
    // Auch ein winziger Übergang hielte hier noch die alten Werte fest.
    expect(result).toEqual({ transitions: 0, color: 'rgb(1, 2, 3)', margin: '40px' });
    await context.close();
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

    // Uhrzeit in Zürich statt Platzhalter (die Uhr startet, sobald die Anzeige in Sicht kommt)
    await page.locator('[data-sim-time]').scrollIntoViewIfNeeded();
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

  test('Ticker bei reduzierter Bewegung: steht still, alle Sätze sind ganz lesbar', async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${WEB}/`);
    const ticker = page.locator('[data-ticker]');
    await ticker.scrollIntoViewIfNeeded();
    const viewport = page.viewportSize()?.width ?? 0;
    const pills = ticker.locator('.ticker-list:not(.ticker-copy) .pill');
    expect(await pills.count()).toBeGreaterThanOrEqual(8);
    for (const pill of await pills.all()) {
      await expect(pill).toBeVisible();
      const box = await pill.boundingBox();
      expect(box?.x ?? -1, await pill.innerText()).toBeGreaterThanOrEqual(0);
      expect((box?.x ?? 0) + (box?.width ?? 0), await pill.innerText()).toBeLessThanOrEqual(
        viewport,
      );
    }
    // Die Kopie für die Endlosschleife ist dann überflüssig.
    await expect(ticker.locator('.ticker-copy').first()).toBeHidden();
    await context.close();
  });

  test('Chat-Mockup in 0x06 ist sichtbar und liegt im Bildschirm', async ({
    browser,
  }, testInfo) => {
    // Reduzierte Bewegung: alle Nachrichten stehen sofort da.
    const context = await browser.newContext({ ...testInfo.project.use, reducedMotion: 'reduce' });
    const page = await context.newPage();
    await page.goto(`${WEB}/`);
    const chat = page.locator('[data-chat]');
    await chat.scrollIntoViewIfNeeded();
    await expect(chat).toBeVisible();
    await expect(chat.locator('[data-chat-msg]')).toHaveCount(3);
    const box = await chat.boundingBox();
    const viewport = page.viewportSize();
    expect(box?.width ?? 0).toBeGreaterThan(240);
    expect(box?.x ?? -1).toBeGreaterThanOrEqual(0);
    expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(viewport?.width ?? 0);
    for (const message of await chat.locator('[data-chat-msg]').all())
      await expect(message).toBeVisible();
    await context.close();
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
      await layOutAll(page);
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
