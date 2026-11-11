/**
 * Inhalte für /.well-known/security.txt (RFC 9116), /humans.txt und /robots.txt (RFC 9309).
 * `Expires` wird beim Build auf heute + 1 Jahr gesetzt: mindestens einmal pro Jahr neu bauen.
 */

/**
 * Suchmaschinen, die «noindex» beachten. Auf Sites, die nirgends erscheinen sollen, dürfen sie
 * als Einzige abrufen: Nur so sehen sie das «noindex» (Googlebot gilt auch für Bilder und News).
 */
export const SEARCH_CRAWLERS = ['Googlebot', 'bingbot', 'DuckDuckBot', 'Applebot'] as const;

/**
 * - `open`: Alles darf gelesen werden (psyber.tech, forms.psyber.tech).
 * - `search-only`: Nur Suchmaschinen dürfen abrufen, alle anderen bleiben draussen. Für Sites,
 *   deren Antworten «noindex» tragen (surprise.psyber.tech).
 * - `closed`: Niemand (Vorschau).
 */
export type RobotsMode = 'open' | 'search-only' | 'closed';

export interface RobotsOptions {
  /** Name der Site für die Kopfzeile, z. B. «psyber.tech» */
  host: string;
  mode: RobotsMode;
  /** Absolute Adresse der Sitemap (nur bei `open`) */
  sitemap?: string | undefined;
}

/**
 * robots.txt regelt nur, was Crawler abrufen dürfen. Aus Suchergebnissen hält sie nichts heraus:
 * Eine gesperrte Adresse kann trotzdem als blanker Treffer erscheinen, sobald jemand auf sie
 * verlinkt, und ihr «noindex» sieht dann kein Crawler. Darum steht hier nie eine Seite unter
 * Disallow, die per «noindex» verschwinden soll.
 */
export function robotsTxt({ host, mode, sitemap }: RobotsOptions): string {
  if (mode === 'closed') {
    return [
      `# ${host} (Vorschau): nichts für Suchmaschinen`,
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  if (mode === 'search-only') {
    return [
      `# ${host}`,
      '# Diese Site soll in keiner Suchmaschine erscheinen: Jede Antwort trägt «noindex».',
      '# Suchmaschinen dürfen die Seiten abrufen, damit sie dieses «noindex» sehen. Wären sie',
      '# ausgesperrt, könnte die blosse Adresse trotzdem in Treffern stehen.',
      '# Alle anderen Crawler bleiben draussen.',
      '',
      ...SEARCH_CRAWLERS.map((crawler) => `User-agent: ${crawler}`),
      'Allow: /',
      '',
      'User-agent: *',
      'Disallow: /',
      '',
    ].join('\n');
  }
  return [
    `# ${host}`,
    '# Alles darf gelesen werden. Seiten, die nicht in Suchergebnisse gehören, tragen «noindex»',
    '# und stehen bewusst nicht unter Disallow: Ein Crawler, der eine Seite nicht abrufen darf,',
    '# sieht ihr «noindex» nie.',
    '',
    'User-agent: *',
    'Allow: /',
    '',
    ...(sitemap ? [`Sitemap: ${sitemap}`, ''] : []),
  ].join('\n');
}

export function securityTxt(origin: string, now: Date = new Date()): string {
  const expires = new Date(now);
  expires.setUTCFullYear(expires.getUTCFullYear() + 1);
  expires.setUTCHours(0, 0, 0, 0);
  const canonical = new URL('/.well-known/security.txt', origin).href;
  return [
    'Contact: mailto:security@psyber.tech',
    `Expires: ${expires.toISOString().replace('.000Z', 'Z')}`,
    'Preferred-Languages: de, en',
    `Canonical: ${canonical}`,
    '',
  ].join('\n');
}

export function humansTxt(site: string): string {
  return [
    '/* TEAM */',
    'PSYber: Cyber-Prävention für Familien',
    'Kontakt: security@psyber.tech',
    'Ort: Schweiz',
    '',
    '/* SITE */',
    `Site: ${site}`,
    'Sprache: Deutsch (Schweiz)',
    'Technik: Astro, Tailwind CSS, GSAP, Lenis, Cloudflare Workers',
    'Schriften: Manrope und Geist Mono (SIL Open Font License)',
    'Icons: Lucide (ISC License)',
    'Cookies: 0. Tracking-Pixel: 0. Deepfakes: 0. Nerds: genau einer.',
    '',
    '/* MOTTO */',
    'Betrüger hassen diesen Blick.',
    'Wir patchen Layer 8.',
    '',
  ].join('\n');
}
