/** Adressen und Links von forms.psyber.tech. */
import { TURNSTILE_TEST_KEYS, joinPath, resolveSites, splitSiteUrl } from '@psyber/config/sites';

export const sites = resolveSites(import.meta.env, { dev: import.meta.env.DEV });

/** Turnstile Site Key; im Dev-Modus ohne Angabe der offizielle unsichtbare Testkey. */
export const turnstileSiteKey =
  sites.turnstileSiteKey || (import.meta.env.DEV ? TURNSTILE_TEST_KEYS.invisible : '');

const { site: origin, base } = splitSiteUrl(sites.forms);

export const basePath = base;
export const href = (path = '/') => joinPath(base, path);
export const absoluteUrl = (path = '/') => new URL(href(path), origin).href;

/** Links auf psyber.tech */
export const web = {
  home: `${sites.web}/`,
  impressum: `${sites.web}/impressum`,
  datenschutz: `${sites.web}/datenschutz`,
  checkliste: `${sites.web}/checkliste?ref=umfrage`,
} as const;

/** Alles, was die Umfrage im Browser braucht (wird als Prop an das Island gegeben). */
export const surveyConfig = {
  /** Basis-URL der API; leer = simuliert */
  api: sites.api,
  turnstileSiteKey: sites.apiMock ? '' : turnstileSiteKey,
  links: {
    home: web.home,
    impressum: web.impressum,
    datenschutz: web.datenschutz,
    /** Link 1 auf dem Danke-Screen */
    checkliste: web.checkliste,
    /** Link 2 auf dem Danke-Screen (Phishing-Test); `s` = Antwort auf Frage 4 */
    gewinn: `${sites.surprise}/gewinn?ref=umfrage`,
    /** Zum Weitergeben */
    share: `${sites.forms}/?quelle=empfehlung`,
  },
} as const;

export type SurveyConfig = typeof surveyConfig;
