# PSYber

Cyber-Prävention für Familien im Raum Zürich. **Wir patchen Layer 8.**

Dieses Monorepo enthält die komplette Web-Plattform:

| App             | Domain               | Zweck                                               |
| --------------- | -------------------- | --------------------------------------------------- |
| `apps/web`      | psyber.tech          | One-Pager, Checkliste, Impressum, Datenschutz       |
| `apps/forms`    | forms.psyber.tech    | Umfrage, eine Frage pro Screen                      |
| `apps/surprise` | surprise.psyber.tech | Auflösung des Phishing-Tests («Erwischt!»)          |
| `apps/api`      | api.psyber.tech      | Cloudflare Worker: Umfrage, Kontakt, anonyme Zähler |

Kein Tracking, keine Cookies, keine externen Fonts.

## Loslegen

Voraussetzung: Node 22.23 oder neuer.

```
corepack enable
pnpm install
pnpm dev:web        # http://localhost:4321  (Styleguide: /styleguide)
pnpm dev:forms      # http://localhost:4322
pnpm dev:surprise   # http://localhost:4323
pnpm dev:api        # http://localhost:8787
```

## Prüfen

```
pnpm lint && pnpm typecheck && pnpm test && pnpm build
pnpm e2e             # Playwright gegen die gebauten Sites
pnpm budgets         # JS-Budgets (web 120 KB, forms 60 KB, surprise 25 KB)
pnpm check:headers   # Security-Header, Weiterleitungen und 404 in der Workers-Laufzeit
pnpm lighthouse      # Lighthouse mobil gegen den lokalen Build
```

## Auswerten

```
pnpm export          # anonyme Antworten und Zähler aus D1 (ohne E-Mail-Adressen)
pnpm analyze         # Bericht mit Go/No-Go-Ampel: reports/umfrage-YYYY-MM-DD.html
pnpm analyze --demo  # Bericht mit erfundenen Beispieldaten zum Ausprobieren
```

## Vorschau

Alle drei Websites lassen sich ohne Cloudflare unter einer Adresse ansehen (Formulare antworten simuliert):

```
pnpm build:pages
node scripts/serve.mjs dist-pages --base /PsySec   # http://localhost:4321/PsySec/
```

Auf GitHub Pages veröffentlicht der Workflow `pages.yml` denselben Stand bei jedem Push auf `main` (einmalig: Settings → Pages → Source «GitHub Actions»).

![psyber.tech](docs/screenshots/web-hero-desktop.jpg)

## Doku

- [`docs/BRIEF.md`](docs/BRIEF.md): der vollständige Auftrag
- [`docs/DESIGN.md`](docs/DESIGN.md): Designsystem
- [`docs/DEPLOY.md`](docs/DEPLOY.md): Deployment auf Cloudflare und Vorschau auf GitHub Pages
- [`docs/DECISIONS.md`](docs/DECISIONS.md): Entscheidungen und Gründe
- [`docs/PROGRESS.md`](docs/PROGRESS.md): Stand je Phase
- [`docs/TODO.md`](docs/TODO.md): offene Angaben
- [`docs/PR_DESCRIPTION.md`](docs/PR_DESCRIPTION.md): Überblick mit Screenshots

Schrift: [Recursive](https://www.recursive.design) (SIL Open Font License). Icons: [Lucide](https://lucide.dev) (ISC License).
