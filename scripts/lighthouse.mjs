// Lighthouse (mobil) für die drei Websites, gegen den lokalen Build.
// Ziel aus dem Auftrag: mindestens 95 in allen Kategorien, LCP unter 2 s, CLS unter 0.05.
//
// Aufruf: pnpm build && pnpm lighthouse [--only web|forms|surprise]
// Lighthouse wird bei Bedarf per «pnpm dlx» geladen (keine feste Abhängigkeit im Repo).
// Die Berichte liegen danach in reports/lighthouse/ (nicht versioniert).
// Hinweis: Lokal fehlen HTTPS und das Netz von Cloudflare. Nach dem Go-Live zusätzlich
// gegen die echten Adressen messen (docs/DEPLOY.md, Schritt 8).
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { serve } from './serve.mjs';

const LIGHTHOUSE = 'lighthouse@13.6.0';
const CHROME = process.env.CHROME_PATH ?? '/opt/pw-browsers/chromium';
const OUT = 'reports/lighthouse';

const TARGETS = [
  { site: 'web', dir: 'apps/web/dist', port: 4341, path: '/' },
  { site: 'web', dir: 'apps/web/dist', port: 4341, path: '/checkliste' },
  { site: 'forms', dir: 'apps/forms/dist', port: 4342, path: '/' },
  // noindex ist hier Absicht: die SEO-Kategorie wertet das als Fehler und zählt darum nicht.
  { site: 'surprise', dir: 'apps/surprise/dist', port: 4343, path: '/gewinn', noindex: true },
];
const CATEGORIES = ['performance', 'accessibility', 'best-practices', 'seo'];
const MIN_SCORE = 95;
const MAX_LCP = 2000;
const MAX_CLS = 0.05;

const only = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;
mkdirSync(OUT, { recursive: true });

const servers = new Map();
const problems = [];
try {
  for (const target of TARGETS) {
    if (only && target.site !== only) continue;
    if (!servers.has(target.port)) {
      servers.set(
        target.port,
        await serve({ dir: target.dir, port: target.port, quiet: true, production: true }),
      );
    }
    const name = `${target.site}${target.path === '/' ? '' : target.path.replaceAll('/', '-')}`;
    // Asynchron starten: Der Server läuft im selben Prozess und muss weiter antworten können.
    const status = await new Promise((done) => {
      const child = spawn(
        'pnpm',
        [
          'dlx',
          LIGHTHOUSE,
          `http://localhost:${target.port}${target.path}`,
          '--output=json',
          '--output=html',
          `--output-path=${OUT}/${name}`,
          '--quiet',
          '--max-wait-for-load=45000',
          '--chrome-flags=--headless=new --no-sandbox --disable-gpu',
        ],
        {
          stdio: ['ignore', 'ignore', 'inherit'],
          env: { ...process.env, ...(existsSync(CHROME) ? { CHROME_PATH: CHROME } : {}) },
        },
      );
      child.on('close', done);
      child.on('error', () => done(1));
    });
    const report = `${OUT}/${name}.report.json`;
    if (status !== 0 || !existsSync(report)) {
      problems.push(`${name}: Lighthouse ist nicht durchgelaufen`);
      continue;
    }
    const lhr = JSON.parse(readFileSync(report, 'utf8'));
    const scores = Object.fromEntries(
      CATEGORIES.map((id) => [id, Math.round((lhr.categories[id]?.score ?? 0) * 100)]),
    );
    const lcp = lhr.audits['largest-contentful-paint']?.numericValue ?? 0;
    const cls = lhr.audits['cumulative-layout-shift']?.numericValue ?? 0;
    const tbt = lhr.audits['total-blocking-time']?.numericValue ?? 0;
    console.log(
      `${name.padEnd(18)} Perf ${scores.performance}  A11y ${scores.accessibility}  ` +
        `Best ${scores['best-practices']}  SEO ${scores.seo}${target.noindex ? ' (noindex)' : ''}  ` +
        `LCP ${(lcp / 1000).toFixed(2)} s  CLS ${cls.toFixed(3)}  TBT ${Math.round(tbt)} ms`,
    );
    for (const id of CATEGORIES) {
      if (id === 'seo' && target.noindex) continue;
      if (scores[id] < MIN_SCORE) {
        const failed = (lhr.categories[id]?.auditRefs ?? [])
          .map((ref) => lhr.audits[ref.id])
          .filter(
            (audit) =>
              audit && audit.score !== null && audit.score < 0.9 && weightOf(lhr, id, audit.id) > 0,
          )
          .map((audit) => audit.id);
        problems.push(`${name}: ${id} ${scores[id]} < ${MIN_SCORE} (${failed.join(', ')})`);
      }
    }
    if (lcp > MAX_LCP) problems.push(`${name}: LCP ${Math.round(lcp)} ms > ${MAX_LCP} ms`);
    if (cls > MAX_CLS) problems.push(`${name}: CLS ${cls.toFixed(3)} > ${MAX_CLS}`);
  }
} finally {
  for (const server of servers.values()) server.close();
}

function weightOf(lhr, category, auditId) {
  return lhr.categories[category]?.auditRefs.find((ref) => ref.id === auditId)?.weight ?? 0;
}

if (problems.length > 0) {
  console.error(`\n${problems.length} Abweichung(en) vom Ziel:`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log(`\nAlle Ziele erreicht (mindestens ${MIN_SCORE}, LCP < 2 s, CLS < ${MAX_CLS}).`);
