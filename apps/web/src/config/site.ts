/**
 * Zentrale Konfiguration von psyber.tech: Phase, Links, Kontaktdaten, Preise, Quellen.
 *
 * ACHTUNG: Diese Datei nur serverseitig (Astro-Frontmatter) importieren, nie in <script>-Code.
 * So landen die Preise in der Phase `survey` garantiert nicht im ausgelieferten HTML oder JS.
 */
import { TURNSTILE_TEST_KEYS, joinPath, resolveSites, splitSiteUrl } from '@psyber/config/sites';

export const sites = resolveSites(import.meta.env, { dev: import.meta.env.DEV });

/** Turnstile Site Key; im Dev-Modus ohne Angabe der offizielle Testkey (besteht immer). */
export const turnstileSiteKey =
  sites.turnstileSiteKey || (import.meta.env.DEV ? TURNSTILE_TEST_KEYS.visible : '');

const { site: origin, base } = splitSiteUrl(sites.web);

/** Basis-Pfad ohne Slash am Ende ('' in Produktion, z. B. '/PsySec' in der Vorschau) */
export const basePath = base;

/** Link innerhalb von psyber.tech, inklusive Basis-Pfad */
export const href = (path = '/') => joinPath(base, path);

/** Absolute Adresse, z. B. für Canonical und Open Graph */
export const absoluteUrl = (path = '/') => new URL(href(path), origin).href;

// ---------------------------------------------------------------- Phase

/** `survey` (Standard): keine Preise, CTA zur Umfrage. `launch`: Preise sichtbar, CTA zum Kontakt. */
export const phase = sites.phase;
export const isLaunch = phase === 'launch';

export type Fokus = 'vor' | 'nach' | 'unklar';

/** Link zur Umfrage, markiert mit der Quelle «website» */
export const surveyUrl = (fokus?: Fokus) =>
  `${sites.forms}/?quelle=website${fokus ? `&fokus=${fokus}` : ''}`;

/** Primärer CTA gemäss Phase. `onHome`: Ankerlink ohne Seitenwechsel. */
export const primaryCta = (onHome = true) =>
  isLaunch
    ? { label: 'Session anfragen', href: onHome ? '#kontakt' : href('/#kontakt'), external: false }
    : { label: 'Zur Umfrage', href: surveyUrl(), external: true };

// ---------------------------------------------------------------- Navigation

export const nav = [
  { label: 'Angebot', hash: '#angebot' },
  { label: 'Maschen', hash: '#maschen' },
  { label: 'Ablauf', hash: '#ablauf' },
  { label: 'Über', hash: '#ueber' },
  { label: 'Kontakt', hash: '#kontakt' },
] as const;

// ---------------------------------------------------------------- Kontakt

/** Fehlende Angaben bleiben als sichtbare Platzhalter stehen (siehe docs/TODO.md). */
export const contact = {
  email: '[TODO: E-Mail]',
  phone: '[TODO: Telefon/WhatsApp]',
  region: 'Stadt und Kanton Zürich',
  security: 'security@psyber.tech',
} as const;

export const isTodo = (value: string) => value.startsWith('[TODO');

/** Sektion «Über»: Angaben folgen (siehe docs/TODO.md). Nichts erfinden. */
export const about = {
  name: '[TODO: Name]',
  rolle: '[TODO: z. B. Cybersecurity-Spezialist]',
  warum: '[TODO: 2–3 Sätze Motivation]',
  foto: '[TODO: Foto]',
} as const;

// ---------------------------------------------------------------- Preise (nur bei `launch` anzeigen)

export const prices = {
  ping: { amount: 'CHF 190–250', unit: 'einmalig' },
  patch: { amount: 'CHF 490–690', unit: 'einmalig' },
  shield: { amount: 'CHF 29–39', unit: 'pro Monat' },
  sentinel: { amount: 'CHF 79–99', unit: 'pro Monat' },
} as const;

export type PackageId = keyof typeof prices;

// ---------------------------------------------------------------- Quellen (Abschnitt 5.17, nur diese)

export const sources = {
  crimeSurvey: {
    label: 'Crime Survey 2025, ZHAW und Universität St. Gallen',
    url: 'https://www.zhaw.ch/de/ueber-uns/aktuell/news/detailansicht-news/event-news/crime-survey-2025-mehr-menschen-in-der-schweiz-erleben-straftaten',
  },
  bacsHalbjahr: {
    label: 'BACS, Halbjahresbericht 2025/I',
    url: 'https://www.netzwoche.ch/news/2025-11-19/betrueger-missbrauchen-vermehrt-promis-als-lockvoegel',
  },
  bacsJahr: {
    label: 'BACS-Jahresrückblick 2025',
    url: 'https://www.netzwoche.ch/news/2026-01-06/cybervorfaelle-nehmen-2025-nur-leicht-zu-aber-das-ist-kein-grund-zur-entwarnung',
  },
  kriminalstatistik: {
    label: 'Polizeiliche Kriminalstatistik 2025',
    url: 'https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/sicherheit-internet/',
  },
  kapoRomance: {
    label: 'Kantonspolizei Zürich',
    url: 'https://www.zh.ch/de/news-uebersicht/mitteilungen/2022/sicherheit-justiz/kantonspolizei/220214-romance_scam.html',
  },
  crimeSurveyMobbing: {
    label: 'Crime Survey 2025',
    url: 'https://www.cash.ch/news/starker-anstieg-von-betrugsdelikten-in-der-schweiz-976819',
  },
  bacsMelden: {
    label: 'Meldeformular des BACS',
    url: 'https://www.report.ncsc.admin.ch/de/',
  },
  finma: {
    label: 'Warnliste der FINMA',
    url: 'https://www.finma.ch/de/finma-public/warnungen/warnliste/',
  },
  skppsc: {
    label: 'Schweizerische Kriminalprävention',
    url: 'https://www.skppsc.ch/de/themen/internet/',
  },
  cybercrimepolice: {
    label: 'Warnungen der Kantonspolizei Zürich',
    url: 'https://www.cybercrimepolice.ch',
  },
} as const;

// ---------------------------------------------------------------- Meta

export const meta = {
  name: 'PSYber',
  /** Slogan zur Eule (Logo-Kit) */
  slogan: 'Betrüger hassen diesen Blick.',
  claim: 'Wir patchen Layer 8.',
  defaultDescription:
    'PSYber zeigt Familien im Raum Zürich, wie Online-Betrug funktioniert, und sichert das Heimnetz gleich mit ab. Sicherheit, die beim Menschen anfängt.',
  ogImage: '/og/psyber.png',
} as const;
