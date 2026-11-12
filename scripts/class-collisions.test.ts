import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Wächter gegen Klassen-Kollisionen: Scoped Styles einer Astro-Komponente dürfen keine Klasse
 * des Designsystems (packages/ui/src/styles/components.css) unter demselben Namen neu anlegen.
 * Sonst gelten beide Regeln zugleich. So verschwand einmal das Chat-Mockup auf dem Handy:
 * Ein Abschnitt hiess «.check», wie die Checkbox-Zeile des Designsystems (zwei Spalten).
 *
 * Bewusste Abweichungen kommen mit Begründung in ALLOWED.
 */
const ALLOWED: Record<string, string[]> = {};

const root = join(import.meta.dirname, '..');

function files(dir: string, extension: string): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name.startsWith('dist') || name.startsWith('.')) continue;
    const path = join(dir, name);
    if (statSync(path).isDirectory()) found.push(...files(path, extension));
    else if (name.endsWith(extension)) found.push(path);
  }
  return found;
}

const globalClasses = new Set(
  [
    ...readFileSync(join(root, 'packages/ui/src/styles/components.css'), 'utf8').matchAll(
      /^\s{2}\.([a-z][a-z0-9-]*)(?=[\s,{:.[])/gm,
    ),
  ].map((match) => match[1] as string),
);

describe('Klassen des Designsystems', () => {
  it('kennt die Bausteine aus components.css', () => {
    for (const name of ['wrap', 'btn', 'card', 'check', 'field', 'label', 'tag', 'kicker']) {
      expect(globalClasses, name).toContain(name);
    }
  });

  it('werden in Scoped Styles nicht unter gleichem Namen neu angelegt', () => {
    const collisions: string[] = [];
    const sources = [
      ...files(join(root, 'apps'), '.astro'),
      ...files(join(root, 'packages/ui/src/components'), '.astro'),
    ];
    expect(sources.length).toBeGreaterThan(20);
    for (const file of sources) {
      const style = /<style[^>]*>([\s\S]*?)<\/style>/.exec(readFileSync(file, 'utf8'))?.[1];
      if (!style) continue;
      const relative = file.slice(root.length + 1);
      // Selektoren, die mit einer Klasse beginnen: «.name {», «.name,», «.name:hover», «.name .kind»
      for (const match of style.matchAll(/^\s*\.([a-z][a-z0-9-]*)(?=[\s,{:[])/gm)) {
        const name = match[1] as string;
        if (globalClasses.has(name) && !(ALLOWED[relative] ?? []).includes(name)) {
          collisions.push(`${relative}: .${name}`);
        }
      }
    }
    expect([...new Set(collisions)]).toEqual([]);
  });
});
