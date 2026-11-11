import { expect, test, type APIRequestContext } from '@playwright/test';
import { FORMS, SURPRISE, WEB } from '../playwright.config.ts';

/**
 * Sichtbarkeit in Suchmaschinen: was ein Crawler von den Seiten bekommt. Geprüft wird das rohe
 * HTML (ohne JavaScript, wie beim ersten Abruf durch eine Suchmaschine) und die Dateien
 * robots.txt und Sitemap. Die Tests laufen einmal; die Bildschirmgrösse spielt keine Rolle.
 */
test.beforeEach(({ request: _request }, testInfo) => {
  test.skip(testInfo.project.name !== 'desktop', 'Unabhängig von der Bildschirmgrösse.');
});

interface Indexed {
  name: string;
  /** Adresse im Test */
  url: string;
  /** Adresse in Produktion: So muss das Canonical lauten. */
  canonical: string;
  /** Erwartete Typen der strukturierten Daten, in dieser Reihenfolge */
  types: string[];
}

const INDEXED: Indexed[] = [
  {
    name: 'web /',
    url: `${WEB}/`,
    canonical: 'https://psyber.tech/',
    types: ['Organization', 'WebSite', 'WebPage'],
  },
  {
    name: 'web /checkliste',
    url: `${WEB}/checkliste`,
    canonical: 'https://psyber.tech/checkliste',
    types: ['WebPage', 'BreadcrumbList'],
  },
  {
    name: 'web /impressum',
    url: `${WEB}/impressum`,
    canonical: 'https://psyber.tech/impressum',
    types: ['WebPage', 'BreadcrumbList'],
  },
  {
    name: 'web /datenschutz',
    url: `${WEB}/datenschutz`,
    canonical: 'https://psyber.tech/datenschutz',
    types: ['WebPage', 'BreadcrumbList'],
  },
  {
    name: 'forms /',
    url: `${FORMS}/`,
    canonical: 'https://forms.psyber.tech/',
    types: ['WebSite', 'WebPage'],
  },
];

/** Seiten, die in keiner Suchmaschine erscheinen sollen */
const HIDDEN = [
  `${WEB}/styleguide`,
  `${WEB}/gibt-es-nicht`,
  `${FORMS}/gibt-es-nicht`,
  `${SURPRISE}/gewinn`,
  `${SURPRISE}/gibt-es-nicht`,
];

const HOSTS: Record<string, string> = {
  'https://psyber.tech': WEB,
  'https://forms.psyber.tech': FORMS,
};

/** Übersetzt eine Adresse der Produktion in die des Testservers. */
function local(production: string): string {
  const url = new URL(production);
  const base = HOSTS[url.origin];
  if (!base) throw new Error(`Fremde Adresse: ${production}`);
  return `${base}${url.pathname}${url.search}`;
}

const decode = (text: string) =>
  text
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');

/** Liest aus dem rohen HTML, was im <head> für Suchmaschinen steht. */
function head(html: string) {
  const meta = (name: string) =>
    decode(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`).exec(html)?.[1] ?? '');
  const blocks = [
    ...html.matchAll(/<script type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g),
  ].map((match) => match[1] ?? '');
  return {
    title: decode(/<title>([^<]*)<\/title>/.exec(html)?.[1] ?? ''),
    description: meta('description'),
    robots: meta('robots'),
    canonical: /<link rel="canonical" href="([^"]*)"/.exec(html)?.[1] ?? null,
    ogUrl: meta('og:url'),
    ogImage: meta('og:image'),
    ogTitle: meta('og:title'),
    ogSiteName: meta('og:site_name'),
    h1: (html.match(/<h1[\s>]/g) ?? []).length,
    jsonLd: blocks,
  };
}

const fetchHtml = async (request: APIRequestContext, url: string) =>
  (await request.get(url)).text();

type Node = Record<string, unknown>;
const nodesOf = (block: string): Node[] => {
  const data = JSON.parse(block) as { '@context'?: string; '@graph'?: Node[] };
  expect(data['@context']).toBe('https://schema.org');
  return data['@graph'] ?? [];
};

test('Seiten im Index: Titel, Beschreibung, Canonical und Vorschau-Angaben', async ({
  request,
}) => {
  const titles = new Set<string>();
  const descriptions = new Set<string>();
  for (const page of INDEXED) {
    const meta = head(await fetchHtml(request, page.url));

    // Titel und Beschreibung: aussagekräftig, je Seite einmalig, ohne Platzhalter oder Preise
    expect(meta.title.length, `${page.name}: Titel`).toBeGreaterThanOrEqual(15);
    expect(meta.title.length, `${page.name}: Titel`).toBeLessThanOrEqual(70);
    expect(meta.title, page.name).toContain('PSYber');
    expect(meta.description.length, `${page.name}: Beschreibung`).toBeGreaterThanOrEqual(30);
    expect(meta.description.length, `${page.name}: Beschreibung`).toBeLessThanOrEqual(180);
    for (const text of [meta.title, meta.description]) {
      expect(text, page.name).not.toMatch(/TODO|CHF|undefined/);
    }
    expect(titles.has(meta.title), `${page.name}: Titel doppelt`).toBe(false);
    expect(descriptions.has(meta.description), `${page.name}: Beschreibung doppelt`).toBe(false);
    titles.add(meta.title);
    descriptions.add(meta.description);

    // Canonical zeigt auf die Seite selbst, absolut und ohne Parameter
    expect(meta.canonical, page.name).toBe(page.canonical);
    expect(meta.ogUrl, page.name).toBe(page.canonical);
    expect(meta.ogTitle, page.name).toBe(meta.title);
    expect(meta.ogSiteName, page.name).toBe('PSYber');

    // Im Index, mit grosser Bildvorschau und Textauszug ohne Längengrenze
    expect(meta.robots, page.name).toBe(
      'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
    );
    expect(meta.h1, `${page.name}: genau eine H1 im rohen HTML`).toBe(1);

    // Das Vorschaubild gibt es wirklich
    expect(meta.ogImage, page.name).toMatch(/^https:\/\/(forms\.)?psyber\.tech\/og\/[\w-]+\.png$/);
    const image = await request.get(local(meta.ogImage));
    expect(image.status(), `${page.name}: Vorschaubild`).toBe(200);
    expect(image.headers()['content-type']).toContain('image/png');
  }
});

test('Canonical bleibt gleich, auch wenn die Adresse Parameter trägt', async ({ request }) => {
  for (const [url, canonical] of [
    [`${WEB}/?ref=surprise`, 'https://psyber.tech/'],
    [`${WEB}/checkliste?ref=umfrage`, 'https://psyber.tech/checkliste'],
    [`${FORMS}/?quelle=instagram&fokus=vor`, 'https://forms.psyber.tech/'],
  ] as const) {
    expect(head(await fetchHtml(request, url)).canonical, url).toBe(canonical);
  }
});

test('Strukturierte Daten: gültig, verknüpft und ohne erfundene Angaben', async ({ request }) => {
  const ORGANIZATION = 'https://psyber.tech/#organization';
  for (const page of INDEXED) {
    const html = await fetchHtml(request, page.url);
    const meta = head(html);
    expect(meta.jsonLd, `${page.name}: genau ein Block`).toHaveLength(1);
    const raw = meta.jsonLd[0] ?? '';
    // Nichts Offenes, nichts vom Testserver, nichts, das das Skript-Element schliessen könnte
    expect(raw, page.name).not.toMatch(/TODO|undefined|localhost|127\.0\.0\.1|<|>/);

    const nodes = nodesOf(raw);
    expect(
      nodes.map((node) => node['@type']),
      page.name,
    ).toEqual(page.types);
    const byType = (type: string) => nodes.find((node) => node['@type'] === type);
    const origin = new URL(page.canonical).origin;

    const webPage = byType('WebPage')!;
    expect(webPage, page.name).toMatchObject({
      '@id': `${page.canonical}#webpage`,
      url: page.canonical,
      name: meta.title,
      description: meta.description,
      inLanguage: 'de-CH',
      isPartOf: { '@id': `${origin}/#website` },
      publisher: { '@id': ORGANIZATION },
      primaryImageOfPage: { '@type': 'ImageObject', url: meta.ogImage, width: 1200, height: 630 },
    });

    const breadcrumb = byType('BreadcrumbList');
    if (breadcrumb) {
      expect(webPage.breadcrumb).toEqual({ '@id': breadcrumb['@id'] });
      const items = breadcrumb.itemListElement as { position: number; item: string }[];
      expect(items.map((item) => item.position)).toEqual([1, 2]);
      expect(items[0]?.item).toBe(`${origin}/`);
      expect(items[1]?.item).toBe(page.canonical);
    }

    const website = byType('WebSite');
    if (website) {
      // Der Name der Website in den Treffern: nur auf der Startseite des Hosts
      expect(page.canonical).toBe(`${origin}/`);
      expect(website).toMatchObject({
        '@id': `${origin}/#website`,
        url: `${origin}/`,
        name: 'PSYber',
        inLanguage: 'de-CH',
        publisher: { '@id': ORGANIZATION },
      });
      expect(website.alternateName).toContain(new URL(origin).host);
    }

    const organization = byType('Organization');
    if (organization) {
      expect(organization).toMatchObject({
        '@id': ORGANIZATION,
        name: 'PSYber',
        url: 'https://psyber.tech/',
        slogan: 'Betrüger hassen diesen Blick.',
        areaServed: { '@type': 'Country', identifier: 'CH' },
      });
      // Nur diese Angaben sind belegt. Bewertungen, Preise, Adresse oder Profile wären erfunden,
      // solange sie nicht in der Konfiguration stehen.
      const allowed = new Set([
        '@type',
        '@id',
        'name',
        'alternateName',
        'url',
        'logo',
        'slogan',
        'description',
        'areaServed',
        'knowsAbout',
      ]);
      expect(
        Object.keys(organization).filter((key) => !allowed.has(key)),
        'unerwartete Angaben zur Organisation',
      ).toEqual([]);
      // Das Logo ist abrufbar, quadratisch und gross genug (Google: mindestens 112 px)
      const logo = organization.logo as { url: string; width: number; height: number };
      expect(logo.width).toBe(logo.height);
      expect(logo.width).toBeGreaterThanOrEqual(112);
      const response = await request.get(local(logo.url));
      expect(response.status()).toBe(200);
      expect(response.headers()['content-type']).toContain('image/png');
    }
  }
});

test('Seiten ausserhalb des Index: noindex, kein Canonical, keine strukturierten Daten', async ({
  request,
}) => {
  for (const url of HIDDEN) {
    const meta = head(await fetchHtml(request, url));
    expect(meta.robots, url).toBe('noindex, nofollow');
    expect(meta.canonical, url).toBeNull();
    expect(meta.ogUrl, url).toBe('');
    expect(meta.jsonLd, url).toEqual([]);
  }
});

test('robots.txt und Sitemap passen zu den Seiten', async ({ request }) => {
  // psyber.tech: alles erlaubt, die Sitemap ist genannt
  const robots = await (await request.get(`${WEB}/robots.txt`)).text();
  expect(robots).toMatch(/^User-agent: \*\nAllow: \/$/m);
  // Nichts steht unter Disallow: Seiten mit «noindex» müssen abrufbar bleiben.
  expect(robots).not.toMatch(/^Disallow:/m);
  const sitemapUrl = /^Sitemap: (\S+)$/m.exec(robots)?.[1] ?? '';
  expect(sitemapUrl).toBe('https://psyber.tech/sitemap-index.xml');

  const locs = (xml: string) => [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1] ?? '');
  const index = await request.get(local(sitemapUrl));
  expect(index.status()).toBe(200);
  const pages: string[] = [];
  for (const part of locs(await index.text())) {
    pages.push(...locs(await (await request.get(local(part))).text()));
  }

  // Genau die Seiten im Index, nicht mehr und nicht weniger
  const expected = INDEXED.filter((page) => page.canonical.startsWith('https://psyber.tech/'));
  expect(pages.sort()).toEqual(expected.map((page) => page.canonical).sort());
  for (const url of pages) {
    const response = await request.get(local(url));
    expect(response.status(), url).toBe(200);
    const meta = head(await response.text());
    expect(meta.canonical, url).toBe(url);
    expect(meta.robots, url).not.toContain('noindex');
  }

  // forms: offen, ohne Sitemap (eine einzige Seite)
  const forms = await (await request.get(`${FORMS}/robots.txt`)).text();
  expect(forms).toMatch(/^User-agent: \*\nAllow: \/$/m);
  expect(forms).not.toMatch(/^(Disallow|Sitemap):/m);
});

test('Favicon: auch als PNG, wie es die Google-Suche verlangt', async ({ request }) => {
  for (const base of [WEB, FORMS]) {
    const html = await fetchHtml(request, `${base}/`);
    expect(html).toContain(
      '<link rel="icon" href="/icon-192.png" type="image/png" sizes="192x192">',
    );
    const icon = await request.get(`${base}/icon-192.png`);
    expect(icon.status()).toBe(200);
    expect(icon.headers()['content-type']).toContain('image/png');
  }
});

test('Nachgestellte Betrugsnachrichten stehen nie im Textauszug eines Treffers', async ({
  page,
}) => {
  await page.goto(`${WEB}/`);
  const outside = await page.evaluate(() => {
    const fake = /paket-zustellung-ch\.info|karten-sicherheit-ch\.com|gutschein-sofort\.ch/;
    const found: string[] = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (!fake.test(node.textContent ?? '')) continue;
      // data-nosnippet gilt laut Google nur an span, div und section.
      if (!node.parentElement?.closest('span[data-nosnippet], div[data-nosnippet]')) {
        found.push((node.textContent ?? '').trim());
      }
    }
    return found;
  });
  expect(outside).toEqual([]);
  // Mindestens die SMS im Klick-Simulator und der Screenshot im Chat sind so markiert.
  expect(await page.locator('[data-nosnippet]').count()).toBeGreaterThanOrEqual(3);
});

test('Bestätigungscodes stehen nur im Kopf, wenn sie gesetzt sind', async ({ request }) => {
  const html = await fetchHtml(request, `${WEB}/`);
  expect(html).not.toContain('google-site-verification');
  expect(html).not.toContain('msvalidate.01');
});
