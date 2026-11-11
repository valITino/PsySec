# PSYber Web-Plattform: psyber.tech, forms.psyber.tech, surprise.psyber.tech und API

Komplette Umsetzung des Auftrags (`docs/BRIEF.md`) in sieben Phasen, danach das Redesign: neuer Look nach der Referenz eezyinn.de (selbst gebaut), Logo-Kit mit der Eule, Slogan «Betrüger hassen diesen Blick.». Deployt wurde nichts, im Repo liegen keine Secrets.

## Was drin ist

| Teil                                       | Inhalt                                                                                                                                                                                                                                                                                                                                    |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **psyber.tech** (`apps/web`)               | One-Pager mit allen Sektionen aus Abschnitt 5 (Hero mit Globus «Layer 8», Klick-Simulator, Drehbuch, Maschen, Ticker, Haltung, Check, Ablauf, Pakete, Über, FAQ, Kontakt), Checkliste zum Ausdrucken, Impressum und Datenschutz als Entwurf, 404, Styleguide. Phasen-Schalter `survey`/`launch`: In `survey` stehen keine Preise im HTML. |
| **forms.psyber.tech** (`apps/forms`)       | Umfrage mit 16 Fragen, eine pro Screen, Sprunglogik, Tastatur wie bei Typeform, Zwischenstand, Danke-Screen mit Schwerpunkten und beiden Links.                                                                                                                                                                                           |
| **surprise.psyber.tech** (`apps/surprise`) | «Erwischt!»: Teaser, Glitch, Auflösung, «Adressen lesen», Rabattcode. Keine Eingabefelder, keine Cookies, `noindex`.                                                                                                                                                                                                                      |
| **api.psyber.tech** (`apps/api`)           | Cloudflare Worker (Hono) mit D1: Umfrage, Kontakt, anonyme Zähler. Turnstile, Honeypot, Rate Limits, CORS nur für die eigenen Sites, Benachrichtigung per E-Mail, Löschfrist per Cron.                                                                                                                                                    |
| **Gemeinsam** (`packages/*`)               | Designsystem (Tokens, Manrope und Geist Mono, Logo-Kit mit Eule, Wortmarke und Stickern, Bausteine), Fragen und Schemas der Umfrage für Client und API, CSP- und Header-Helfer.                                                                                                                                                           |
| **Werkzeuge** (`scripts/`)                 | Auswertung mit Go/No-Go-Ampel, Export aus D1, Header-Prüfung, Lighthouse, JS-Budgets, OG-Bilder und Favicons aus dem Kit, Vorschau-Build für GitHub Pages.                                                                                                                                                                                |

## Das Redesign in Kürze

- **Look:** fast schwarze Flächen, violette Bogen, riesige Überschriften in Versalien, Pillen, Bühnen mit grossen Radien. Acid (Lime) ist die Aktionsfarbe, Amber steht für Warnsignale und ist die Augenfarbe der Eule.
- **Schrift:** Manrope wie bei der Referenz, Geist Mono nur für Code (Hex-Nummern, «//», Terminal, Adressen). Zusammen 48 KB statt vorher 305 KB.
- **Marke:** Logo, Eule in vier Mimiken, Wortmarke, Favicons, OG-Bilder und Sticker aus dem Logo-Kit (Runde 6 «Der Blick»). In «Über» schaut die Eule dem Zeiger nach. Leitsatz «Cyber-Prävention für Familien» (ohne «in Zürich»).
- **Eigenes:** Von der Referenz stammen keine Texte, Bilder, Logos und kein Code. Regeln in [`DESIGN.md`](DESIGN.md), Gründe in [`DECISIONS.md`](DECISIONS.md) ab Nummer 100.

## Screenshots

### psyber.tech

| Hero mit Globus                                   | Mobil                                          | Menü                                           |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| ![Hero Desktop](screenshots/web-hero-desktop.jpg) | ![Hero Mobil](screenshots/web-hero-mobile.jpg) | ![Menü Mobil](screenshots/web-menu-mobile.jpg) |

| Klick-Simulator (Schritt 2, mit Sticker)                  | 0x02 Drehbuch                                     | 0x04 Maschen                                    |
| --------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------- |
| ![Klick-Simulator](screenshots/web-simulator-desktop.jpg) | ![Drehbuch](screenshots/web-drehbuch-desktop.jpg) | ![Maschen](screenshots/web-maschen-desktop.jpg) |

| 0x08 Pakete (Phase `survey`, ohne Preise)     | 0x09 Über (Platzhalter mit Eule)           | Footer                                        |
| --------------------------------------------- | ------------------------------------------ | --------------------------------------------- |
| ![Pakete](screenshots/web-pakete-desktop.jpg) | ![Über](screenshots/web-ueber-desktop.jpg) | ![Footer](screenshots/web-footer-desktop.jpg) |

### forms.psyber.tech

| Start                                         | Frage                                        | Matrix                                         | Danke-Screen                                 |
| --------------------------------------------- | -------------------------------------------- | ---------------------------------------------- | -------------------------------------------- |
| ![Start](screenshots/forms-start-desktop.jpg) | ![Frage](screenshots/forms-frage-mobile.jpg) | ![Matrix](screenshots/forms-matrix-mobile.jpg) | ![Danke](screenshots/forms-danke-mobile.jpg) |

### surprise.psyber.tech

| Teaser                                             | Glitch                                             | Auflösung                                              |
| -------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------ |
| ![Teaser](screenshots/surprise-teaser-desktop.jpg) | ![Glitch](screenshots/surprise-glitch-desktop.jpg) | ![Erwischt](screenshots/surprise-erwischt-desktop.jpg) |

| Angebot und Code                                     | Mobil                                                       | «Adressen lesen»: Fälschung                                 |
| ---------------------------------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------- |
| ![Angebot](screenshots/surprise-angebot-desktop.jpg) | ![Erwischt Mobil](screenshots/surprise-erwischt-mobile.jpg) | ![Adressen lesen](screenshots/surprise-adressen-mobile.jpg) |

### Extras

| Konami-Terminal                                   | Auswertung: Ampel (Demo-Daten)         | Auswertung: Preiskurven (Demo-Daten)          |
| ------------------------------------------------- | -------------------------------------- | --------------------------------------------- |
| ![Terminal](screenshots/web-terminal-desktop.jpg) | ![Ampel](screenshots/report-ampel.jpg) | ![Preiskurven](screenshots/report-kurven.jpg) |

Die beiden Bilder der Auswertung zeigen erfundene Beispieldaten (`pnpm analyze --demo`), keine Ergebnisse.

## Geprüft

| Prüfung                          | Ergebnis                                                                                                                                                                                                                                                                                      |
| -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm lint`, `pnpm typecheck`    | sauber                                                                                                                                                                                                                                                                                        |
| `pnpm test`                      | 132 Unit-Tests (Umfrage-Logik, API in der Workers-Laufzeit, Header-Helfer, Auswertung, Wächter gegen Klassen-Kollisionen)                                                                                                                                                                     |
| `pnpm e2e`                       | 270 Playwright-Tests in 390×844 und 1440×900, inklusive axe (WCAG 2.2 AA) auf allen Hauptansichten, Rand- und Wortbruch-Prüfung auf zehn Seiten in zwölf Breiten, Direktlinks und Neuladen; 38 übersprungen, weil sie nur mit Tastatur, nur mit Zeiger bzw. nur in einer Grösse sinnvoll sind |
| `pnpm budgets`                   | JS gzip: web 63,5 von 120 KB, forms 35,0 von 60 KB, surprise 0,9 von 25 KB                                                                                                                                                                                                                    |
| `pnpm check:headers`             | 227 Prüfungen von Security-Headern, Cache-Regeln, Weiterleitungen und 404 in der Workers-Laufzeit                                                                                                                                                                                             |
| `pnpm lighthouse` (mobil, lokal) | 100 bei Performance, Barrierefreiheit und Best Practices auf allen drei Sites; SEO 100 (surprise 69, weil `noindex` dort Pflicht ist); LCP 0,9 bis 1,5 s, CLS 0                                                                                                                               |

Nicht geprüft, weil es dafür die echte Domain braucht: Mozilla Observatory, Lighthouse gegen die Live-Adressen, echter Versand der Benachrichtigung, Turnstile mit echtem Schlüssel. Die Schritte dafür stehen in `docs/DEPLOY.md` (Schritt 8). Getestet ist nur in Chromium.

## Unterwegs gefunden und behoben

- **CSP hätte in Produktion die eigenen Skripte blockiert.** Sobald eine Seite Turnstile als Quelle ergänzte, liess Astro `'self'` weg. Die Tests liefen ohne Turnstile-Key und sahen das nicht. Jetzt setzt `cspConfig()` die Quellen ausdrücklich, und ein zweiter Build mit Testkey samt eigenem E2E-Test prüft den Weg der Produktion.
- **Direktlinks landeten daneben.** `psyber.tech/#kontakt` (der Link von surprise und aus den Menüs der Unterseiten) zeigte am Desktop einen Abschnitt rund anderthalb Bildschirme vor dem Ziel, weil die Bühne im Drehbuch erst nach dem Sprung angepinnt wird. Jetzt bleibt stehen, was im Bild ist.
- **Nach dem Neuladen stand man woanders.** Die Seite merkt sich jetzt selbst, welcher Abschnitt im Bild ist (im Verlaufseintrag des Browsers, ohne Cookie oder Speicher), und stellt ihn wieder her.
- **Reduzierte Bewegung: Tausende Mini-Übergänge.** Der verbreitete Schnipsel mit 0.01 ms hielt beim Nachladen der unteren Sektionen kurz alte Werte fest; Überschriften und Abstände stimmten für einen Moment nicht. Übergänge sind in diesem Modus jetzt ganz aus.
- **Fokus auf die Leiste verschob die Seite.** Der Header ist darum fest positioniert statt sticky.
- **Chat-Mockup fehlte auf dem Handy.** Der Abschnitt 0x06 hiess im CSS wie ein Baustein des Designsystems (`.check`); dadurch war das Mockup auf schmalen Bildschirmen 2 px breit. Umbenannt, dazu ein Test, der solche Kollisionen künftig meldet.
- **Ticker schnitt bei reduzierter Bewegung Sätze ab.** Er bricht dort jetzt um; ein Test prüft, dass jeder Satz ganz zu lesen ist.
- **Startseite war auf schwachen Geräten träge** (Lighthouse mobil 76). Sektionen weit unten rechnet der Browser jetzt erst bei Bedarf, und die Scroll-Bibliotheken laden beim ersten Lebenszeichen: wieder 100.

Aus dem Gesamt-Review am Schluss (drei unabhängige Durchgänge durch den Code, jeder Befund nachgestellt, behoben und mit einem Test abgesichert):

- **Kontaktformular konnte am Skript vorbei senden.** Ohne `method` schickt ein Formular per GET; wer klickte, bevor das nachgeladene Skript da war, hatte Name und E-Mail in der Adresszeile. Jetzt `method="post"`, das Absenden ist von Anfang an abgefangen, und ohne JavaScript steht ein Hinweis.
- **Menü liess sich nicht scrollen**, sobald das sanfte Scrollen lief: Im Querformat am Handy waren «Kontakt», E-Mail und Telefon unerreichbar.
- **Umfrage: Fehlerhinweis ausser Sicht.** Bei hohen Fragen stand «Bitte bewerten Sie jedes Thema.» unter dem Bildrand; «Weiter» schien nichts zu tun. Hinweise stehen jetzt in der klebenden Leiste. Auf Laptops lag diese Leiste zudem ohne Grund über den Antworten.
- **Umfrage: ungewollte Eingaben.** Gehaltenes Enter blätterte bis zum Absenden, ein Doppelklick traf die nächste Frage, Enter im E-Mail-Feld sendete ab, bevor das Häkchen «Founding Family» wählbar war.
- **«Erneut senden» legte eine zweite Antwort an**, wenn die erste doch angekommen war. Einsendungen tragen jetzt eine zufällige Kennung; die API zählt sie nur einmal.
- **Angepinntes Drehbuch war auf Laptops unten abgeschnitten** (1280×740, 1440×790): Die Bühne richtet sich jetzt nach der Fensterhöhe.
- **Überlauf blieb unbemerkt.** `overflow-x: clip` schneidet still ab, und die Prüfung über `scrollWidth` sah nichts: surprise ragte bei 320 und um 1024 px über den Rand, im Footer brach «Datenschutz» mitten im Wort um, der Titel der Datenschutzerklärung zeigte die Zeichenfolge «&shy;». Die Tests messen jetzt die Kanten selbst.
- **Testdaten-Löschbefehl hätte echte Antworten gelöscht** (nach Tag und Quelle). `docs/DEPLOY.md` beschreibt jetzt einen sicheren Weg.

## Offene Punkte

Alles, was von Ihnen kommen muss, steht in [`TODO.md`](TODO.md). Kurz:

- Inhalte: Name, Rolle, Motivation, Foto, E-Mail, Telefon, Angaben fürs Impressum, finale Preise. Auf den Seiten stehen dafür sichtbare Platzhalter `[TODO: …]`.
- Zum Redesign: die Eule in «Über», die dem Zeiger nachschaut (gefällt das?), und die Region «Schweiz» im Kontakt (genauer fassen, falls vorerst nur ein Teil der Schweiz abgedeckt wird).
- Rechtliches: Impressum und Datenschutzerklärung prüfen lassen (als Entwurf markiert), Rabattcode «LAYER8» bestätigen.
- Betrieb: Cloudflare nach [`DEPLOY.md`](DEPLOY.md) einrichten (Zone, D1 in der EU, Turnstile, Email Routing, vier Workers).
- Prüfen: Die fiktiven Beispiel-Domains gehören niemandem; die Quellenlinks stimmen noch.

Annahmen und ihre Gründe stehen in [`DECISIONS.md`](DECISIONS.md) (149 Einträge), der Stand je Phase in [`PROGRESS.md`](PROGRESS.md).

## Vorschau

Nach dem Merge auf `main` veröffentlicht der Workflow `pages.yml` alle drei Websites auf GitHub Pages, sobald unter **Settings → Pages → Source** «GitHub Actions» gewählt ist:

- `https://valitino.github.io/PsySec/` (psyber.tech)
- `https://valitino.github.io/PsySec/forms/` (Umfrage)
- `https://valitino.github.io/PsySec/surprise/gewinn` («Erwischt!»)

In der Vorschau antworten Formulare und Umfrage simuliert; gespeichert und gezählt wird nichts, und alle Seiten sind `noindex`.
