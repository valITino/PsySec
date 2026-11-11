# Fortschritt

Neue Session? Zuerst `CLAUDE.md` lesen, dann diese Datei. Der Auftrag steht in `docs/BRIEF.md`.

## Stand je Phase

| Phase | Inhalt                                        | Stand  |
| ----- | --------------------------------------------- | ------ |
| 0     | Fundament, Tooling, `packages/ui`, Styleguide | fertig |
| 1     | psyber.tech (One-Pager und Unterseiten)       | offen  |
| 2     | API (Cloudflare Worker)                       | offen  |
| 3     | forms.psyber.tech (Umfrage)                   | offen  |
| 4     | surprise.psyber.tech («Erwischt!»)            | offen  |
| 5     | Härtung, E2E, DEPLOY.md                       | offen  |
| 6     | Extras (Auswertung, Easter Eggs)              | offen  |

## Phase 0: Fundament (fertig)

- Monorepo mit pnpm 12 (corepack), TypeScript 6 strict, Node ≥ 22.23.
- `packages/config`: tsconfig- und ESLint-Basis, Adressen der Sites (`sites.mjs`), CSP-Direktiven und Generator für `_headers`/`_redirects` (`security.mjs`).
- `packages/ui`: Tokens, Recursive mit allen Achsen plus Fallback-Metriken, Tailwind-Theme, Basis- und Komponenten-Styles, Psi-Icon, Wortmarke, Logo, Psi-Netz (animiert, mit Neigung), Button, Karte, Tag, Kicker, Icon-Set (Lucide), Netz-Textur, Motion-Helfer (reduced motion, Lenis + ScrollTrigger, Zähler, In-View).
- `apps/web`: Astro 7, Tailwind 4, CSP per `security.csp`, Sitemap, Styleguide unter `/styleguide` (noindex). Startseite ist noch ein Platzhalter.
- `apps/forms`, `apps/surprise`, `apps/api`: lauffähige Gerüste (Platzhalter-Seiten, Health-Endpunkt).
- Werkzeuge: ESLint (flat), Prettier mit Astro-Plugin, Vitest (17 Tests), Playwright (Smoke für den Styleguide), `scripts/serve.mjs`, `scripts/shots.mjs`, `scripts/check-budgets.mjs`, `scripts/brand-assets.ts` (Favicon-Set).
- CI (`ci.yml`), Dependabot, Vorschau-Deploy auf GitHub Pages (`pages.yml`, `pnpm build:pages`).
- Docs: BRIEF, DESIGN, DECISIONS, TODO, DEPLOY (Gerüst), PROGRESS.

Geprüft: `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm e2e`, `pnpm build:pages`; Screenshots des Styleguides in 390×844 und 1440×900.

## Nächster Schritt

Phase 1: `packages/survey` anlegen (Kontakt-Schema wird vom Kontaktformular gebraucht), dann alle Sektionen von psyber.tech gemäss Abschnitt 5 des Auftrags.

## Arbeitsnotizen für Folge-Sessions

- Screenshots: `pnpm build && node scripts/shots.mjs apps/web/dist / --name web-home` (Ergebnis in `shots/`, nicht versioniert).
- `pnpm build:pages` überschreibt `apps/*/dist` mit dem Vorschau-Build (Basis-Pfad `/PsySec`). Vor `pnpm e2e` wieder `pnpm build` ausführen.
- Playwright: Der lokale statische Server meldet `/` bei surprise erst als bereit, wenn dort eine Seite liegt; die Konfiguration prüft deshalb `/gewinn`.
- Astro 7 nutzt einen strengeren Compiler: alle Tags schliessen, kein Block-Element in `<p>`.
