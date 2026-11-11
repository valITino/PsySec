# PSYber Web-Plattform

PSYber ist Cyber-Prävention für Familien im Raum Zürich: Aufklärung über Manipulation (Phishing, Anlagebetrug, Romance Scam, Cybermobbing) plus Absicherung des Heimnetzes. Dieses Monorepo enthält drei statische Websites (psyber.tech, forms.psyber.tech, surprise.psyber.tech) und einen kleinen Cloudflare Worker als API. Aktuelle Phase: Marktvalidierung mit Umfrage, darum zeigt die Website noch keine Preise.

**Massgeblich ist `docs/BRIEF.md`** (der vollständige Auftrag, wörtlich). Stand und nächste Schritte: `docs/PROGRESS.md`. Entscheidungen: `docs/DECISIONS.md`. Offene Angaben: `docs/TODO.md`. Design: `docs/DESIGN.md`. Deployment: `docs/DEPLOY.md`.

## Struktur

```
apps/web          psyber.tech            Astro, One-Pager + /checkliste /impressum /datenschutz /styleguide 404
apps/forms        forms.psyber.tech      Astro + Preact-Island, Umfrage-Funnel
apps/surprise     surprise.psyber.tech   Astro, Auflösung des Phishing-Tests («Erwischt!»), keine Eingabefelder
apps/api          api.psyber.tech        Cloudflare Worker (Hono, D1, Turnstile, Rate Limiting, send_email, Cron)
packages/ui       Tokens, Schrift, Psi-Icon, Psi-Netz, Wortmarke, Buttons, Karten, Motion-Helfer
packages/survey   Fragen als Daten, Zod-Schemas, Sprunglogik, Tipps (von Client und API genutzt)
packages/config   tsconfig-/ESLint-Basis, CSP- und Header-Helfer
scripts/          OG-Bilder/Favicons, Budget-Check, GitHub-Pages-Build, analyze.ts
e2e/              Playwright-Smoke-Tests
docs/             BRIEF, DESIGN, DEPLOY, DECISIONS, PROGRESS, TODO
```

## Befehle

```
corepack enable && pnpm install
pnpm dev:web | dev:forms | dev:surprise | dev:api
pnpm build        alle Apps bauen
pnpm lint         ESLint + Prettier-Check
pnpm typecheck    astro check + tsc
pnpm test         Vitest (packages/survey, apps/api, scripts)
pnpm e2e          Playwright-Smoke gegen die gebauten Sites
pnpm budgets      JS-Budgets prüfen (web 120 KB, forms 60 KB, surprise 25 KB, gzip)
pnpm build:pages  Vorschau-Build für GitHub Pages (alle drei Sites unter einem Pfad, API gemockt)
pnpm analyze      Umfrage-Auswertung aus D1-Export
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

- Farben nur aus den Tokens (`packages/ui/src/styles/tokens.css`): night, aubergine, deep, line, lav, soft, white, violet, violet-dark, amber, paper, ink, muted. Höchstens zwei helle Sektionen pro Seite.
- Schrift: Recursive (alle Achsen). Display: wght 800–900, CASL 0.6–1. Fliesstext: wght 400. Code/Meta: MONO 1.
- Keine gesperrten Versalien. Abschnittsnummern in Hex («0x01»), Kicker als Code-Kommentar («// …»).
- Karten: Radius 16 px, 1 px Rahmen, kein Schatten. Buttons: 48 px hoch, Radius 12 px. Fokus-Ring 3 px amber.
- Animationen nur die sieben Momente aus Abschnitt 4.5 des Auftrags. `prefers-reduced-motion` überall respektieren.
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
