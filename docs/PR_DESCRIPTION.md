# PSYber Web-Plattform: psyber.tech, forms.psyber.tech, surprise.psyber.tech und API

Komplette Umsetzung des Auftrags (`docs/BRIEF.md`) in sieben Phasen. Deployt wurde nichts, im Repo liegen keine Secrets.

## Was drin ist

| Teil                                       | Inhalt                                                                                                                                                                                                                                                                                                         |
| ------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **psyber.tech** (`apps/web`)               | One-Pager mit allen Sektionen aus Abschnitt 5 (Klick-Simulator, Drehbuch, Maschen, Ticker, Haltung, Check, Ablauf, Pakete, Über, FAQ, Kontakt), Checkliste zum Ausdrucken, Impressum und Datenschutz als Entwurf, 404, Styleguide. Phasen-Schalter `survey`/`launch`: In `survey` stehen keine Preise im HTML. |
| **forms.psyber.tech** (`apps/forms`)       | Umfrage mit 16 Fragen, eine pro Screen, Sprunglogik, Tastatur wie bei Typeform, Zwischenstand, Danke-Screen mit Schwerpunkten und beiden Links.                                                                                                                                                                |
| **surprise.psyber.tech** (`apps/surprise`) | «Erwischt!»: Teaser, Glitch, Auflösung, «Adressen lesen», Rabattcode. Keine Eingabefelder, keine Cookies, `noindex`.                                                                                                                                                                                           |
| **api.psyber.tech** (`apps/api`)           | Cloudflare Worker (Hono) mit D1: Umfrage, Kontakt, anonyme Zähler. Turnstile, Honeypot, Rate Limits, CORS nur für die eigenen Sites, Benachrichtigung per E-Mail, Löschfrist per Cron.                                                                                                                         |
| **Gemeinsam** (`packages/*`)               | Designsystem (Tokens, Recursive mit allen Achsen, Psi-Netz, Bausteine), Fragen und Schemas der Umfrage für Client und API, CSP- und Header-Helfer.                                                                                                                                                             |
| **Werkzeuge** (`scripts/`)                 | Auswertung mit Go/No-Go-Ampel, Export aus D1, Header-Prüfung, Lighthouse, JS-Budgets, OG-Bilder, Vorschau-Build für GitHub Pages.                                                                                                                                                                              |

## Screenshots

### psyber.tech

| Hero mit Klick-Simulator                          | Mobil                                          | Menü                                           |
| ------------------------------------------------- | ---------------------------------------------- | ---------------------------------------------- |
| ![Hero Desktop](screenshots/web-hero-desktop.jpg) | ![Hero Mobil](screenshots/web-hero-mobile.jpg) | ![Menü Mobil](screenshots/web-menu-mobile.jpg) |

| 0x02 Drehbuch                                     | 0x04 Maschen                                    | 0x08 Pakete (Phase `survey`, ohne Preise)     |
| ------------------------------------------------- | ----------------------------------------------- | --------------------------------------------- |
| ![Drehbuch](screenshots/web-drehbuch-desktop.jpg) | ![Maschen](screenshots/web-maschen-desktop.jpg) | ![Pakete](screenshots/web-pakete-desktop.jpg) |

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

| Prüfung                          | Ergebnis                                                                                                                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `pnpm lint`, `pnpm typecheck`    | sauber                                                                                                                                                                                                                   |
| `pnpm test`                      | 118 Unit-Tests (Umfrage-Logik, API in der Workers-Laufzeit, Header-Helfer, Auswertung, Wächter gegen Klassen-Kollisionen)                                                                                                |
| `pnpm e2e`                       | 197 Playwright-Tests in 390×844 und 1440×900, inklusive axe (WCAG 2.2 AA) auf allen Hauptansichten und Überlauf-Prüfung in beiden Bewegungsmodi; 15 übersprungen, weil sie nur mit Tastatur bzw. nur mobil sinnvoll sind |
| `pnpm budgets`                   | JS gzip: web 58,9 von 120 KB, forms 33,6 von 60 KB, surprise 0,9 von 25 KB                                                                                                                                               |
| `pnpm check:headers`             | 227 Prüfungen von Security-Headern, Cache-Regeln, Weiterleitungen und 404 in der Workers-Laufzeit                                                                                                                        |
| `pnpm lighthouse` (mobil, lokal) | 100 bei Performance, Barrierefreiheit und Best Practices auf allen drei Sites; SEO 100 (surprise 66, weil `noindex` dort Pflicht ist); LCP 0,9 bis 1,2 s                                                                 |

Nicht geprüft, weil es dafür die echte Domain braucht: Mozilla Observatory, Lighthouse gegen die Live-Adressen, echter Versand der Benachrichtigung, Turnstile mit echtem Schlüssel. Die Schritte dafür stehen in `docs/DEPLOY.md` (Schritt 8). Getestet ist nur in Chromium.

## Unterwegs gefunden und behoben

- **CSP hätte in Produktion die eigenen Skripte blockiert.** Sobald eine Seite Turnstile als Quelle ergänzte, liess Astro `'self'` weg. Die Tests liefen ohne Turnstile-Key und sahen das nicht. Jetzt setzt `cspConfig()` die Quellen ausdrücklich, und ein zweiter Build mit Testkey samt eigenem E2E-Test prüft den Weg der Produktion.
- **Klick-Simulator bremste die Startseite** (Lighthouse Performance 89). Ursache waren Container-Query-Einheiten im Handy-Mockup. Ohne sie: 100.
- **Netz-Textur zählte als grösstes Bild der Seite** (LCP 2,7 s auf surprise). Als Maske statt Hintergrundbild: 0,9 s.
- **Chat-Mockup fehlte auf dem Handy.** Der Abschnitt 0x06 hiess im CSS wie ein Baustein des Designsystems (`.check`); dadurch war das Mockup auf schmalen Bildschirmen 2 px breit. Umbenannt, dazu ein Test, der solche Kollisionen künftig meldet.
- **Ticker schnitt bei reduzierter Bewegung Sätze ab.** Er bricht dort jetzt um; ein Test prüft, dass jeder Satz ganz zu lesen ist.
- **Gedimmter Text unter dem Kontrast-Minimum** in «Haltung» und im Drehbuch. Beide Effekte bleiben, der Text ist jetzt in jedem Zustand lesbar.

## Offene Punkte

Alles, was von Ihnen kommen muss, steht in [`TODO.md`](TODO.md). Kurz:

- Inhalte: Name, Rolle, Motivation, Foto, E-Mail, Telefon, Angaben fürs Impressum, finale Preise. Auf den Seiten stehen dafür sichtbare Platzhalter `[TODO: …]`.
- Rechtliches: Impressum und Datenschutzerklärung prüfen lassen (als Entwurf markiert), Rabattcode «LAYER8» bestätigen.
- Betrieb: Cloudflare nach [`DEPLOY.md`](DEPLOY.md) einrichten (Zone, D1 in der EU, Turnstile, Email Routing, vier Workers).
- Prüfen: Die fiktiven Beispiel-Domains gehören niemandem; die Quellenlinks stimmen noch.

Annahmen und ihre Gründe stehen in [`DECISIONS.md`](DECISIONS.md) (99 Einträge), der Stand je Phase in [`PROGRESS.md`](PROGRESS.md).

## Vorschau

Nach dem Merge auf `main` veröffentlicht der Workflow `pages.yml` alle drei Websites auf GitHub Pages, sobald unter **Settings → Pages → Source** «GitHub Actions» gewählt ist:

- `https://valitino.github.io/PsySec/` (psyber.tech)
- `https://valitino.github.io/PsySec/forms/` (Umfrage)
- `https://valitino.github.io/PsySec/surprise/gewinn` («Erwischt!»)

In der Vorschau antworten Formulare und Umfrage simuliert; gespeichert und gezählt wird nichts, und alle Seiten sind `noindex`.
