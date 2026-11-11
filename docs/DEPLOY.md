# Deployment

> Stand: Gerüst aus Phase 0. Die vollständige Schritt-für-Schritt-Anleitung für Cloudflare folgt in Phase 5.

## Vorschau auf GitHub Pages (zum Testen)

Alle drei Websites lassen sich als Vorschau unter einer GitHub-Pages-Adresse ansehen:

| Vorschau                                          | entspricht später           |
| ------------------------------------------------- | --------------------------- |
| `https://<user>.github.io/<repo>/`                | psyber.tech                 |
| `https://<user>.github.io/<repo>/forms/`          | forms.psyber.tech           |
| `https://<user>.github.io/<repo>/surprise/gewinn` | surprise.psyber.tech/gewinn |

Einmalig einrichten: Repository → **Settings → Pages → Source: «GitHub Actions»**. Danach veröffentlicht der Workflow `.github/workflows/pages.yml` bei jedem Push auf `main` automatisch (oder von Hand über «Run workflow»).

Lokal ansehen:

```
pnpm build:pages
node scripts/serve.mjs dist-pages --base /PsySec
```

Einschränkungen der Vorschau:

- Es gibt keine API. Formulare und Umfrage antworten simuliert; gespeichert und gezählt wird nichts.
- Alle Seiten sind `noindex`.
- GitHub Pages kennt keine eigenen HTTP-Header: `_headers` und `_redirects` wirken dort nicht. Die CSP per Meta-Tag gilt trotzdem.
- Die Texte auf der «Erwischt!»-Seite nennen bewusst weiterhin `surprise.psyber.tech`; die Adresszeile zeigt in der Vorschau natürlich GitHub.
