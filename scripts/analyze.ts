/**
 * Auswertung der Umfrage (Auftrag 8.5).
 *
 * Aufruf: pnpm analyze                       neuester Export aus reports/
 *         pnpm analyze reports/export-….json bestimmter Export
 *         pnpm analyze --demo                erfundene Beispieldaten (Bericht ist als Demo markiert)
 *
 * Eingabe:  reports/export-YYYY-MM-DD.json (aus «pnpm export», ohne E-Mail-Adressen)
 * Ausgabe:  reports/umfrage-YYYY-MM-DD.html (eine Datei, keine externen Ressourcen)
 */
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { analyze, parseExport, type Analysis, type ExportData } from './analyze/compute.ts';
import { demoExport } from './analyze/demo.ts';
import { fmtChf, fmtPct, renderReport } from './analyze/report.ts';

const args = process.argv.slice(2);
const demo = args.includes('--demo');
const file = args.find((arg) => !arg.startsWith('--'));

function newestExport(): string | null {
  try {
    const files = readdirSync('reports')
      .filter((name) => /^export-\d{4}-\d{2}-\d{2}\.json$/.test(name))
      .sort();
    const newest = files[files.length - 1];
    return newest ? resolve('reports', newest) : null;
  } catch {
    return null;
  }
}

function load(): { data: ExportData; source: string } {
  if (demo) return { data: demoExport(), source: 'Demo-Daten' };
  const path = file ? resolve(file) : newestExport();
  if (!path) {
    console.error(
      'Kein Export gefunden. Zuerst «pnpm export» ausführen oder «pnpm analyze --demo».',
    );
    process.exit(1);
  }
  const day = /(\d{4}-\d{2}-\d{2})/.exec(basename(path))?.[1] ?? '';
  try {
    return { data: parseExport(JSON.parse(readFileSync(path, 'utf8')), day), source: path };
  } catch (error) {
    console.error(`✗ ${path}: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

function summary(analysis: Analysis): string[] {
  const state = { met: '✓', near: '~', missed: '✗' } as const;
  return [
    `Antworten: ${analysis.n}`,
    ...analysis.criteria.map((entry) => {
      const value =
        entry.value === null
          ? 'nicht berechenbar'
          : entry.unit === 'share'
            ? fmtPct(entry.value)
            : entry.unit === 'chf'
              ? fmtChf(entry.value)
              : String(entry.value);
      const target =
        entry.unit === 'share'
          ? fmtPct(entry.target)
          : entry.unit === 'chf'
            ? fmtChf(entry.target)
            : String(entry.target);
      return `  ${state[entry.state]} ${entry.label}: ${value} (Ziel mindestens ${target})`;
    }),
    `Ampel: ${{ go: 'Go', almost: 'Fast', 'no-go': 'No-Go' }[analysis.verdict]}`,
  ];
}

const { data, source } = load();
const analysis = analyze(data);
const day =
  analysis.exportedDay ||
  new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Zurich' }).format(new Date());
mkdirSync('reports', { recursive: true });
const target = resolve('reports', demo ? 'umfrage-demo.html' : `umfrage-${day}.html`);
writeFileSync(target, renderReport({ ...analysis, exportedDay: day }));

console.log(`Quelle: ${source}`);
for (const line of summary(analysis)) console.log(line);
console.log(`Bericht: ${target}`);
