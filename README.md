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
pnpm e2e            # Playwright-Smoke gegen die gebauten Sites
pnpm budgets        # JS-Budgets
```

## Doku

- [`docs/BRIEF.md`](docs/BRIEF.md): der vollständige Auftrag
- [`docs/DESIGN.md`](docs/DESIGN.md): Designsystem
- [`docs/DEPLOY.md`](docs/DEPLOY.md): Deployment auf Cloudflare und Vorschau auf GitHub Pages
- [`docs/DECISIONS.md`](docs/DECISIONS.md): Entscheidungen und Gründe
- [`docs/PROGRESS.md`](docs/PROGRESS.md): Stand je Phase
- [`docs/TODO.md`](docs/TODO.md): offene Angaben

Schrift: [Recursive](https://www.recursive.design) (SIL Open Font License). Icons: [Lucide](https://lucide.dev) (ISC License).
