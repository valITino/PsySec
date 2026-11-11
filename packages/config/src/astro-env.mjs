// Liest die PUBLIC_-Variablen für astro.config-Dateien (dort gibt es noch kein import.meta.env).
import { loadEnv } from 'vite';
import { resolveSites } from './sites.mjs';

/** `astro dev` → Entwicklungs-Standardwerte (localhost); alles andere → Produktionswerte. */
export const isDevCommand = () => process.argv.includes('dev');

/** @param {string} [cwd] Verzeichnis der App */
export function loadSites(cwd = process.cwd()) {
  const dev = isDevCommand();
  const env = loadEnv(dev ? 'development' : 'production', cwd, 'PUBLIC_');
  return { dev, sites: resolveSites(env, { dev }) };
}

/**
 * Sites mit Formular brauchen den Turnstile Site Key schon beim Build (er steht im HTML).
 * Fehlt er, lehnt die API später jede Einsendung ab. Bei Cloudflare (Workers Builds setzt
 * WORKERS_CI) bricht der Build darum ab, statt ein kaputtes Formular auszuliefern.
 * @param {{ apiMock: boolean, turnstileSiteKey: string }} sites
 * @param {string} app Name der App für die Fehlermeldung
 */
export function requireTurnstile(sites, app) {
  if (sites.apiMock || sites.turnstileSiteKey || !process.env.WORKERS_CI) return;
  throw new Error(
    `[${app}] PUBLIC_TURNSTILE_SITE_KEY fehlt. Bitte als Build-Variable setzen ` +
      '(siehe docs/DEPLOY.md, Schritt 6). Ohne Site Key lehnt die API jede Einsendung ab.',
  );
}
