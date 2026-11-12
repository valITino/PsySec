/**
 * Herkunft eines Einstiegs, im Browser bestimmt. Von der verweisenden Seite bleibt nur ihre Art
 * (Suche, soziales Netz, andere Website); ihre Adresse wird nie gesendet.
 * Ohne DOM, damit sich die Regeln einzeln prüfen lassen (scripts/track.test.ts).
 */

/** Werte von `?quelle=`; deckungsgleich mit QUELLEN in packages/survey (ein Test prüft das) */
export const SOURCE_TAGS: readonly string[] = [
  'instagram',
  'tiktok',
  'facebook',
  'linkedin',
  'whatsapp',
  'flyer',
  'vortrag',
  'website',
  'empfehlung',
];

export type ReferrerKind = 'suche' | 'social' | 'verweis';

const SEARCH = [
  'google',
  'bing',
  'duckduckgo',
  'ecosia',
  'startpage',
  'qwant',
  'yahoo',
  'yandex',
  'swisscows',
  'kagi',
  'brave',
];
const SOCIAL = [
  'facebook',
  'instagram',
  'linkedin',
  'tiktok',
  'twitter',
  'youtube',
  'whatsapp',
  'reddit',
  'threads',
  'pinterest',
  'snapchat',
  'telegram',
];
/** Kurzadressen, in denen der Name des Dienstes nicht vorkommt */
const SOCIAL_SHORT = ['t.co', 'x.com', 'lnkd.in', 'youtu.be', 'wa.me', 't.me', 'fb.me'];

/** Art einer verweisenden Seite, abgelesen am Hostnamen (auch bei `android-app://…`). */
export function kindOf(host: string): ReferrerKind {
  const name = host.toLowerCase().replace(/^www\./, '');
  if (SOCIAL_SHORT.includes(name)) return 'social';
  // ohne die Endung: «google.ch», «l.instagram.com», «com.linkedin.android»
  const labels = name.split('.').slice(0, -1);
  if (labels.some((label) => SEARCH.includes(label))) return 'suche';
  if (labels.some((label) => SOCIAL.includes(label))) return 'social';
  return 'verweis';
}

/**
 * Herkunft für einen Seitenaufruf. `undefined` heisst: kein Einstieg, jemand kommt von einer
 * unserer eigenen Seiten.
 *
 * @param search    Abfrageteil der aufgerufenen Adresse, z. B. `?quelle=flyer`
 * @param referrer  `document.referrer`; kann leer sein
 * @param ownHosts  Hostnamen unserer eigenen Websites
 */
export function sourceOf(
  search: string,
  referrer: string,
  ownHosts: readonly string[],
): string | undefined {
  const params = new URLSearchParams(search);
  // Wie in der Umfrage: bekannte Werte bleiben, unbekannte werden zu «andere».
  const tag = (params.get('quelle') ?? '').trim().toLowerCase();
  if (tag) return SOURCE_TAGS.includes(tag) ? tag : 'andere';
  // `?ref=` hängen nur unsere eigenen Seiten an (Umfrage, «Erwischt!»).
  if (params.has('ref')) return undefined;
  if (!referrer) return 'direkt';
  let host: string;
  try {
    host = new URL(referrer).hostname;
  } catch {
    return 'direkt';
  }
  if (!host) return 'direkt';
  return ownHosts.includes(host) ? undefined : kindOf(host);
}
