# PSYber Web-Plattform

PSYber ist Cyber-Prävention für Familien (Start im Raum Zürich, später schweizweit): Aufklärung über Manipulation (Phishing, Anlagebetrug, Romance Scam, Cybermobbing) plus Absicherung des Heimnetzes. Dieses Monorepo enthält drei statische Websites (psyber.tech, forms.psyber.tech, surprise.psyber.tech) und einen kleinen Cloudflare Worker als API. Aktuelle Phase: Marktvalidierung mit Umfrage, darum zeigt die Website noch keine Preise.

**Massgeblich ist `docs/BRIEF.md`** (der vollständige Auftrag, wörtlich). Das Design aus Abschnitt 4 ist seit dem Redesign abgelöst: Dafür gelten `docs/DESIGN.md` und `docs/DECISIONS.md` ab Nummer 100. Stand und nächste Schritte: `docs/PROGRESS.md`. Entscheidungen: `docs/DECISIONS.md`. Offene Angaben: `docs/TODO.md`. Design: `docs/DESIGN.md`. Deployment: `docs/DEPLOY.md`.

## Struktur

```
apps/web          psyber.tech            Astro, One-Pager + /checkliste /impressum /datenschutz /styleguide 404
apps/forms        forms.psyber.tech      Astro + Preact-Island, Umfrage-Funnel
apps/surprise     surprise.psyber.tech   Astro, Auflösung des Phishing-Tests («Erwischt!»), keine Eingabefelder
apps/api          api.psyber.tech        Cloudflare Worker (Hono, D1, Turnstile, Rate Limiting, send_email, Cron)
packages/ui       Tokens, Schrift, Logo-Kit (Eule, Wortmarke, Sticker), Buttons, Karten, Motion-Helfer
packages/survey   Fragen als Daten, Zod-Schemas, Sprunglogik, Tipps (von Client und API genutzt)
packages/config   tsconfig-/ESLint-Basis, CSP- und Header-Helfer
scripts/          OG-Bilder/Favicons, Budget-, Header- und Lighthouse-Prüfung, GitHub-Pages-Build,
                  Export und Auswertung (analyze.ts, analyze/), Screenshot-Werkzeuge
e2e/              Playwright-Smoke-Tests
docs/             BRIEF, DESIGN, DEPLOY, DECISIONS, PROGRESS, TODO, PR_DESCRIPTION, screenshots/
```

## Befehle

```
corepack enable && pnpm install
pnpm dev:web | dev:forms | dev:surprise | dev:api
pnpm build          alle Apps bauen (web und forms zusätzlich mit Turnstile-Testkey nach dist-turnstile)
pnpm lint           ESLint + Prettier-Check
pnpm typecheck      astro check + tsc
pnpm test           Vitest (packages/config, packages/survey, apps/api, scripts)
pnpm e2e            Playwright-Smoke gegen die gebauten Sites (vorher pnpm build)
pnpm budgets        JS-Budgets prüfen (web 120 KB, forms 60 KB, surprise 25 KB, gzip)
pnpm check:headers  Header, Weiterleitungen und 404 gegen wrangler dev prüfen (vorher pnpm build)
pnpm lighthouse     Lighthouse mobil gegen den lokalen Build (lädt Lighthouse per pnpm dlx)
pnpm build:pages    Vorschau-Build für GitHub Pages (alle drei Sites unter einem Pfad, API gemockt)
                    Achtung: überschreibt apps/*/dist; vor Tests wieder pnpm build
pnpm assets         Favicons, App-Icons und OG-Bilder aus dem Logo-Kit neu erzeugen
pnpm export         D1-Export für die Auswertung (ohne E-Mail-Adressen), danach pnpm analyze
pnpm analyze        Umfrage-Auswertung aus dem Export
```

Nach jeder Änderung: `pnpm lint && pnpm typecheck && pnpm test && pnpm build`, dann Screenshots in 390×844 und 1440×900 kritisch prüfen. Danach Commit und Eintrag in `docs/PROGRESS.md`.

## Sprachregeln

- Schweizer Hochdeutsch, Sie-Form. Nie «ß», immer «ss». Anführungszeichen «…», innen ‹…›.
- Zahlen: 64’733, 15,9 %, «CHF 190.–», Gedankenstrich « – » mit Leerzeichen.
- Kurz, aktiv, konkret, freundlich. Nerdiger Humor ja, Angstmacherei und Beschämung nie. Keine Gendersternchen.
- Schreibweise immer exakt «PSYber».
- Texte aus `docs/BRIEF.md` wörtlich verwenden. Ergänzungen im gleichen Ton, in `docs/DECISIONS.md` vermerken.
- Fehlende Angaben nie erfinden: `[TODO: …]` setzen und in `docs/TODO.md` sammeln.
- Fiktive Beispiel-Domains (paket-zustellung-ch.info, karten-sicherheit-ch.com, gutschein-sofort.ch) nie als klickbare Links.

## Designregeln (Kurzfassung, Details in `docs/DESIGN.md`)

- Stil nach der Referenz eezyinn.de, aber selbst gebaut: fast schwarz, violette Bogen, riesige Versal-Überschriften, Pillen, Bühnen mit grossen Radien.
- Farben nur aus den Tokens (`packages/ui/src/styles/tokens.css`): void, carbon, graphite, pit, hairline, steel, ash, bone, space, nebula, haze, acid, ink, amber. Acid ist die Aktionsfarbe, Amber steht für Warnsignale. Keine hellen Sektionen.
- Schrift: Manrope (Überschriften 650 in Versalien, Text 400). Geist Mono nur für Code: Hex-Nummern, «//», Terminal, Adressen.
- Kicker als Code-Kommentar mit Hex-Nummer («0x01 // …»); Labels in gesperrten Versalien. «PSYber» bleibt auch in Versalien exakt so geschrieben (`.brand`).
- Logo, Eule und Sticker nur aus `packages/ui/src/brand/` (Logo-Kit). Slogan: «Betrüger hassen diesen Blick.» Der frühere Claim «Erst Kopf. Dann Klick.» wird nicht verwendet.
- Karten: Radius 22 px, 1 px Rahmen, kein Schatten. Buttons: Pille, 52 px hoch. Fokus-Ring 3 px Acid.
- Bewegung gezielt (Liste in `docs/DESIGN.md`), `prefers-reduced-motion` überall respektieren, Dauerbewegung pausierbar.
- Keine Inline-`style`-Attribute und keine Inline-Skripte im Markup (strikte CSP mit Hashes).
- Interne Links immer über den `href()`-Helfer der jeweiligen App (wegen `base` in der GitHub-Pages-Vorschau).

## Nicht tun

- Kein WordPress oder anderes CMS, keine Page-Builder, kein jQuery, kein Bootstrap, kein UI-Kit.
- Kein Tracking, keine Cookies, keine externen Fonts oder CDNs (Ausnahme: Turnstile auf Formularseiten).
- Keine erfundenen Inhalte: keine Kundenstimmen, Logos, Zahlen, Zertifikate, Auszeichnungen, Lebensläufe. Zahlen nur aus Abschnitt 5.17, immer mit Quellenlink.
- Keine echten Marken in Betrugsbeispielen.
- Keine Eingabefelder auf surprise.psyber.tech.
- Keine Texte, Bilder oder Code von eezyinn.de.
- Keine Preise anzeigen, solange `PUBLIC_SITE_PHASE=survey` (auch nicht im HTML-Quelltext).
- Nichts deployen, keine Secrets committen.
