# Entscheidungen

Format: **Entscheidung** – Grund – Alternative. Neue Einträge unten anhängen.

## Werkzeuge und Versionen

1. **pnpm 12 über corepack** (`packageManager` in `package.json`). – Aktuelle stabile Version; corepack lädt sie automatisch. Build-Skripte von Abhängigkeiten sind nur für `esbuild` und `workerd` freigegeben (`allowBuilds` in `pnpm-workspace.yaml`). Die Liste `minimumReleaseAgeExclude` hat pnpm beim ersten Install selbst ergänzt, weil einige Pakete jünger als die Sperrfrist waren. – Alternative: pnpm 10; brächte keine Vorteile.
2. **TypeScript 6.0 statt 7.0.** – `typescript-eslint` und `@astrojs/check` unterstützen 7 noch nicht. – Alternative: 7.0 ohne Lint und `astro check`; nicht akzeptabel.
3. **Vitest 5 mit `@cloudflare/vitest-plugin`.** – Das frühere `@cloudflare/vitest-pool-workers` ist abgekündigt und verlangte Vitest 4; der Nachfolger unterstützt Vitest 5. Damit läuft im ganzen Monorepo eine Version, und die API-Tests laufen in der echten Workers-Laufzeit (workerd) mit lokaler D1.
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

## Phase 1: psyber.tech

21. **Der H1 im Hero steht in drei Zeilen** («Ein Klick zu viel?» / «Ein Anruf zu» / «glaubwürdig?») mit `clamp(2.25rem, 10.4vw, 3.5rem)` auf Mobile und `clamp(3.5rem, 5.5vw, 5rem)` ab 1024 px. – Inhaltlich bleiben es zwei Fragen. Neben dem Klick-Simulator ist die Textspalte rund 690 px breit; die zweite Frage passt dort in keiner sinnvollen Grösse auf eine Zeile. Drei feste Zeilen ergeben auf allen Breiten dasselbe ruhige Bild. – Alternative: H1 über die volle Breite; dann rutscht das Widget unter den Falz.
22. **Die Headline blendet per CSS ein, nicht per GSAP.** – Sie ist das grösste Element im ersten Viewport. Reines CSS braucht kein Skript, flackert nicht und funktioniert auch, wenn JavaScript ausfällt.
23. **Der Klick-Simulator kommt ohne GSAP aus.** – Die Zeitleiste (`<input type="range">`) schaltet Zustände über Klassen, die Übergänge macht CSS. So ist das Widget sofort bedienbar. GSAP, ScrollTrigger, SplitText und Lenis laden erst nach dem ersten Eindruck (zusammen 53 KB gzip), das Kontaktformular erst, wenn es in Sicht kommt.
24. **Drehbuch auf Desktop mit grosser «Untertitel»-Zeile.** – Der Kurztext des aktuellen Schritts steht gross unter der Kette; Hover und Tab-Fokus zeigen den Text jedes Schritts (Tooltip-Verhalten, auch per Tastatur). Auf Mobile sowie ohne JS oder bei reduzierter Bewegung sind alle Kurztexte direkt sichtbar. Pinning nur ab 1024 px Breite und 736 px Höhe.
25. **Helle Sektionen: «Haltung» (0x05) und «Pakete» (0x08).** – Zwei sind erlaubt; so entsteht in der Mitte und im letzten Drittel je ein Rhythmuswechsel.
26. **`zod/mini` statt der klassischen Zod-API** (gleiches Paket, Zod 4). – Spart im Browser rund 20 KB gzip; Client und API nutzen weiterhin dieselben Schemas aus `packages/survey`.
27. **«Interesse» im Kontaktformular als Auswahl-Chips (Radio-Gruppe)** statt Dropdown. – Fünf Optionen sind auf einen Blick sichtbar und auf dem Handy leichter zu treffen.
28. **Fallakten: `datum` bedeutet «Stand der Fallakte».** – Sortiert wird nach `featured`, dann `datum`, dann Dateiname; die Nummern im Dateinamen legen bei gleichem Datum die Reihenfolge fest.
29. **OG-Bilder mit fontkit und resvg statt satori.** – satori kann weder WOFF2 noch die Achsen einer Variable Font. fontkit liest Recursive direkt aus dem Fontsource-Paket und liefert die Buchstaben mit CASL und MONO als Pfade.
30. **Quellenlinks öffnen in einem neuen Tab** (`rel="noopener"`), mit Hinweis für Screenreader. – Wer eine Quelle prüft, soll die Seite nicht verlieren.
31. **Zähler `checklist_click` höchstens einmal pro Tab-Sitzung** (Merker im `sessionStorage`, kein Cookie). – Neu laden zählt nicht doppelt.
32. **Statusfarben nur an Icons.** – Rot (#d03b3b) und Grün (#0ca30c) erreichen auf dunklem Grund 3:1 (genug für Icons), aber nicht 4,5:1 für Text. Der Text daneben steht darum immer in Weiss bzw. `--soft`.
33. **Vorschau-Hinweis.** – In der Vorschau (`PUBLIC_PREVIEW=true`) steht oben ein schmaler Balken «Vorschau: Formulare und Umfrage speichern hier nichts.»

### Ergänzte Texte (im Ton des Auftrags)

Der Auftrag liefert die Inhalte; für Beschriftungen und Bedienelemente fehlten einige kurze Texte. Ergänzt wurden:

- Hero-Widget: «Unbekannter Absender», «SMS · heute», «Nachricht» (Eingabezeile), «dns: blockiert».
- Problem-Split: Kartenlabels «Layer 8 · Mensch» und «Layer 1–7 · Technik».
- Drehbuch: «PSYber setzt an» über den drei Eingriffen.
- Maschen: «Fallakte 00» sowie im Mockup «Gesponsert», «Echt?», «Jetzt starten»; «Quelle:» vor den Quellenlinks.
- Ticker: Button «Band anhalten» / «Band fortsetzen».
- Haltung: unsichtbare Überschrift «Unsere Haltung» (für Screenreader, entspricht dem Kicker).
- Ablauf: Kicker «Angelehnt an TCP» im Handshake-Kasten.
- Pakete: Tags «Einmal-Paket» und «Abo»; nur in der Phase `launch`: «Welches Paket passt zu Ihrer Familie? Das klären wir im Kennenlern-Gespräch.»
- FAQ: Kicker «FAQ», Überschrift «Häufige Fragen.».
- Kontakt: «Felder mit * sind Pflicht.», «Anfrage senden», «Wird gesendet …», «… / 2000 Zeichen», die Fehlermeldungen an den Feldern.
- Footer: Schalter «Bewegung pausieren» / «Bewegung fortsetzen».
- Checkliste: Kicker «Checkliste zum Ausdrucken», Fusszeile für den Ausdruck.
- 404: Terminal-Befehl «ping diese-seite», Abschnittsnummer «0x194» (404 in Hex).
- Impressum und Datenschutz: komplette Entwurfstexte, als «Entwurf, rechtlich prüfen lassen» markiert.
- Meta-Beschreibungen der Seiten.

## Phase 2: API

34. **POST-Requests brauchen einen erlaubten `Origin`-Header**, sonst antwortet die API mit 403. – Browser senden ihn bei Cross-Origin-POSTs immer. Das ersetzt keinen Spam-Schutz, hält aber beiläufigen Missbrauch der Zähler fern. Zusätzliche Origins lassen sich über die Variable `ALLOWED_ORIGINS` erlauben; `ENVIRONMENT=development` erlaubt localhost.
35. **Honeypot-Treffer bekommen `200 { ok: true }`, gespeichert wird nichts.** – Bots lernen so nicht, dass sie erkannt wurden. Turnstile wird dafür gar nicht erst befragt.
36. **Validierung vor Turnstile.** – Ungültige Eingaben kosten keinen Request an Cloudflare; ein Token wird nur für gültige Eingaben verbraucht.
37. **Turnstile ohne IP-Adresse.** – `remoteip` ist bei der Prüfung optional; wir geben sie nicht weiter.
38. **Datum in Schweizer Zeit** (`Europe/Zurich`) für `created_day` und die Zähler. – Passt zur Auswertung pro Tag; gespeichert wird nur `YYYY-MM-DD`.
39. **Tabellen als `WITHOUT ROWID` mit zufälliger UUID.** – SQLite führt sonst eine fortlaufende Zeilennummer, aus der sich die Reihenfolge der Einträge ablesen liesse. So gibt es weder ID noch Fremdschlüssel noch Reihenfolge, die Antworten und Warteliste verbinden.
40. **E-Mails der Warteliste werden kleingeschrieben und nur einmal gespeichert** (`UNIQUE`, UPSERT). – Doppelte Anmeldungen ergeben einen Eintrag; «Founding Family» bleibt gesetzt, wenn es einmal angekreuzt wurde.
41. **Benachrichtigung als reiner Text über die strukturierte `send()`-API** des `send_email`-Bindings, mit `Reply-To` auf die anfragende Person. – Kein HTML, keine MIME-Bibliothek. Scheitert der Versand, bleibt die Anfrage trotzdem gespeichert; geloggt wird nur der Fehlercode.
42. **`NOTIFY_TO` als Secret statt als Variable im Repo.** – Die private Zieladresse gehört nicht in die Versionsverwaltung.
43. **Workers-Logs ohne automatische Request-Logs** (`invocation_logs: false`). – So landen weder IP-Adressen noch Header in den Logs.
44. **Bekannte Grenze: D1 Time Travel.** – Cloudflare hält für D1 Wiederherstellungspunkte vor (30 Tage). Wer Administrationszugriff hat, könnte damit theoretisch nachvollziehen, welche Zeilen gleichzeitig entstanden sind. Das ist eine organisatorische Frage (Zugriff auf das Konto), technisch lässt es sich in D1 nicht abschalten.
