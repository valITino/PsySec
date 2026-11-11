# Fortschritt

Neue Session? Zuerst `CLAUDE.md` lesen, dann diese Datei. Der Auftrag steht in `docs/BRIEF.md`.

## Stand je Phase

| Phase | Inhalt                                        | Stand  |
| ----- | --------------------------------------------- | ------ |
| 0     | Fundament, Tooling, `packages/ui`, Styleguide | fertig |
| 1     | psyber.tech (One-Pager und Unterseiten)       | fertig |
| 2     | API (Cloudflare Worker)                       | fertig |
| 3     | forms.psyber.tech (Umfrage)                   | fertig |
| 4     | surprise.psyber.tech («Erwischt!»)            | fertig |
| 5     | Härtung, E2E, DEPLOY.md                       | fertig |
| 6     | Extras (Auswertung, Easter Eggs)              | fertig |

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

## Phase 2: API (fertig)

- `apps/api`: Hono-Worker mit `POST /v1/survey`, `POST /v1/event`, `POST /v1/contact`, `GET /v1/health`; Fehler immer als `{ "error": "<code>" }`.
- D1-Migration `0001_init.sql`: `survey_responses`, `waitlist`, `contact_requests`, `counters` (alle `WITHOUT ROWID`, Umfrage und Warteliste nur mit Datum).
- Turnstile-Prüfung, Honeypot, Rate Limiting (5 bzw. 30 pro Minute und IP), CORS nur für die drei Sites, Body-Limit 32 KB, strikte Schemas aus `packages/survey`, nur Prepared Statements.
- Benachrichtigung per `send_email`-Binding (reiner Text, Reply-To), Cron löscht Kontaktanfragen nach 180 Tagen.
- 30 Tests in der Workers-Laufzeit (`@cloudflare/vitest-plugin`): Validierung, CORS, Trennung von Warteliste und Antworten, Datumsfelder ohne Uhrzeit, Rate Limit (simuliert und mit echtem Binding), Honeypot, Turnstile, Zähler, E-Mail, Löschfrist.
- Lokal: `cp apps/api/.dev.vars.example apps/api/.dev.vars`, `pnpm --filter @psyber/api db:migrate:local`, `pnpm dev:api`.

Geprüft: lint, typecheck, 82 Unit-Tests, build (`wrangler deploy --dry-run`), lokaler Lauf mit `wrangler dev` und lokaler D1 (Health, Zähler, CORS-Abweisung, Kontaktanfrage mit Turnstile-Testkey).

## Phase 3: forms.psyber.tech (fertig)

- Preact-Island `SurveyApp` mit Signals (`apps/forms/src/components/survey`): Startscreen, eine Frage pro Screen, Fortschritt «3 / 16» (mit Sprunglogik 15), «Zurück» und «Weiter»/«Überspringen»/«Absenden» immer sichtbar.
- Alle 16 Fragen aus `packages/survey`: Einfach- und Mehrfachauswahl, Skalen als fünf Kacheln, Themen-Matrix, Van Westendorp mit CHF-Feldern, Freitext, Warteliste.
- Tastatur wie bei Typeform (Enter, 1–5, A–G), Übergänge 250 ms, reduced motion sofort.
- Zwischenstand im `sessionStorage` (try/catch, nach dem Absenden gelöscht), versteckte Felder `quelle` und `fokus`, Zähler `survey_started`.
- Absenden mit Turnstile (unsichtbar, erst beim Absenden geladen), Honeypot, Fehlermeldung mit «Erneut senden».
- Danke-Screen: Schwerpunkte mit Tipps, zwei gleich gestaltete Links (Checkliste und Test-Link mit `s`), «Link teilen».
- E2E: 7 Tests (kompletter Durchlauf, Tastatur, Sprunglogik, Neuladen, Sendefehler, axe auf fünf Screens).

Geprüft: lint, typecheck, Unit-Tests, build, E2E, JS-Budget (forms 33,6 von 60 KB), Screenshots in 390×844 und 1440×900, echter Durchstich Browser → `wrangler dev` → lokale D1.

## Phase 4: surprise.psyber.tech (fertig)

- `/gewinn` mit Teaser (Geschenk-Icon, «Ihr Gutschein wird vorbereitet …», Fortschrittsbalken), Glitch-Übergang und Auflösung «Erwischt!»; alle Texte wörtlich aus Abschnitt 7.2.
- Zeitleiste als reines CSS, per Klick oder Taste überspringbar; ohne JavaScript und bei reduzierter Bewegung sofort die Auflösung.
- Angeklickter Link mit Amber-Marker auf «psyber.tech», drei Signale, «Adressen lesen» mit Umschalter «Echt» / «Fälschung» (Buttons, keine Eingabefelder), Regel und Tipp, Angebotskarte auf `--paper` mit «Session anfragen» und Code «LAYER8» zum Kopieren (`aria-live`).
- Zähler `bait_click` einmal pro Aufruf mit `?ref=umfrage` (mit `s` 1–5), danach verschwinden die Parameter aus der Adresse.
- `/` leitet auf `/gewinn` (302 in `_redirects`, dazu Meta-Refresh als Rückfall); `noindex` als Meta-Tag und Header, `robots.txt` mit `Disallow: /`, Referrer-Policy `no-referrer`.
- `security.txt`, `humans.txt` und `robots.txt` auch für forms und surprise.
- E2E: 17 Tests (Teaser und Überspringen, Zähler, Umschalter per Maus und Tastatur, Kopieren mit Rückfall, ohne JavaScript, reduzierte Bewegung, 320 px, keine Eingabefelder/Cookies/Storage, axe in beiden Zuständen).

Geprüft: lint, typecheck, 82 Unit-Tests, build, 72 E2E-Tests, JS-Budget (surprise 0,9 von 25 KB), Screenshots in 390×844 und 1440×900, Zeitleiste Bild für Bild (`node scripts/states-surprise.mjs`), Vorschau-Build.

## Phase 5: Härtung (fertig)

- `wrangler.jsonc` für web, forms und surprise (reine Asset-Worker mit Custom Domain), `wrangler` als Dev-Abhängigkeit, Skripte `cf:dev` und `deploy` je App.
- `pnpm check:headers`: startet die drei Sites lokal in der Workers-Laufzeit und prüft Security-Header, Cache-Regeln, Weiterleitungen, 404, `security.txt` (227 Prüfungen); läuft auch in der CI.
- **Fehler behoben:** Mit gesetztem Turnstile-Key fehlte `'self'` in `script-src` (Astro ersetzt den Standardwert, sobald eine Seite eine Quelle ergänzt). Neu `cspConfig()` in `packages/config`. Abgesichert durch einen zweiten Build mit Turnstile-Testkey (`apps/*/dist-turnstile`, Teil von `pnpm build`) und `e2e/turnstile.spec.ts`.
- Build bricht bei Cloudflare ab, wenn `PUBLIC_TURNSTILE_SITE_KEY` fehlt (`requireTurnstile`).
- 404-Seiten auch für forms und surprise (gemeinsamer Baustein `NotFound.astro`).
- `e2e/hardening.spec.ts`: für alle zehn Seiten keine Requests an Dritte, keine Cookies, ein H1, lückenlose Überschriften, kein Inline-Style, Fokus-Ring.
- `pnpm lighthouse` (mobil, lokal): alle Seiten 100 bei Performance, Barrierefreiheit und Best Practices, LCP 0,9–1,2 s.
- Performance der Startseite: Klick-Simulator ohne Container Query (Layout-Zeit rund ein Viertel), Netz-Textur als Maske statt Hintergrundbild (zählt nicht mehr als LCP-Element).
- Kontrast in jedem Zustand: «Haltung» dimmt Wörter nur, solange der Satz im Bild ist; Drehbuch-Eingriffe ohne `opacity`.
- OG-Bilder dürfen von anderen Websites eingebunden werden (`Cross-Origin-Resource-Policy: cross-origin` nur für `/og/*`).

- HSTS-Preload als Schalter (`PUBLIC_HSTS_PRELOAD`, `HSTS_PRELOAD`), `pnpm export` für die Auswertung (ohne E-Mail-Adressen).
- `docs/DEPLOY.md` vollständig: zehn Schritte, Betrieb, bekannte Grenzen, Vorschau auf GitHub Pages.

Geprüft: lint, typecheck, 87 Unit-Tests, build, 148 E2E-Tests, JS-Budgets (web 58,2 / forms 33,6 / surprise 0,9 KB), `pnpm check:headers` (227 Prüfungen), `pnpm lighthouse`.

## Phase 6: Extras (fertig)

- **Auswertung:** `pnpm export` (anonyme Antworten, Zähler, zwei Summen der Warteliste) und `pnpm analyze` (Bericht `reports/umfrage-YYYY-MM-DD.html`): Go/No-Go-Ampel, Antworten nach Quelle und Fokus, Verteilung von Frage 4, Interesse je Thema, Formate, Abo-Bausteine, Preisstufen mit Median-Spanne, Van-Westendorp-Kurven mit akzeptiertem Bereich und optimalem Preis, Frage 14, Freitexte, Klickrate auf den Test-Link je Selbsteinschätzung. `pnpm analyze --demo` zum Ausprobieren.
- Rechenlogik in `scripts/analyze/compute.ts`, Bericht in `scripts/analyze/report.ts`, 29 Unit-Tests.
- **Easter Eggs** auf psyber.tech: Gruss in der Konsole; Konami-Code öffnet ein Terminal mit `help`, `whoami`, `ping familie.local`, `sudo patch layer8`, `exit` (Esc schliesst, per Tastatur bedienbar, reduzierte Bewegung respektiert, eigener Chunk).
- **Feinschliff an den Animationen:** «Haltung» und Drehbuch (siehe Phase 5), Klick-Simulator ohne Layout-Ruckeln.
- Doku-Screenshots in `docs/screenshots/` (`node scripts/docs-shots.mjs`), PR-Beschreibung in `docs/PR_DESCRIPTION.md`.

- **Nachtrag:** Auf dem Handy fehlte das Chat-Mockup in 0x06 (Klassen-Kollision `.check`, siehe Entscheidung 98). Behoben und mit drei Tests abgesichert.

- **Nachtrag:** Bei reduzierter Bewegung schnitt der Ticker Sätze ab (Entscheidung 99). Behoben, Test ergänzt.

Geprüft: lint, typecheck, 118 Unit-Tests, build, 197 E2E-Tests, JS-Budgets, `pnpm check:headers`, `pnpm lighthouse`; Sichtprüfung der Startseite in 390×844 und 1440×900, mit und ohne reduzierte Bewegung.

## Abschluss

Alle Phasen aus dem Auftrag sind umgesetzt. Deployt wurde nichts; es liegen keine Secrets im Repo.

Was jetzt bei Ihnen liegt, steht in `docs/TODO.md`: Inhalte (Name, Rolle, Motivation, Foto, Kontaktdaten, Impressum, Preise), rechtliche Prüfung und das Einrichten von Cloudflare nach `docs/DEPLOY.md`.

Zum Testen: Sobald dieser Stand auf `main` liegt und GitHub Pages auf «GitHub Actions» steht, veröffentlicht der Workflow `pages.yml` die Vorschau aller drei Websites.

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
- Umfrage durchklicken und fotografieren: `PUBLIC_API_BASE=mock pnpm --filter @psyber/forms build && node scripts/states-forms.mjs`.
- Zustand, der beim Blättern zurückgesetzt werden muss, synchron in der Aktion setzen, nicht in `useEffect` (schnelle Tasteneingaben kommen sonst zu früh).
- In Playwright-Tests auf die Umfrage warten: `.sv[data-ready]` (Helfer `hydrated` in `e2e/survey.ts`); das Attribut setzt das Island, sobald Zwischenstand und Tastatur bereit sind.
- surprise: Die Zeitleiste lässt sich für Screenshots anhalten und auf einen Zeitpunkt stellen (`document.getAnimations()`, siehe `scripts/states-surprise.mjs` und `e2e/surprise.spec.ts`).
- Eine Animation von 1 ms Dauer endet rechnerisch knapp vor 100 %: Endzustände darum in beiden Keyframes (`from, to`) setzen statt nur in `to`.
- Text und Inline-Elemente in einer Zeile nie von Hand aneinanderreihen (Prettier bricht um, im HTML entstehen Leerzeichen): Teile als Array per `.map()` ausgeben.
- `pnpm build` baut web und forms zweimal: `dist/` (ohne Turnstile-Key, wird deployt bzw. von den meisten Tests genutzt) und `dist-turnstile/` (mit Testkey, nur für `e2e/turnstile.spec.ts`).
- Lighthouse: `pnpm lighthouse` lädt Lighthouse per `pnpm dlx`. Der lokale Server darf nicht im selben Prozess blockiert werden (kein `spawnSync`).
- Container-Query-Einheiten (`cqw`) nur in kleinen Bausteinen verwenden: Im Hero haben sie das Layout der ganzen Seite vervielfacht.
- `wrangler dev` für mehrere Sites nur nacheinander starten (gleichzeitig kollidieren interne Ports).
- Auswertung ausprobieren: `pnpm analyze --demo` (erfundene Daten, Bericht als Demo markiert). Mit der lokalen Datenbank: `pnpm export --local && pnpm analyze`.
- ESLint: Node-Globals und `no-console: off` gelten nur für `scripts/` und `packages/*/scripts/`, nicht für `apps/*/src/scripts/`.
- Doku-Screenshots neu erzeugen: `pnpm build && node scripts/analyze.ts --demo && node scripts/docs-shots.mjs`.
- Klassennamen in Scoped Styles nie so nennen wie einen Baustein aus `packages/ui/src/styles/components.css` (z. B. `.check`, `.card`, `.label`): Beide Regeln gelten sonst zugleich. `pnpm test` meldet das.
- Layout immer in beiden Bewegungsmodi prüfen: Bei `prefers-reduced-motion` sind andere Zustände sichtbar (alle Chat-Nachrichten, statisches Drehbuch).
