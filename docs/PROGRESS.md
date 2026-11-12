# Fortschritt

Neue Session? Zuerst `CLAUDE.md` lesen, dann diese Datei. Der Auftrag steht in `docs/BRIEF.md`.

## Stand je Phase

| Phase | Inhalt                                          | Stand                 |
| ----- | ----------------------------------------------- | --------------------- |
| 0     | Fundament, Tooling, `packages/ui`, Styleguide   | fertig                |
| 1     | psyber.tech (One-Pager und Unterseiten)         | fertig                |
| 2     | API (Cloudflare Worker)                         | fertig                |
| 3     | forms.psyber.tech (Umfrage)                     | fertig                |
| 4     | surprise.psyber.tech («Erwischt!»)              | fertig                |
| 5     | Härtung, E2E, DEPLOY.md                         | fertig                |
| 6     | Extras (Auswertung, Easter Eggs)                | fertig                |
| R     | Redesign (neuer Look, Logo-Kit, Slogan)         | fertig                |
| G     | Gesamt-Review (alles prüfen, vereinheitlichen)  | fertig                |
| S     | Sichtbarkeit in Suchmaschinen (SEO, robots.txt) | fertig                |
| T     | Zählung der Reichweite (anonyme Tagessummen)    | fertig                |
| I     | Inhalte in «Über» (Name, Rolle, CAS, Porträt)   | Motivation fehlt noch |
| A     | Animationen: «Erwischt!» und kleine Auftritte   | fertig                |

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

Geprüft nach dem Redesign: lint, typecheck, 114 Unit-Tests, build, 221 E2E-Tests (17 weitere übersprungen, weil sie nur mit Tastatur, nur mit Zeiger bzw. nur mobil sinnvoll sind), JS-Budgets (web 63,4 / forms 33,8 / surprise 0,9 KB), `pnpm check:headers` (227 Prüfungen), `pnpm lighthouse` (alle Seiten 100 bei Performance, Barrierefreiheit und Best Practices; LCP 0,9 bis 1,5 s, CLS 0); Sichtprüfung aller drei Websites in 390×844 und 1440×900, mit und ohne reduzierte Bewegung.

## Redesign (fertig)

Auf Wunsch folgt das Design jetzt eng der Referenz eezyinn.de (Stil, Formatierung, Schrift), bleibt aber selbst gebaut. Dazu kamen das Logo-Kit mit der Eule, der Slogan «Betrüger hassen diesen Blick.» und der Leitsatz ohne «in Zürich». Details und Gründe: `docs/DECISIONS.md` ab Nummer 100, Regeln: `docs/DESIGN.md`.

- **Designsystem:** neue Tokens (Schwarz, Space-Violett, Acid, Amber für Warnsignale), Manrope und Geist Mono statt Recursive, Versal-Überschriften, Pillen-Buttons, Bogen (`.sheet`) und Bühnen (`.stage`), Labels als Code-Kommentar.
- **Logo-Kit (Runde 6 «Der Blick»):** `packages/ui/src/brand/` mit Logo (ohne und mit Slogan), Eule in vier Mimiken, Wortmarke, Favicon, App-Icon, drei Stickern und den Ebenen für die Animation; Komponenten `Logo.astro`, `Owl.astro` und `OwlLive.astro` (die Eule in «Über» schaut dem Zeiger nach); Favicons und OG-Bilder kommen aus dem Kit (`pnpm assets`). Psi-Icon und Psi-Netz sind entfernt.
- **psyber.tech:** Header als Leiste und Kapsel, Vollbild-Menü auf allen Breiten, Hero mit Globus «Layer 8», Klick-Simulator als Bühne, alle Sektionen im Wechsel Schwarz/Violett, Footer mit grosser Wortmarke, schwebende Bedienelemente (Fortschritt, Cookie-Knopf, Bewegung pausieren).
- **forms und surprise:** gleicher Look; auf surprise die erwischte Eule mit Sticker, auf forms die Eule in der Kugel.
- **Performance:** beide Schriften vorgeladen, Globus und Beiwerk nach dem ersten Bild, Sektionen weiter unten erst bei Bedarf berechnet. Lighthouse mobil wieder 100.
- **Tests:** an den neuen Aufbau angepasst und ergänzt (Menü aus der Kapsel, Sprungmarken, Nachholen der Sektionen).
- **Direktlinks und Neuladen (Entscheidungen 116 bis 119):** `psyber.tech/#kontakt` landet jetzt in beiden Bewegungsmodi genau auf dem Ziel; nach dem Neuladen steht derselbe Abschnitt im Bild (`position.ts`, gemerkt im Verlaufseintrag, ohne Cookie). Bei reduzierter Bewegung gibt es gar keine Übergänge mehr, und frisch ausgelegte Sektionen blenden nichts über. Sechs neue E2E-Tests sichern das ab.
- **Logo-Kit Runde 6 (Entscheidungen 120 und 121):** neu gezeichnete Eule und Logo überall ersetzt, Favicons, OG-Bilder und Wortmarke neu erzeugt; in «Über» schaut die Eule dem Zeiger nach.

Entschieden (122, 123): Die Akzentfarbe bleibt Lime, und «Zürich» steht nur noch dort, wo es eine Tatsache benennt (Quellen, Antworten von Frage 1).

## Gesamt-Review (fertig)

Auftrag: alles prüfen, vereinheitlichen und dort verbessern, wo es nötig ist. Vorgehen: eigene Sichtprüfung aller Seiten und Zustände, dazu drei unabhängige Durchgänge durch den Code (API und Auswertung, Umfrage und surprise, Startseite und Designsystem). Jeder Befund wurde zuerst im Browser oder im Test nachgestellt, dann behoben und mit einem Test abgesichert. Gründe und Einzelheiten: `docs/DECISIONS.md`, Nummern 124 bis 149.

- **Zwei ernste Fehler, die im Betrieb aufgefallen wären:** Das Kontaktformular konnte am Skript vorbei per GET senden (Name und E-Mail in der Adresszeile); das Vollbild-Menü liess sich nicht scrollen, sobald das sanfte Scrollen lief (im Querformat am Handy waren «Kontakt», E-Mail und Telefon unerreichbar). Beide behoben (142, 143).
- **Umfrage:** Hinweise stehen jetzt in der klebenden Leiste und sind immer im Bild; die Leiste hat auf allen Breiten einen Grund (lag auf Laptops über den Antworten); gehaltene Tasten, Doppelklicks und Enter im E-Mail-Feld lösen nichts Ungewolltes mehr aus; der Danke-Screen übersteht Neuladen und «Zurück»; ein beschädigter Zwischenstand legt die Umfrage nicht mehr lahm; Startscreen und Leiste passen auf niedrige Fenster und schmale Handys (134 bis 139).
- **API und Auswertung:** «Erneut senden» legt keine zweite Antwort an; die Warteliste speichert nur den Monat; Fehlkonfiguration fällt im Log auf; Rate Limit greift auch bei IPv6 sauber; lokale Test-Exporte können echte nicht mehr überschreiben; die Ampel rundet nie auf ein verfehltes Ziel auf; sichere Löschbefehle in `docs/DEPLOY.md` (127 bis 133).
- **Startseite:** Drehbuch passt angepinnt auch in niedrige Laptop-Fenster; Einblenden klappt auch bei sehr niedrigen Fenstern; reduzierte Bewegung gilt jetzt auch im Hero; Titel der Datenschutzerklärung, Leerzeichen vor Satzzeichen, Footer-Spalten, Ticker, Terminal-Stylesheet (144 bis 149).
- **Einheitlich:** Anführungszeichen «…» auf oberster Ebene, Farbkanäle als Tokens statt ausgeschriebener Werte, Logo aus dem Kit auch im Auswertungsbericht, toter Code entfernt.
- **Neue Prüfungen:** Die Tests messen jetzt selbst, ob etwas über den Bildrand ragt oder ein Wort mitten im Wort umbricht (zehn Seiten, zwölf Breiten). Die bisherige Messung war dafür blind und hatte vier Stellen übersehen.
- **Stand der Prüfkette:** 132 Unit-Tests, 270 E2E-Tests (38 übersprungen), 227 Header-Prüfungen, Lighthouse mobil 100 auf allen Seiten (surprise SEO 69 wegen `noindex`), JS gzip web 63,5 KB, forms 35,0 KB, surprise 0,9 KB.

## Sichtbarkeit in Suchmaschinen (fertig)

Grundlage: die aktuellen Dokumente von Google Search Central, OpenAI, Anthropic und Cloudflare (Stand November 2026). Gründe und Einzelheiten: `docs/DECISIONS.md`, Nummern 150 bis 159. Ihre Schritte (Search Console, Bing, Cloudflare-Einstellung für KI-Crawler, Unternehmensprofil): `docs/DEPLOY.md`, Schritt 9.

- **robots.txt:** Zwei Regeln hebelten ihr eigenes `noindex` aus (Styleguide und surprise standen unter `Disallow`, ein Crawler hätte das `noindex` nie gesehen). Jetzt: psyber.tech und forms offen mit Sitemap; surprise lässt nur Suchmaschinen abrufen und sperrt alle anderen aus.
- **Seitenkopf:** Titel und Beschreibung der Startseite nennen zuerst das Thema; Seiten im Index erlauben grosse Vorschauen; Seiten mit `noindex` tragen kein Canonical; Favicon auch als PNG; Bestätigungscodes für Google und Bing per Build-Variable möglich.
- **Strukturierte Daten:** `Organization`, `WebSite`, `WebPage`, `BreadcrumbList`, nur mit belegten Angaben (`packages/ui/src/lib/structured-data.ts`).
- **Textauszüge:** Nachgestellte Betrugsnachrichten sind mit `data-nosnippet` vom Textauszug in Treffern ausgenommen.
- **Tests:** `e2e/seo.spec.ts` prüft das rohe HTML wie ein Crawler (Titel, Canonical, strukturierte Daten ohne Platzhalter, Sitemap passend zu robots.txt und zu den Seiten); dazu Unit-Tests für robots.txt und die Daten.
- **Stand der Prüfkette:** 141 Unit-Tests, 278 E2E-Tests (46 übersprungen), 230 Header-Prüfungen, Lighthouse mobil 100 in allen Kategorien auf psyber.tech, der Checkliste und der Umfrage (surprise SEO 66, weil die Seite `noindex` trägt).

**Offen (nächster Meilenstein): Tracking.** Noch nicht begonnen. Es berührt die Regeln «kein Tracking, keine Cookies» aus dem Auftrag, die Datenschutzerklärung, den Cookie-Hinweis und die CSP; vor dem Einbau braucht es Ihre Entscheidung für eine Variante.

## Inhalte in «Über» (Motivation fehlt noch)

Aus dem Lebenslauf des Inhabers, soweit freigegeben (Entscheidungen 162 und 163): Name, die neutrale Rolle «Cybersecurity-Spezialist», das abgeschlossene CAS und vorübergehend das Bild aus dem Lebenslauf als freigestelltes Porträt. Arbeitgeber und private Kontaktdaten stehen bewusst nicht da. Offen: die Motivation (`warum.txt`), ein grösseres Foto, Kontaktdaten und die Adresse fürs Impressum (`docs/TODO.md`).

## Zählung der Reichweite (fertig)

Variante A, vom Inhaber gewählt: eigene anonyme Tagessummen statt eines Analysedienstes (Entscheidungen 164 bis 170).

- **Was:** Seitenaufrufe je Seite, Einstiege je Herkunft, Klicks auf die Haupt-Knöpfe, die erreichte Frage der Umfrage, Zahl der Kontaktanfragen.
- **Wie:** `packages/ui/src/lib/track.ts` meldet sich über Attribute am `<html>`-Element an; Knöpfe tragen `data-track`. Die API nimmt nur Werte aus festen Listen an (`packages/survey/src/questions.ts`) und speichert Tagessummen in `counters` (neue Spalte `dim`, Migration 0002).
- **Was nicht:** keine Cookies, kein Speicher im Browser, keine Kennung, keine IP-Adressen, kein Dritter. Mit «Global Privacy Control» oder «Do Not Track», in ferngesteuerten Browsern und in der Vorschau wird nichts gezählt.
- **Auswertung:** `pnpm analyze` zeigt am Schluss den Abschnitt «Reichweite der Websites».
- **Texte:** Datenschutzerklärung nachgeführt (Abschnitt «Anonyme Zähler»).
- **Tests:** `e2e/tracking.spec.ts` (Einstieg, Herkunft, Klicks, Umfrage, Signale, keine Cookies), dazu Unit-Tests für Schema, API, Herkunft und Bericht.
- **Stand der Prüfkette:** 162 Unit-Tests, 312 E2E-Tests (46 übersprungen), 230 Header-Prüfungen, Lighthouse mobil 100 in allen Kategorien auf psyber.tech, der Checkliste und der Umfrage (surprise SEO 66, weil die Seite `noindex` trägt), JS gzip web 64,1 KB, forms 36,2 KB, surprise 1,7 KB.

## Animationen (fertig)

Wunsch des Inhabers nach der ersten Vorschau: «Erwischt!» länger und kräftiger, sonst mehr kleine Bewegungen, aber dezent (Entscheidungen 173 und 174; Liste in `docs/DESIGN.md`, Abschnitt 6).

- **«Erwischt!»:** Übergang in vier Takten, 2,8 s bis zum Schnitt: Teaser, Störung (der Text zerfällt bis zu «ERWISCHT» in Hex), Spur (drei Zeilen wie aus einem Terminal), Einrasten mit Farbversatz. Überspringbar, ohne Blitzgewitter, bei reduzierter Bewegung sofort die Auflösung.
- **Kleine Auftritte:** Kicker tippen sich ein, der Sucher stellt das Porträt scharf, 404-Glitch, Sticker reagieren auf den Zeiger, Seitenwechsel blenden über, Cookie-Hinweis wächst aus dem Knopf, Nummern der Checkliste und Danke-Screen gestaffelt, Häkchen federt.
- **Gefunden dabei:** Der Build schreibt Zeiten im CSS um («2800ms» wird «2.8s»); das Überspringen las den Wert falsch und hätte nichts übersprungen. Ein Test hat es gezeigt, das Skript liest jetzt beide Schreibweisen. Und: Der Test des Terminals tippte den Konami-Code unter Last, bevor die Seite zuhörte (die Easter Eggs starten in einem ruhigen Moment nach dem Laden). Er wartet jetzt auf den Gruss in der Konsole, das Zeichen, dass sie bereit sind.
- **Nach dem Merge gefunden und behoben:** In der Spur fehlten im echten Ablauf die Auslassungspunkte der zweiten und dritten Zeile (der letzte Schritt einer gestuften Animation blieb durch Rundung aus). Vier Animationen enden jetzt im Grundzustand; ein Test prüft den Übergang in Echtzeit (Entscheidung 175).
- **Angaben:** Rechtsform, vorläufige Adresszeile und E-Mail eingetragen (Entscheidungen 171 und 172).
- **Stand der Prüfkette:** 162 Unit-Tests, 323 E2E-Tests (47 übersprungen), 230 Header-Prüfungen, Lighthouse mobil 100, JS gzip web 64,1 KB, forms 36,2 KB, surprise 1,8 KB.

## Abschluss

Alle Phasen aus dem Auftrag sind umgesetzt. Deployt wurde nichts; es liegen keine Secrets im Repo.

Was jetzt bei Ihnen liegt, steht in `docs/TODO.md`: Inhalte (Name, Rolle, Motivation, Foto, Kontaktdaten, Impressum, Preise), rechtliche Prüfung und das Einrichten von Cloudflare nach `docs/DEPLOY.md`.

Seit dem 12. November 2026 liegt der Stand auf `main` (Pull Request 1). Die CI lief dabei zum ersten Mal auf GitHub und war grün; vorher war alles nur lokal geprüft.

Die Vorschau ist online und im Browser geprüft (Status, Konsole, interne Links, Kontaktformular, Start der Umfrage, keine Anfragen an fremde Hosts):

- `https://valitino.github.io/PsySec/` (psyber.tech)
- `https://valitino.github.io/PsySec/forms/` (Umfrage)
- `https://valitino.github.io/PsySec/surprise/gewinn` («Erwischt!»)

Nach dem Merge angepasst (Entscheidungen 160 und 161): Dependabot prüft monatlich und lässt die Hauptversionen von `typescript` und `@types/node` aus; der Vorschau-Hinweis der Umfrage steht in derselben Schrift wie auf den anderen Sites.

## Arbeitsnotizen für Folge-Sessions

- `pnpm build:pages` überschreibt die Build-Ordner `apps/*/dist` mit der Vorschau-Variante (anderer Basispfad). Danach immer `pnpm build`, bevor `pnpm e2e`, `pnpm lighthouse` oder `node scripts/docs-shots.mjs` laufen; sonst schlagen Tests für forms und surprise fehl.
- Screenshots: `pnpm build && node scripts/shots.mjs apps/web/dist / --name web-home` (Ergebnis in `shots/`, nicht versioniert). Kontaktbogen: `node scripts/sheet.mjs <name> <mobile|desktop>`. Interaktive Zustände: `node scripts/states.mjs`.
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
- Text und Inline-Elemente in einer Zeile nie von Hand aneinanderreihen (Prettier bricht um, im HTML entstehen Leerzeichen): Teile in einen Flex-Container legen (Leerraum zählt dort nicht, siehe Adresse auf surprise) oder die Zeile mit `{/* prettier-ignore */}` schützen.
- `pnpm build` baut web und forms zweimal: `dist/` (ohne Turnstile-Key, wird deployt bzw. von den meisten Tests genutzt) und `dist-turnstile/` (mit Testkey, nur für `e2e/turnstile.spec.ts`).
- Lighthouse: `pnpm lighthouse` lädt Lighthouse per `pnpm dlx`. Der lokale Server darf nicht im selben Prozess blockiert werden (kein `spawnSync`).
- Container-Query-Einheiten (`cqw`) nur in kleinen Bausteinen verwenden: Im Hero haben sie das Layout der ganzen Seite vervielfacht.
- `wrangler dev` für mehrere Sites nur nacheinander starten (gleichzeitig kollidieren interne Ports).
- Auswertung ausprobieren: `pnpm analyze --demo` (erfundene Daten, Bericht als Demo markiert).
- ESLint: Node-Globals und `no-console: off` gelten nur für `scripts/` und `packages/*/scripts/`, nicht für `apps/*/src/scripts/`.
- Doku-Screenshots neu erzeugen: `pnpm build && node scripts/analyze.ts --demo && node scripts/docs-shots.mjs`.
- Klassennamen in Scoped Styles nie so nennen wie einen Baustein aus `packages/ui/src/styles/components.css` (z. B. `.check`, `.card`, `.label`): Beide Regeln gelten sonst zugleich. `pnpm test` meldet das.
- Startseite: Sektionen mit `data-lazy` sind anfangs nicht berechnet. In Tests und Screenshot-Skripten zuerst `layOutAll(page)` aus `e2e/helpers.ts` aufrufen (setzt `data-laid`), sonst stimmen Positionen nicht und axe sieht die Inhalte nicht.
- Nach `page.evaluate(() => window.scrollTo(…))` kurz warten, bevor ein Screenshot entsteht: Das erste Bild nach einem Sprung kann leer sein.
- Elemente in zurückgestellten Sektionen nicht selbst vermessen (`getBoundingClientRect`): Das zwingt den Browser, sie sofort zu berechnen. IntersectionObserver verwenden.
- Der Header ist `position: fixed` und hat keine eigene Höhe; in Tests auf `[data-header] .logo` warten, nicht auf den Header.
- Akzentfarbe tauschen: `--acid-rgb`, `--acid`, `--acid-hi` in `packages/ui/src/styles/tokens.css`, danach `pnpm assets` (OG-Bilder).
- Layout immer in beiden Bewegungsmodi prüfen: Bei `prefers-reduced-motion` sind andere Zustände sichtbar (alle Chat-Nachrichten, statisches Drehbuch).
- Überlauf nie über `scrollWidth` prüfen: `overflow-x: clip` am `body` schneidet still ab. `cutOff(page)` und `brokenWords(page)` aus `e2e/helpers.ts` messen die Kanten und finden auch Wörter, die mitten im Wort umbrechen.
- Layout auch in niedrigen Fenstern prüfen (1366×650, 1280×740, Handy quer): Dort fallen angepinnte Bühnen, klebende Leisten und grosse Überschriften auf.
- Umfrage in Tests: Kurz nach einem Fragenwechsel zählen Klicks auf Antworten nicht (400 ms, Schutz vor Doppelklicks). `atQuestion(page, '3 / 16')` aus `e2e/survey.ts` wartet darauf; `skipTo` ebenfalls.
- Satzzeichen direkt hinter einem Link: auf eine Zeile schreiben und `{/* prettier-ignore */}` davor setzen, sonst entsteht ein sichtbares Leerzeichen. Ein Array per `.map()` hilft hier nicht, weil der Formatierer auch darin umbricht.
- Entitäten wie `&shy;` wirken nur im Text einer Vorlage, nicht in einem Attribut oder Prop: Dort das Zeichen selbst schreiben (`'\u00AD'`).
- CSS, das ein nachgeladenes Skript braucht, per `?url` importieren und als `<link>` einhängen (siehe `terminal.ts`). Ein normaler Import landet als blockierendes Stylesheet im `<head>` jeder Seite.
- Elemente, die nur vor dem Hydrieren sichtbar sind, dürfen im Layout keinen Platz belegen (sonst verschiebt sich die Seite: CLS). Lighthouse nach solchen Änderungen laufen lassen.
- Lokaler Export: `pnpm export --local` schreibt `reports/export-local-….json`; auswerten mit `pnpm analyze reports/export-local-….json`.
- Suchmaschinen: Eine Seite mit `noindex` nie zusätzlich in der robots.txt sperren (der Crawler sähe das `noindex` nicht). Neue Seite im Index: Titel, Beschreibung und `crumb` am `<Page>` setzen; `e2e/seo.spec.ts` um die Seite ergänzen (Liste `INDEXED`), die Sitemap folgt von selbst. Neue Seite ausserhalb des Index: `noindex` am Layout und in `noindexPaths` der `astro.config.mjs` (Header).
- Strukturierte Daten: nur Angaben, die in der Konfiguration stehen und stimmen. Was die Organisation zeigen darf, begrenzt ein Test (`allowed` in `e2e/seo.spec.ts`); neue Felder dort bewusst freigeben.
