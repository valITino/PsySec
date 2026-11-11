// Adressen der drei Websites und der API, abgeleitet aus Umgebungsvariablen.
// Wird sowohl von den astro.config-Dateien (Node) als auch vom App-Code (Vite) genutzt.

/** @typedef {'web' | 'forms' | 'surprise'} SiteName */

export const PROD_URLS = Object.freeze({
  web: 'https://psyber.tech',
  forms: 'https://forms.psyber.tech',
  surprise: 'https://surprise.psyber.tech',
  api: 'https://api.psyber.tech',
});

export const DEV_URLS = Object.freeze({
  web: 'http://localhost:4321',
  forms: 'http://localhost:4322',
  surprise: 'http://localhost:4323',
  api: 'http://localhost:8787',
});

/** Offizielle Turnstile-Testkeys von Cloudflare (bestehen immer, sichtbar bzw. unsichtbar). */
export const TURNSTILE_TEST_KEYS = Object.freeze({
  visible: '1x00000000000000000000AA',
  invisible: '1x00000000000000000000BB',
});

const trim = (value) => String(value).trim().replace(/\/+$/, '');
const pick = (value, fallback) => (value && String(value).trim() ? trim(value) : fallback);

/**
 * @param {Record<string, string | boolean | undefined>} env  z. B. import.meta.env oder process.env
 * @param {{ dev?: boolean }} [options]
 */
export function resolveSites(env, options = {}) {
  const defaults = options.dev ? DEV_URLS : PROD_URLS;
  const web = pick(env.PUBLIC_WEB_URL, defaults.web);
  const forms = pick(env.PUBLIC_FORMS_URL, defaults.forms);
  const surprise = pick(env.PUBLIC_SURPRISE_URL, defaults.surprise);
  const apiRaw = pick(env.PUBLIC_API_BASE, defaults.api);
  const apiMock = apiRaw === 'mock';
  const phase = env.PUBLIC_SITE_PHASE === 'launch' ? 'launch' : 'survey';
  const preview = env.PUBLIC_PREVIEW === 'true' || env.PUBLIC_PREVIEW === true;
  return {
    web,
    forms,
    surprise,
    /** Basis-URL der API ohne Slash am Ende; leer, wenn die API im Browser simuliert wird */
    api: apiMock ? '' : apiRaw,
    /** `true`: keine Netzwerk-Requests, Formulare antworten simuliert (Vorschau, Phase 1) */
    apiMock,
    /** Origin der API für connect-src; leer bei simulierter API */
    apiOrigin: apiMock ? '' : new URL(apiRaw).origin,
    phase,
    preview,
    turnstileSiteKey: pick(env.PUBLIC_TURNSTILE_SITE_KEY, ''),
    /** `true`: HSTS-Header mit `preload` (erst nach stabilem Betrieb, siehe docs/DEPLOY.md) */
    hstsPreload: env.PUBLIC_HSTS_PRELOAD === 'true' || env.PUBLIC_HSTS_PRELOAD === true,
  };
}

/**
 * Zerlegt die Adresse einer Site in Astros `site` und `base`.
 * https://psyber.tech               → site https://psyber.tech, base ''
 * https://user.github.io/Repo/forms → site https://user.github.io, base '/Repo/forms'
 * @param {string} url
 */
export function splitSiteUrl(url) {
  const parsed = new URL(url);
  const base = parsed.pathname.replace(/\/+$/, '');
  return { site: parsed.origin, base };
}

/**
 * Baut einen Link innerhalb einer Site, mit Basis-Pfad.
 * joinPath('/Repo', '/checkliste') → '/Repo/checkliste'; joinPath('', '/') → '/'
 * @param {string} base
 * @param {string} path
 */
export function joinPath(base, path = '/') {
  const clean = path.startsWith('/') ? path : `/${path}`;
  return `${base}${clean}` || '/';
}
