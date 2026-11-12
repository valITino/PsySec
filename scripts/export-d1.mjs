// Export für die Auswertung: holt die anonymen Antworten, die Zähler und zwei Summen der
// Warteliste aus D1 und schreibt sie als JSON nach reports/export-YYYY-MM-DD.json.
//
// Aufruf: pnpm export            (Produktion; vorher einmal «pnpm --filter @psyber/api exec wrangler login»)
//         pnpm export --local    (lokale Datenbank von «wrangler dev», zum Ausprobieren)
// Danach: pnpm analyze
//
// Der lokale Export bekommt einen eigenen Namen (export-local-YYYY-MM-DD.json): Er überschreibt
// nie den Export der Umfrage vom selben Tag, und «pnpm analyze» nimmt ihn nicht von selbst.
//
// Datenschutz: E-Mail-Adressen und Kontaktanfragen werden NICHT exportiert. Von der Warteliste
// kommen nur zwei Zahlen (Einträge gesamt, davon Founding Families).
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

/** Reihenfolge = Reihenfolge der Ergebnisse im Export */
const QUERIES = {
  responses: 'SELECT * FROM survey_responses ORDER BY created_day, id',
  counters: 'SELECT event, s_bucket, day, count FROM counters ORDER BY day, event, s_bucket',
  waitlist: 'SELECT COUNT(*) AS total, COALESCE(SUM(founding_family), 0) AS founding FROM waitlist',
};

const local = process.argv.includes('--local');
const result = spawnSync(
  'pnpm',
  [
    'exec',
    'wrangler',
    'd1',
    'execute',
    'psyber',
    local ? '--local' : '--remote',
    '--json',
    '--command',
    Object.values(QUERIES).join('; '),
  ],
  {
    cwd: 'apps/api',
    encoding: 'utf8',
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false' },
    maxBuffer: 256 * 1024 * 1024,
  },
);

if (result.status !== 0) {
  console.error(result.stderr || result.stdout);
  console.error('✗ Export fehlgeschlagen. Angemeldet? («wrangler login» in apps/api)');
  process.exit(result.status ?? 1);
}

/** wrangler gibt ein Array mit einem Eintrag pro Abfrage aus: [{ results: [...] }, ...] */
let sets;
try {
  const start = result.stdout.indexOf('[');
  sets = JSON.parse(result.stdout.slice(start));
} catch {
  console.error(result.stdout.slice(0, 2000));
  console.error('✗ Die Ausgabe von wrangler liess sich nicht als JSON lesen.');
  process.exit(1);
}
const names = Object.keys(QUERIES);
if (!Array.isArray(sets) || sets.length !== names.length) {
  console.error(`✗ Erwartet wurden ${names.length} Ergebnisse, erhalten: ${sets?.length}`);
  process.exit(1);
}

const day = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
const data = {
  exportedDay: day,
  source: local ? 'local' : 'remote',
  responses: sets[0].results ?? [],
  counters: sets[1].results ?? [],
  waitlist: sets[2].results?.[0] ?? { total: 0, founding: 0 },
};

mkdirSync('reports', { recursive: true });
const name = local ? `export-local-${day}.json` : `export-${day}.json`;
const file = resolve('reports', name);
writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
console.log(
  `✓ ${local ? 'Lokale Testdaten' : 'Umfrage'}: ${data.responses.length} Antworten, ` +
    `${data.counters.length} Zählerzeilen, ` +
    `Warteliste ${data.waitlist.total} (davon ${data.waitlist.founding} Founding Families)`,
);
console.log(`  ${file}`);
console.log(`  Weiter mit: pnpm analyze${local ? ` reports/${name}` : ''}`);
