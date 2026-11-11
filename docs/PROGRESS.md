# Fortschritt

Neue Session? Zuerst `CLAUDE.md` lesen, dann diese Datei. Der Auftrag steht in `docs/BRIEF.md`.

## Stand je Phase

| Phase | Inhalt                                        | Stand  |
| ----- | --------------------------------------------- | ------ |
| 0     | Fundament, Tooling, `packages/ui`, Styleguide | fertig |
| 1     | psyber.tech (One-Pager und Unterseiten)       | fertig |
| 2     | API (Cloudflare Worker)                       | offen  |
| 3     | forms.psyber.tech (Umfrage)                   | offen  |
| 4     | surprise.psyber.tech («Erwischt!»)            | offen  |
| 5     | Härtung, E2E, DEPLOY.md                       | offen  |
| 6     | Extras (Auswertung, Easter Eggs)              | offen  |

## Phase 0: Fundament (fertig)

- Monorepo mit pnpm 12 (corepack), TypeScript 6 strict, Node ≥ 22.23.
- `packages/config`: tsconfig- und ESLint-Basis, Adressen der Sites (`sites.mjs`), CSP-Direktiven und Generator für `_headers`/`_redirects` (`security.mjs`).
- `packages/ui`: Tokens, Recursive mit allen Achsen plus Fallback-Metriken, Tailwind-Theme, Basis- und Komponenten-Styles, Psi-Icon, Wortmarke, Logo, Psi-Netz (animiert, mit Neigung), Button, Karte, Tag, Kicker, Icon-Set (Lucide), Netz-Textur, Motion-Helfer (reduced motion, Lenis + ScrollTrigger, Zähler, In-View).
- `apps/web`: Astro 7, Tailwind 4, CSP per `security.csp`, Sitemap, Styleguide unter `/styleguide` (noindex).
- `apps/forms`, `apps/surprise`, `apps/api`: lauffähige Gerüste (Platzhalter-Seiten, Health-Endpunkt).
- Werkzeuge: ESLint (flat), Prettier mit Astro-Plugin, Vitest, Playwright, `scripts/serve.mjs`, `scripts/shots.mjs`, `scripts/check-budgets.mjs`, `scripts/brand-assets.ts` (Favicon-Set).
- CI (`ci.yml`), Dependabot, Vorschau-Deploy auf GitHub Pages (`pages.yml`, `pnpm build:pages`).
- Docs: BRIEF, DESIGN, DECISIONS, TODO, DEPLOY (Gerüst), PROGRESS.

## Phase 1: psyber.tech (fertig)

- `packages/survey` vorgezogen (das Kontaktformular braucht das Schema): Fragen als Daten, Schemas mit `zod/mini`, Sprunglogik, Validierung je Frage, Schwerpunkte, Tipps, 35 Tests.
- Startseite mit allen Sektionen aus Abschnitt 5: Header mit Vollbild-Menü, Hero mit Klick-Simulator, 0x01 Problem-Split mit Zahlenband, 0x02 Drehbuch (Pinning und Scrub), 0x03 Lösungen, 0x04 Maschen (Content Collection), Ticker, 0x05 Haltung (SplitText), 0x06 Check mit Chat-Mockup, 0x07 Ablauf mit Handshake, 0x08 Pakete mit Treppe, 0x09 Über, 0x0A FAQ, «Der erste Schritt», 0x0B Kontakt, Footer.
- Phasen-Schalter `PUBLIC_SITE_PHASE` (`survey`/`launch`); in `survey` stehen keine Preise im HTML (per E2E-Test abgesichert).
- Kontaktformular mit Inline-Validierung, Honeypot, Turnstile (lädt erst bei Benutzung) und API-Client; mit `PUBLIC_API_BASE=mock` simuliert.
- Unterseiten: `/checkliste` (druckbar auf eine A4-Seite, P.S. und Zähler mit `?ref=umfrage`), `/impressum`, `/datenschutz` (Entwürfe), 404, `/.well-known/security.txt`, `/humans.txt`, `/robots.txt`, Sitemap.
- OG-Bilder und Favicons per `pnpm assets`.
- E2E: 13 Tests für psyber.tech (Menü, Simulator per Tastatur, Formular, Checkliste, 404, axe WCAG 2.2 AA auf drei Seiten).

Geprüft: lint, typecheck, 52 Unit-Tests, build, 25 E2E-Tests, JS-Budget (web 58 von 120 KB), Screenshots in 390×844 und 1440×900 inklusive reduzierter Bewegung, Druckansicht der Checkliste.

## Nächster Schritt

Phase 2: API in `apps/api` (Hono, D1-Migrationen, Turnstile, Rate Limiting, send_email, Cron) mit Tests; lokale Entwicklung mit `wrangler dev`.

## Arbeitsnotizen für Folge-Sessions

- Screenshots: `pnpm build && node scripts/shots.mjs apps/web/dist / --name web-home` (Ergebnis in `shots/`, nicht versioniert). Kontaktbogen: `node scripts/sheet.mjs <name> <mobile|desktop>`. Interaktive Zustände: `node scripts/states.mjs`.
- `pnpm build:pages` überschreibt `apps/*/dist` mit dem Vorschau-Build (Basis-Pfad `/PsySec`). Vor `pnpm e2e` wieder `pnpm build` ausführen.
- Die E2E-Tests laufen gegen den Produktions-Build und fangen Requests an `https://api.psyber.tech` ab. Ein Build mit `PUBLIC_API_BASE=mock` sendet nichts; dann schlagen die Tests fehl, die den Request prüfen.
- Playwright: Der lokale statische Server meldet `/` bei surprise erst als bereit, wenn dort eine Seite liegt; die Konfiguration prüft deshalb `/gewinn`.
- Astro 7 nutzt einen strengeren Compiler: alle Tags schliessen, kein Block-Element in `<p>`.
- Prettier formatiert `.astro`-Dateien um. Wer danach per Skript Text ersetzt, muss prüfen, ob die Stelle noch genauso aussieht.
- Scoped Styles greifen nicht in Kind-Komponenten: dort `:global(...)` verwenden.
- In CSS-Grid mit einem Element über alle Spalten die übrigen Elemente ausdrücklich platzieren (sonst entstehen zusätzliche Spalten).
- Keine Inline-`style`-Attribute: Werte zur Laufzeit per `element.style…` setzen (CSP).
