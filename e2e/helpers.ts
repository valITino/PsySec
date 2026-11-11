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
 * Sichtbare Inhalte, die über den linken oder rechten Bildrand ragen.
 *
 * `overflow-x: clip` am body verhindert das seitliche Scrollen, schneidet solche Inhalte aber
 * still ab; `scrollWidth` bleibt dabei unverändert. Darum misst diese Prüfung die Kanten selbst:
 * jede Textzeile (auch lange Wörter, die aus ihrem Kasten laufen) und jeden Kasten mit Rahmen
 * oder Grund sowie alle Bedienelemente. Ausgenommen ist, was in einem eigenen Ausschnitt läuft
 * (Ticker, Bereiche mit eigenem Scrollen) und reine Dekoration (`aria-hidden`).
 */
export async function cutOff(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const width = document.documentElement.clientWidth;
    const ownViewport = (element: Element): boolean => {
      for (
        let parent = element.parentElement;
        parent && parent !== document.body;
        parent = parent.parentElement
      ) {
        if (/(hidden|clip|auto|scroll)/.test(getComputedStyle(parent).overflowX)) return true;
      }
      return false;
    };
    const visible = (element: Element): boolean =>
      element.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) &&
      !element.closest('[aria-hidden="true"], .sr-only, .hp, .skip-link, [inert]');
    const outside = (rect: DOMRect): boolean =>
      rect.width > 0 && rect.height > 0 && (rect.right > width + 0.5 || rect.left < -0.5);
    const boxed = (element: Element): boolean => {
      const style = getComputedStyle(element);
      return (
        parseFloat(style.borderRightWidth) > 0 ||
        parseFloat(style.borderLeftWidth) > 0 ||
        style.backgroundColor !== 'rgba(0, 0, 0, 0)'
      );
    };

    const found = new Map<Element, string>();
    const note = (element: Element, rect: DOMRect): void => {
      if (found.has(element) || ownViewport(element)) return;
      const classes = typeof element.className === 'string' ? element.className.trim() : '';
      const text = (element.textContent ?? '').trim().replace(/\s+/g, ' ').slice(0, 40);
      found.set(
        element,
        `${element.tagName.toLowerCase()}${classes ? `.${classes.split(/\s+/).join('.')}` : ''} ` +
          `[${Math.round(rect.left)}..${Math.round(rect.right)} von ${width}] «${text}»`,
      );
    };

    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      if (!node.textContent?.trim() || !parent || !visible(parent)) continue;
      if (['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) continue;
      range.selectNodeContents(node);
      const rect = [...range.getClientRects()].find(outside);
      if (rect) note(parent, rect);
    }
    for (const element of document.querySelectorAll('body *')) {
      if (!visible(element)) continue;
      const control = element.matches('a, button, input, select, textarea, img');
      if (!control && !(boxed(element) && element.textContent?.trim())) continue;
      const rect = element.getBoundingClientRect();
      if (outside(rect)) note(element, rect);
    }
    return [...found.values()];
  });
}

/**
 * Wörter, die mitten im Wort auf die nächste Zeile umbrechen («Datenschu-tz»). Das passiert, wenn
 * eine Spalte schmaler ist als ihr längstes Wort und `overflow-wrap: anywhere` einspringt.
 * Nicht gemeint sind Trennungen an einem weichen Trennzeichen und Adressen in Mono-Schrift.
 */
export async function brokenWords(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const found = new Set<string>();
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const range = document.createRange();
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const parent = node.parentElement;
      const text = node.textContent ?? '';
      if (!parent || !text.trim()) continue;
      if (!parent.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true })) continue;
      if (parent.closest('[aria-hidden="true"], .sr-only, script, style, noscript, .mono, code')) {
        continue;
      }
      for (const match of text.matchAll(/[A-Za-zÄÖÜäöüéèàç]{4,}/g)) {
        const start = match.index;
        const end = start + match[0].length;
        if (text[start - 1] === '\u00AD' || text[end] === '\u00AD') continue;
        range.setStart(node, start);
        range.setEnd(node, end);
        const lines = new Set(
          [...range.getClientRects()].filter((rect) => rect.width > 0).map((rect) => rect.top),
        );
        if (lines.size > 1) found.add(`${parent.tagName.toLowerCase()}: ${match[0]}`);
      }
    }
    return [...found];
  });
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
