# Entscheidungen

Format: **Entscheidung** – Grund – Alternative. Neue Einträge unten anhängen.

## Werkzeuge und Versionen

1. **pnpm 12 über corepack** (`packageManager` in `package.json`). – Aktuelle stabile Version; corepack lädt sie automatisch. Build-Skripte von Abhängigkeiten sind nur für `esbuild` und `workerd` freigegeben (`allowBuilds` in `pnpm-workspace.yaml`). Die Liste `minimumReleaseAgeExclude` hat pnpm beim ersten Install selbst ergänzt, weil einige Pakete jünger als die Sperrfrist waren. – Alternative: pnpm 10; brächte keine Vorteile.
2. **TypeScript 6.0 statt 7.0.** – `typescript-eslint` und `@astrojs/check` unterstützen 7 noch nicht. – Alternative: 7.0 ohne Lint und `astro check`; nicht akzeptabel.
3. **Vitest 4.1 statt 5.** – `@cloudflare/vitest-pool-workers` verlangt `vitest ^4.1`. Eine Version im ganzen Monorepo ist einfacher als zwei. – Alternative: Vitest 5 für Pakete, 4 für die API.
4. **`@playwright/test` steht im Lockfile auf 1.63.0.** – Passt zum Chromium der Entwicklungsumgebung. In der CI installiert `playwright install` den passenden Browser, Dependabot darf aktualisieren. Lokal bei Bedarf `PW_CHROMIUM_PATH` setzen.
5. **Skripte laufen direkt mit Node (Type Stripping), ohne tsx.** – Node ≥ 22.18 führt `.ts` nativ aus. Darum importieren wir überall mit Endung (`./x.ts`) und nutzen nur löschbare TypeScript-Syntax (`erasableSyntaxOnly`).
6. **ESLint ohne `jsx-a11y`.** – Das Plugin unterstützt ESLint 10 noch nicht. Barrierefreiheit prüfen wir stattdessen am gerenderten Ergebnis mit axe in den Playwright-Tests. – Alternative: Fork `jsx-a11y-x`; zusätzliches Risiko ohne Mehrwert.

## Astro

7. **`compressHTML: true`.** – Astro 7 entfernt sonst Leerzeichen zwischen Inline-Elementen nach JSX-Regeln; bei Fliesstext mit Links und Hervorhebungen gehen so leicht Wortabstände verloren. – Alternative: Standard `'jsx'` und überall `{' '}`; fehleranfällig.
8. **`build.format: 'file'`, `trailingSlash: 'ignore'`.** – Ergibt `/checkliste` und `/gewinn` ohne Slash, genau wie die Links im Auftrag, und funktioniert ohne Weiterleitung auf Cloudflare-Assets und GitHub Pages.
9. **Eigene `@font-face`-Regeln statt `full.css` von Fontsource.** – Wir brauchen nur Latin und Latin Extended; die Dateien kommen weiterhin aus `@fontsource-variable/recursive`. So landen keine kyrillischen und vietnamesischen Subsets im Build, und der Fallback mit angepassten Metriken steht direkt daneben.
10. **Eigenes Icon-Set aus `lucide-static` generiert.** – Ein Datenmodul für Astro und Preact, keine Laufzeit-Abhängigkeit, nur die genutzten Icons im Bundle. – Alternative: `@lucide/astro` plus `lucide-preact`.
11. **`assetsInlineLimit: 0`.** – Keine `data:`-URIs, damit `img-src` und `font-src` in der CSP bei `'self'` bleiben.

## Sicherheit und Hosting

12. **`_headers` und `_redirects` werden beim Build erzeugt** (`@psyber/config/security`), nicht von Hand gepflegt. – `connect-src` hängt von `PUBLIC_API_BASE` ab; so kommen Meta-CSP und Header-CSP aus derselben Quelle.
13. **Zusätzliche Header über den Auftrag hinaus:** `X-Frame-Options: DENY`, `Cross-Origin-Resource-Policy: same-origin`, `upgrade-insecure-requests`. – Kostenlos und gut fürs Observatory.
14. **HTML wird 5 Minuten gecacht** (`max-age=300, must-revalidate`), gehashte Assets ein Jahr `immutable`. – «Kurz» laut Auftrag; kurz genug, dass ein Deploy schnell ankommt.
15. **Adressen der Sites sind konfigurierbar** (`PUBLIC_WEB_URL`, `PUBLIC_FORMS_URL`, `PUBLIC_SURPRISE_URL`), dazu `PUBLIC_PREVIEW=true` und `PUBLIC_API_BASE=mock`. – Wunsch: die Website vorübergehend auf GitHub Pages testen (wie beim Projekt foodwishus). Dort liegen alle drei Sites unter einem Pfad, und es gibt keine API. `pnpm build:pages` baut diese Vorschau; der Workflow `pages.yml` veröffentlicht sie bei jedem Push auf `main`. In der Vorschau sind alle Seiten `noindex`, Formulare antworten simuliert und speichern nichts. – Alternative: Vorschau über Cloudflare; dafür fehlen die Zugangsdaten.

## Design und Barrierefreiheit

16. **Fokus-Ring auf hellen Flächen: Amber plus dunkle Kontur.** – Amber allein hat auf `--paper` nur 1,74:1; mit der Kontur in `--ink` ist der Ring auch dort klar sichtbar. Auf dunkel bleibt er exakt wie im Auftrag.
17. **`--border-strong` (#7c68c0) für Eingabefelder und Checkboxen.** – Bedienelemente brauchen 3:1 zum Hintergrund; `--line` ist für Dekor gedacht.
18. **Zeilenlänge als `34em` statt `68ch`.** – In Recursive ist `1ch` breiter als der Durchschnittsbuchstabe; `34em` entspricht rund 68 Zeichen.
19. **Schalter «Bewegung pausieren» im Footer und Pause-Button am Ticker.** – WCAG 2.2.2 verlangt, dass automatisch laufende Bewegung über 5 Sekunden pausierbar ist; Hover und Fokus allein reichen auf Touch-Geräten nicht.
20. **Logo-Icon in Lavendel, nicht Amber.** – Amber bleibt den Warnsignalen vorbehalten («sparsam»).
