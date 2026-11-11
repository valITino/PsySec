/**
 * Inhalte für /.well-known/security.txt (RFC 9116) und /humans.txt.
 * `Expires` wird beim Build auf heute + 1 Jahr gesetzt: mindestens einmal pro Jahr neu bauen.
 */

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
    'PSYber: Cyber-Prävention für Familien im Raum Zürich',
    'Kontakt: security@psyber.tech',
    'Ort: Zürich, Schweiz',
    '',
    '/* SITE */',
    `Site: ${site}`,
    'Sprache: Deutsch (Schweiz)',
    'Technik: Astro, Tailwind CSS, GSAP, Lenis, Cloudflare Workers',
    'Schrift: Manrope und Geist Mono (SIL Open Font License)',
    'Icons: Lucide (ISC License)',
    'Cookies: 0. Tracking-Pixel: 0. Deepfakes: 0. Nerds: genau einer.',
    '',
    '/* MOTTO */',
    'Wir patchen Layer 8.',
    '',
  ].join('\n');
}
