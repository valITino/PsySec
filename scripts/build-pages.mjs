// Vorschau-Build für GitHub Pages: alle drei Websites unter einer Adresse.
//
//   <PAGES_URL>/            psyber.tech
//   <PAGES_URL>/forms/      forms.psyber.tech
//   <PAGES_URL>/surprise/   surprise.psyber.tech
//
// Die API läuft dort nicht: Formulare antworten simuliert (PUBLIC_API_BASE=mock), es wird
// nichts gespeichert. Alle Seiten sind noindex. Das ist nur zum Testen gedacht; der echte
// Betrieb läuft über Cloudflare (siehe docs/DEPLOY.md).
//
// Aufruf: pnpm build:pages            (Standard: https://valitino.github.io/PsySec)
//         PAGES_URL=https://<user>.github.io/<repo> pnpm build:pages
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const out = resolve(root, 'dist-pages');

const raw = (process.env.PAGES_URL || 'https://valitino.github.io/PsySec').replace(/\/+$/, '');
const parsed = new URL(raw);
// Hostnamen sind klein geschrieben, der Pfad behält die Schreibweise des Repos.
const pagesUrl = `${parsed.protocol}//${parsed.host.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}`;

const env = {
  ...process.env,
  ASTRO_TELEMETRY_DISABLED: '1',
  PUBLIC_WEB_URL: pagesUrl,
  PUBLIC_FORMS_URL: `${pagesUrl}/forms`,
  PUBLIC_SURPRISE_URL: `${pagesUrl}/surprise`,
  PUBLIC_API_BASE: 'mock',
  PUBLIC_PREVIEW: 'true',
  PUBLIC_SITE_PHASE: process.env.PUBLIC_SITE_PHASE === 'launch' ? 'launch' : 'survey',
};

const apps = [
  { name: '@psyber/web', dir: 'apps/web', target: '' },
  { name: '@psyber/forms', dir: 'apps/forms', target: 'forms' },
  { name: '@psyber/surprise', dir: 'apps/surprise', target: 'surprise' },
];

console.log(`Vorschau-Build für ${pagesUrl} (Phase: ${env.PUBLIC_SITE_PHASE})`);
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

for (const app of apps) {
  execFileSync('pnpm', ['--filter', app.name, 'build'], { cwd: root, env, stdio: 'inherit' });
  const dist = resolve(root, app.dir, 'dist');
  const target = resolve(out, app.target);
  cpSync(dist, target, { recursive: true });
  // Cloudflare-Dateien haben auf GitHub Pages keine Wirkung.
  for (const file of ['_headers', '_redirects']) {
    rmSync(resolve(target, file), { force: true });
  }
}

// Ohne Jekyll ausliefern (Ordner mit Unterstrich wie _astro bleiben erhalten).
writeFileSync(resolve(out, '.nojekyll'), '');

if (!existsSync(resolve(out, 'index.html'))) {
  throw new Error('dist-pages/index.html fehlt: Build von apps/web prüfen.');
}
console.log(`\nFertig: ${out}`);
console.log(
  `Lokal ansehen: node scripts/serve.mjs dist-pages --base ${parsed.pathname.replace(/\/+$/, '') || '/'}`,
);
