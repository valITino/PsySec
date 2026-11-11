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
