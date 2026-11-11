# Deployment

Schritt für Schritt von «nichts» bis «live», auch ohne Vorkenntnisse in Cloudflare. Aus diesem Repo wurde noch nichts deployt; alles ist vorbereitet.

> Menüs und Bezeichnungen im Cloudflare-Dashboard ändern sich gelegentlich. Die Namen unten entsprechen dem Stand November 2026. Im Zweifel hilft die Suche im Dashboard.

## Überblick

| Was         | Adresse              | Technik                           | Verzeichnis     | Worker            |
| ----------- | -------------------- | --------------------------------- | --------------- | ----------------- |
| Website     | psyber.tech          | statische Dateien (Astro)         | `apps/web`      | `psyber-web`      |
| Umfrage     | forms.psyber.tech    | statische Dateien (Astro, Preact) | `apps/forms`    | `psyber-forms`    |
| «Erwischt!» | surprise.psyber.tech | statische Dateien (Astro)         | `apps/surprise` | `psyber-surprise` |
| API         | api.psyber.tech      | Cloudflare Worker (Hono) mit D1   | `apps/api`      | `psyber-api`      |

Alle vier laufen als Cloudflare Workers. Die drei Websites sind reine Asset-Worker: Cloudflare liefert den Ordner `dist/` aus, dazu die Header aus `dist/_headers` und die Weiterleitungen aus `dist/_redirects` (beide entstehen beim Build).

### Das brauchen Sie

- die Domain **psyber.tech** bei einem Registrar, mit Zugriff auf die Nameserver-Einstellung
- ein **Cloudflare-Konto** (der Free-Plan genügt für den Start)
- Zugriff auf dieses **GitHub-Repository**
- eine **private E-Mail-Adresse**, an die Kontaktanfragen weitergeleitet werden
- für die Befehle auf dem eigenen Rechner: Node.js 22 und pnpm

```
corepack enable && pnpm install
pnpm --filter @psyber/api exec wrangler login
```

`wrangler login` öffnet den Browser und verbindet die Kommandozeile mit Ihrem Cloudflare-Konto.

### Reihenfolge

1. Konto, Zone, Nameserver, DNSSEC
2. Datenbank D1 (EU) und Migrationen
3. Turnstile (Spam-Schutz)
4. Email Routing
5. Vier Workers mit GitHub verbinden, Domains
6. Umgebungsvariablen
7. Domain-Härtung
8. Checks nach dem Go-Live
9. Datenexport und Auswertung
10. Umschalten auf `launch`

---

## Schritt 1: Konto, Zone, Nameserver, DNSSEC

1. Unter <https://dash.cloudflare.com/sign-up> ein Konto anlegen. Zwei-Faktor-Login einschalten (Profil → Authentication).
2. **Add a domain** (bzw. «Onboard a domain») → `psyber.tech` eingeben → Plan **Free** wählen.
3. Cloudflare zeigt zwei Nameserver an (z. B. `xxx.ns.cloudflare.com`). Tragen Sie beide bei Ihrem Registrar als Nameserver der Domain ein und entfernen Sie die bisherigen.
4. Warten, bis die Zone im Dashboard den Status **Active** hat (meist unter einer Stunde, höchstens 24 Stunden).
5. **DNS → Settings → DNSSEC → Enable DNSSEC**. Cloudflare zeigt einen DS-Eintrag an. Diesen beim Registrar hinterlegen (Menüpunkt «DNSSEC» oder «DS-Record»). Liegt die Domain bei Cloudflare Registrar, genügt der Klick.
6. **SSL/TLS → Edge Certificates**: «Always Use HTTPS» einschalten, «Minimum TLS Version» auf 1.2 stellen, TLS 1.3 eingeschaltet lassen.

DNS-Einträge für die Websites müssen Sie nicht von Hand anlegen. Das erledigt Schritt 5.

---

## Schritt 2: Datenbank D1 mit EU-Jurisdiktion

Die Jurisdiktion lässt sich später **nicht** mehr ändern. Darum unbedingt mit dem Schalter anlegen:

```
cd apps/api
pnpm exec wrangler d1 create psyber --jurisdiction=eu
```

Die Ausgabe enthält eine `database_id`. Tragen Sie sie in `apps/api/wrangler.jsonc` ein (dort steht der Platzhalter `00000000-0000-0000-0000-000000000000`). Bietet Wrangler an, die Datei selbst zu ändern, lehnen Sie ab und tragen Sie nur die ID ein; so bleiben die Kommentare in der Datei erhalten. Die ID ist kein Geheimnis und gehört ins Repo: Datei committen und pushen.

Danach die Tabellen anlegen:

```
pnpm --filter @psyber/api db:migrate:remote
```

Kontrolle:

```
cd apps/api
pnpm exec wrangler d1 execute psyber --remote --command "SELECT name FROM sqlite_master WHERE type='table'"
```

Erwartet: `survey_responses`, `waitlist`, `contact_requests`, `counters` (plus `d1_migrations`).

Spätere Schema-Änderungen kommen als neue Datei in `apps/api/migrations/` und werden mit demselben Befehl `db:migrate:remote` angewendet. Das passiert bewusst nicht automatisch beim Deploy.

---

## Schritt 3: Turnstile (Spam-Schutz für Kontaktformular und Umfrage)

1. Im Dashboard **Turnstile → Add widget**.
2. **Widget name**: z. B. «PSYber Formulare».
3. **Hostname management**: `psyber.tech` und `forms.psyber.tech` eintragen.
4. **Widget mode**: «Managed». **Pre-clearance** ausgeschaltet lassen (sonst würde ein Cookie gesetzt).
5. **Create**. Cloudflare zeigt zwei Schlüssel:
   - **Site Key** (öffentlich): kommt in Schritt 6 als `PUBLIC_TURNSTILE_SITE_KEY` in die Builds von web und forms.
   - **Secret Key** (geheim): kommt in Schritt 5 per `wrangler secret put TURNSTILE_SECRET` zur API. Nie ins Repo, nie in eine Build-Variable der Websites.

Turnstile ist der einzige Dienst eines Dritten. Das Skript lädt erst, wenn jemand das Kontaktformular benutzt bzw. die Umfrage absendet, und nur auf diesen beiden Seiten erlaubt die CSP `challenges.cloudflare.com`.

---

## Schritt 4: Email Routing

Damit kommen Mails an `hallo@psyber.tech` und `security@psyber.tech` bei Ihnen an, und die API kann Sie über neue Kontaktanfragen benachrichtigen.

1. **Compute → Email Service → Email Routing → Onboard Domain** → `psyber.tech` wählen. Cloudflare legt die nötigen DNS-Einträge an (MX, SPF, DKIM).
2. **Destination Addresses**: Ihre private Adresse eintragen und den Link in der Bestätigungsmail anklicken. Erst danach ist die Adresse «verifiziert».
3. **Routing Rules → Create routing rule**, je einmal für `hallo` und `security`: «Send to an email» → Ihre verifizierte Adresse.
4. Die verifizierte Adresse kommt in Schritt 5 als Geheimnis `NOTIFY_TO` zur API.

Hinweise:

- Der Worker darf nur an **verifizierte Zieladressen** Ihres Kontos senden. Das ist kostenlos und ein guter Schutz gegen Missbrauch.
- Absender der Benachrichtigung ist `hallo@psyber.tech` (`NOTIFY_FROM` in `apps/api/wrangler.jsonc`). Wer das ändert, passt in derselben Datei auch `allowed_sender_addresses` an.
- `security@psyber.tech` steht in der `security.txt` aller drei Websites. Die Adresse muss funktionieren.

---

## Schritt 5: Vier Workers mit GitHub verbinden

Workers Builds baut und deployt bei jedem Push auf `main`. Jede App ist ein eigener Worker; alle vier zeigen auf dasselbe Repository, aber auf ein anderes Verzeichnis.

### 5.1 Zuerst die API (einmal von Hand)

Die API braucht ihre Geheimnisse, bevor die Websites sie benutzen. Am einfachsten deployen Sie sie das erste Mal vom eigenen Rechner:

```
cd apps/api
pnpm exec wrangler deploy
pnpm exec wrangler secret put TURNSTILE_SECRET   # Secret Key aus Schritt 3 einfügen
pnpm exec wrangler secret put NOTIFY_TO          # verifizierte Adresse aus Schritt 4
```

Beim ersten Deploy legt Cloudflare die Domain `api.psyber.tech` samt Zertifikat an (`routes` mit `custom_domain` in `wrangler.jsonc`). Test:

```
curl https://api.psyber.tech/v1/health
```

Erwartet: `{"ok":true}` (das Zertifikat kann ein paar Minuten brauchen).

### 5.2 Workers mit dem Repository verbinden

Für die API: **Workers & Pages → psyber-api → Settings → Builds → Connect** → Repository wählen.

Für die drei Websites: **Workers & Pages → Create application → GitHub** → Repository wählen. Wichtig: Der Name des Workers im Dashboard muss genau dem `name` in der jeweiligen `wrangler.jsonc` entsprechen, sonst schlägt der Build fehl.

| Worker            | Root directory  | Build command | Deploy command        | Build watch paths (optional)                      |
| ----------------- | --------------- | ------------- | --------------------- | ------------------------------------------------- |
| `psyber-api`      | `apps/api`      | (leer)        | `npx wrangler deploy` | `apps/api/*`, `packages/*`, `pnpm-lock.yaml`      |
| `psyber-web`      | `apps/web`      | `pnpm build`  | `npx wrangler deploy` | `apps/web/*`, `packages/*`, `pnpm-lock.yaml`      |
| `psyber-forms`    | `apps/forms`    | `pnpm build`  | `npx wrangler deploy` | `apps/forms/*`, `packages/*`, `pnpm-lock.yaml`    |
| `psyber-surprise` | `apps/surprise` | `pnpm build`  | `npx wrangler deploy` | `apps/surprise/*`, `packages/*`, `pnpm-lock.yaml` |

Weitere Einstellungen je Worker:

- **Production branch**: `main`.
- **Builds für andere Branches** (Preview): ausschalten. Vorschau-Adressen sind in den `wrangler.jsonc` bewusst deaktiviert (`preview_urls: false`, `workers_dev: false`); die Sites sollen nur unter den eigenen Domains erreichbar sein.
- Die pnpm-Version liest Cloudflare aus `packageManager` in der `package.json` im Wurzelverzeichnis. Abhängigkeiten installiert der Build selbst.
- **Vor dem ersten Build** die Variablen aus Schritt 6 setzen. Ohne Turnstile Site Key bricht der Build von web und forms mit einer klaren Meldung ab. Das ist Absicht: So geht kein Formular live, das die API ablehnen würde.

Die Domains `psyber.tech`, `forms.psyber.tech` und `surprise.psyber.tech` legt der erste Deploy an (Custom Domain in der jeweiligen `wrangler.jsonc`), inklusive DNS-Eintrag und Zertifikat.

### 5.3 Weiterleitung von www

`www.psyber.tech` soll auf `psyber.tech` zeigen:

1. **DNS → Records → Add record**: Typ `AAAA`, Name `www`, Inhalt `100::`, Proxy eingeschaltet (orange Wolke). Der Eintrag ist ein Platzhalter; er sorgt nur dafür, dass Cloudflare die Anfrage sieht.
2. **Rules → Redirect Rules → Create rule** → Vorlage **«Redirect from WWW to root»** → speichern. Ergebnis: `https://www.psyber.tech/…` → `https://psyber.tech/…` mit Status 301.

### 5.4 Alternative: von Hand deployen

Ohne Workers Builds geht es auch vom eigenen Rechner. Die Variablen aus Schritt 6 stehen dann in `apps/<app>/.env` (Vorlage: `.env.example`; die Datei wird nicht committet):

```
pnpm --filter @psyber/web build && pnpm --filter @psyber/web run deploy
pnpm --filter @psyber/forms build && pnpm --filter @psyber/forms run deploy
pnpm --filter @psyber/surprise build && pnpm --filter @psyber/surprise run deploy
pnpm --filter @psyber/api run deploy
```

---

## Schritt 6: Umgebungsvariablen

### Websites: Build-Variablen

Astro schreibt alle `PUBLIC_`-Variablen beim Build fest in die Dateien. Sie gehören darum unter **Settings → Builds → Build variables and secrets** (nicht unter «Variables and Secrets» der Laufzeit). Nach jeder Änderung neu bauen (**Retry build** oder ein Push).

| Variable                    | web | forms | surprise | Wert                                            |
| --------------------------- | :-: | :---: | :------: | ----------------------------------------------- |
| `PUBLIC_SITE_PHASE`         |  ✓  |   ✓   |    ✓     | `survey` (später `launch`, siehe Schritt 10)    |
| `PUBLIC_TURNSTILE_SITE_KEY` |  ✓  |   ✓   |    –     | Site Key aus Schritt 3                          |
| `NODE_VERSION`              |  ✓  |   ✓   |    ✓     | `22` (dieselbe Version wie lokal und in der CI) |
| `PUBLIC_HSTS_PRELOAD`       |  –  |   –   |    –     | erst später: `true` (siehe Schritt 7)           |

Nicht nötig sind `PUBLIC_API_BASE`, `PUBLIC_WEB_URL`, `PUBLIC_FORMS_URL` und `PUBLIC_SURPRISE_URL`: Ohne Angabe gelten die echten Adressen. Sie dienen nur der lokalen Entwicklung und der Vorschau.

### API: Variablen und Geheimnisse

| Name               | Art       | Wo                                  | Wert                                              |
| ------------------ | --------- | ----------------------------------- | ------------------------------------------------- |
| `ENVIRONMENT`      | Variable  | `apps/api/wrangler.jsonc`           | `production`                                      |
| `NOTIFY_FROM`      | Variable  | `apps/api/wrangler.jsonc`           | `hallo@psyber.tech`                               |
| `TURNSTILE_SECRET` | Geheimnis | `wrangler secret put` (Schritt 5.1) | Secret Key aus Schritt 3                          |
| `NOTIFY_TO`        | Geheimnis | `wrangler secret put` (Schritt 5.1) | verifizierte Zieladresse aus Schritt 4            |
| `ALLOWED_ORIGINS`  | Variable  | Dashboard, optional                 | zusätzliche Origins, kommagetrennt (normal: leer) |
| `HSTS_PRELOAD`     | Variable  | Dashboard, erst später              | `true` (siehe Schritt 7)                          |

Für die API gibt es **keine** Build-Variablen. Geheimnisse stehen nie im Repo: Lokal liegen sie in `apps/api/.dev.vars` (steht in `.gitignore`), in Produktion nur bei Cloudflare.

---

## Schritt 7: Domain-Härtung

1. **CAA** (welche Stellen dürfen Zertifikate für die Domain ausstellen): **DNS → Records → Add record**, Typ `CAA`, Name `psyber.tech`, Tag «Only allow specific hostnames», je ein Eintrag für die Zertifizierungsstellen, die Cloudflare nutzt: `pki.goog`, `letsencrypt.org`, `ssl.com`, `sectigo.com`. Die aktuelle Liste steht in der Cloudflare-Doku unter «Certificate authorities»; sie kann sich ändern. Dazu ein Eintrag mit Tag `iodef` und dem Wert `mailto:security@psyber.tech`.
2. **SPF und DKIM** legt Email Routing in Schritt 4 selbst an. Kontrolle unter **DNS → Records**: ein `TXT`-Eintrag mit `v=spf1 include:_spf.mx.cloudflare.net ~all` und ein DKIM-Eintrag.
3. **DMARC**: `TXT`-Eintrag mit dem Namen `_dmarc` und mindestens

   ```
   v=DMARC1; p=quarantine; rua=mailto:security@psyber.tech
   ```

   Bequemer geht es im Dashboard über «DMARC Management»; dort lassen sich die Berichte auch auswerten. Nach ein paar ruhigen Wochen auf `p=reject` verschärfen.

4. **HSTS-Preload** (die Domain kommt fest in die Browser, HTTP ist dann gar nicht mehr möglich). Erst nach einigen Wochen stabilem Betrieb, denn der Schritt lässt sich nur mühsam rückgängig machen und gilt für **alle** Subdomains:
   1. Bei web, forms und surprise die Build-Variable `PUBLIC_HSTS_PRELOAD=true` setzen und neu bauen. Bei der API die Variable `HSTS_PRELOAD=true` setzen.
   2. Prüfen: `curl -sI https://psyber.tech | grep -i strict` zeigt `max-age=31536000; includeSubDomains; preload`.
   3. Die Domain unter <https://hstspreload.org> eintragen.

Bis dahin senden alle vier Dienste `Strict-Transport-Security: max-age=31536000; includeSubDomains` (ohne `preload`).

---

## Schritt 8: Checks nach dem Go-Live

### Header und Sicherheit

```
curl -sI https://psyber.tech | grep -iE "strict|content-security|x-content|referrer|permissions|cross-origin|cache-control"
curl -sI https://surprise.psyber.tech/gewinn | grep -iE "x-robots|referrer"
curl -sI https://surprise.psyber.tech/ | grep -iE "HTTP|location"       # 302 → /gewinn
curl -sI https://www.psyber.tech/ | grep -iE "HTTP|location"            # 301 → https://psyber.tech/
curl -s https://psyber.tech/.well-known/security.txt
```

Dieselben Prüfungen laufen lokal und in der CI gegen die Workers-Laufzeit: `pnpm build && pnpm check:headers` (227 Prüfungen).

**Mozilla HTTP Observatory** (<https://developer.mozilla.org/en-US/observatory>): alle vier Adressen prüfen. Ziel ist **A+**. So schneiden die Tests voraussichtlich ab:

| Test                         | Stand                                                                                       |
| ---------------------------- | ------------------------------------------------------------------------------------------- |
| Content Security Policy      | `default-src 'none'`, keine `unsafe-`-Quellen, Skripte und Styles nur von uns bzw. per Hash |
| Cookies                      | es gibt keine                                                                               |
| Redirection                  | HTTP → HTTPS über «Always Use HTTPS» (Schritt 1)                                            |
| Referrer Policy              | `strict-origin-when-cross-origin`, surprise `no-referrer`                                   |
| Strict Transport Security    | ein Jahr, `includeSubDomains`                                                               |
| Subresource Integrity        | keine fremden Skripte im HTML                                                               |
| X-Content-Type-Options       | `nosniff`                                                                                   |
| X-Frame-Options              | `DENY`, dazu `frame-ancestors 'none'`                                                       |
| Cross-Origin Resource Policy | `same-origin` (nur die Vorschaubilder unter `/og/` sind `cross-origin`)                     |

Cloudflare kann von sich aus Skripte in HTML-Seiten einfügen. Schalten Sie für die Zone darum **aus**: «Rocket Loader», «Email Address Obfuscation» (bei neuen Zonen oft eingeschaltet), die automatische Einbindung von «Web Analytics» und «JavaScript Detections» bzw. «Bot Fight Mode». Sonst verändert Cloudflare die gebauten Seiten, und die CSP meldet Verstösse. Weicht das Observatory-Ergebnis ab, hier zuerst nachsehen.

### Lighthouse

- Lokal: `pnpm build && pnpm lighthouse` (mobil; Ziel mindestens 95 in allen Kategorien, LCP unter 2 s, CLS unter 0.05).
- Live: <https://pagespeed.web.dev> mit `https://psyber.tech`, `https://forms.psyber.tech` und `https://surprise.psyber.tech/gewinn`.

Letzte lokale Messung (November 2026): web 100/100/100/100, Checkliste 100/100/100/100, forms 100/100/100/100, surprise 100/100/100/66; LCP 0,9 bis 1,2 s. Die 66 bei SEO sind gewollt: Die Seite ist `noindex`, und Lighthouse wertet das als Fehler.

### Funktion

1. **Kontaktformular** auf psyber.tech ausfüllen und senden. Die Benachrichtigung kommt an Ihre Adresse; «Antworten» geht an die anfragende Person.
2. **Umfrage** komplett durchklicken (am besten mit `?quelle=website`) und eine Test-E-Mail für die Warteliste angeben.
3. Auf dem Danke-Screen beide Links öffnen (Checkliste und Test-Link).
4. In der Datenbank nachsehen:

   ```
   cd apps/api
   pnpm exec wrangler d1 execute psyber --remote --command "SELECT created_day, quelle, q1, q4 FROM survey_responses ORDER BY created_day DESC LIMIT 5"
   pnpm exec wrangler d1 execute psyber --remote --command "SELECT * FROM counters ORDER BY day DESC LIMIT 20"
   pnpm exec wrangler d1 execute psyber --remote --command "SELECT created_day, founding_family FROM waitlist ORDER BY created_day DESC LIMIT 5"
   ```

   Erwartet: Antwort und Wartelisten-Eintrag nur mit Datum; die Zähler `survey_started`, `survey_completed`, `bait_click` und `checklist_click` je um 1 erhöht.

5. Testdaten wieder löschen (siehe «Betrieb»).

---

## Schritt 9: Datenexport und Auswertung

```
pnpm export     # schreibt reports/export-YYYY-MM-DD.json
pnpm analyze    # erzeugt reports/umfrage-YYYY-MM-DD.html
```

- `pnpm export` holt die anonymen Antworten, die Zähler und zwei Summen der Warteliste (Einträge gesamt, davon Founding Families). **E-Mail-Adressen und Kontaktanfragen werden nicht exportiert.**
- `pnpm analyze` nimmt den neuesten Export aus `reports/` (oder eine Datei als Argument: `pnpm analyze reports/export-2026-12-01.json`) und erzeugt einen Bericht als einzelne HTML-Datei mit der Go/No-Go-Ampel.
- Der Ordner `reports/` wird nicht versioniert.
- Zum Ausprobieren ohne echte Daten: `pnpm analyze --demo` rechnet mit erfundenen Beispielantworten. Der Bericht ist dann deutlich als Demo markiert.

Die E-Mail-Adressen der Warteliste brauchen Sie erst beim Start des Angebots. Abfrage direkt, ohne Umweg über eine Datei auf dem Rechner:

```
cd apps/api
pnpm exec wrangler d1 execute psyber --remote --command "SELECT email, founding_family FROM waitlist ORDER BY created_day"
```

Vollständige Sicherung (enthält Personendaten, also verschlüsselt ablegen und nach Gebrauch löschen): `pnpm --filter @psyber/api db:backup`.

---

## Schritt 10: Umschalten auf `launch`

1. Die finalen Preise in `apps/web/src/config/site.ts` eintragen (`prices`) und committen.
2. Offene `[TODO: …]`-Platzhalter erledigen (`docs/TODO.md`), Impressum und Datenschutz rechtlich prüfen lassen.
3. Bei `psyber-web` die Build-Variable `PUBLIC_SITE_PHASE` auf `launch` stellen und neu bauen.
4. Prüfen: Die Pakete zeigen Preise, der CTA im Header heisst «Session anfragen».

In der Phase `survey` stehen die Preise nicht einmal im HTML-Quelltext. Ein Test in `e2e/web.spec.ts` sichert das ab.

---

## Betrieb

### Mindestens einmal pro Jahr neu bauen

`security.txt` trägt ein Ablaufdatum: Build-Datum plus ein Jahr (RFC 9116). Spätestens nach elf Monaten alle drei Websites neu bauen (Push auf `main` oder **Retry build**). Tragen Sie sich eine Erinnerung ein. In der Praxis lösen die monatlichen Dependabot-Updates ohnehin Builds aus.

### Updates

Dependabot öffnet monatlich Pull Requests für Abhängigkeiten und GitHub Actions. Die CI prüft jeden PR: Lint, Typecheck, Unit-Tests, Build, JS-Budgets, Header-Prüfung und die Playwright-Tests. Erst mergen, wenn alles grün ist.

### Rollback

**Workers & Pages → Worker → Deployments**: eine frühere Version wählen und **Rollback**. Die Datenbank bleibt davon unberührt.

### Logs

Die API schreibt nur eigene, knappe Meldungen (zum Beispiel einen Fehlercode, wenn die Benachrichtigung scheitert). Automatische Request-Logs sind ausgeschaltet, damit weder IP-Adressen noch Header gespeichert werden. Einsehen unter **Workers & Pages → psyber-api → Observability**.

### Daten löschen

- Kontaktanfragen löscht ein täglicher Cron nach 180 Tagen von selbst.
- Auf Wunsch einer Person sofort:

  ```
  cd apps/api
  pnpm exec wrangler d1 execute psyber --remote --command "DELETE FROM contact_requests WHERE email = 'person@example.ch'"
  pnpm exec wrangler d1 execute psyber --remote --command "DELETE FROM waitlist WHERE email = 'person@example.ch'"
  ```

- Antworten der Umfrage sind anonym und lassen sich keiner Person zuordnen. Eine einzelne Antwort kann darum nicht «auf Wunsch» gefunden werden.
- Testdaten nach den Checks aus Schritt 8: die Zeilen des Testtags gezielt löschen, zum Beispiel `DELETE FROM survey_responses WHERE created_day = '2026-12-01' AND quelle = 'website'`.

### Grenzen des Free-Plans

Für den Start reicht der Free-Plan: Workers (100’000 Requests pro Tag für die API; statische Dateien zählen nicht), D1, Turnstile, Email Routing und die Rate Limits sind enthalten. Die aktuellen Grenzen stehen auf den Preis-Seiten von Cloudflare.

### Lokal entwickeln

```
cp apps/api/.dev.vars.example apps/api/.dev.vars
pnpm --filter @psyber/api db:migrate:local
pnpm dev:api        # http://localhost:8787
pnpm dev:web        # http://localhost:4321
pnpm dev:forms      # http://localhost:4322
pnpm dev:surprise   # http://localhost:4323
```

So wie Cloudflare ausliefert (mit `_headers` und `_redirects`): `pnpm --filter @psyber/web build && pnpm --filter @psyber/web cf:dev`.

---

## Bekannte Grenzen und Begründungen

- **CSP an zwei Stellen.** Die Hashes für Skripte und Styles stehen im Meta-Tag jeder Seite (Astro erzeugt sie beim Build). Direktiven, die per Meta nicht wirken (`frame-ancestors`), stehen im Header aus `_headers`, zusammen mit `base-uri`, `object-src`, `form-action` und `connect-src`. Der Browser wendet beide Richtlinien an.
- **Inline-Skripte nur von Astro.** Die Umfrage braucht das kleine Startskript für die Preact-Insel. Es ist per Hash erlaubt; `unsafe-inline` gibt es nirgends.
- **Lighthouse lokal.** Der lokale Server liefert über HTTP und ohne das Netz von Cloudflare aus. Die Werte sind ein guter Anhaltspunkt, kein Ersatz für die Messung nach dem Go-Live.
- **Schriften:** Manrope und Geist Mono, je eine Latin-Datei im Preload (zusammen 48 KB), ein Jahr gecacht. Die Ersatzschrift ist auf Manrope abgestimmt; lokal gemessen verschiebt sich beim Schriftwechsel nichts (CLS 0).
- **Startseite:** Sektionen weit unter dem ersten Bildschirm rechnet der Browser erst bei Bedarf (`content-visibility`). Sehr alte Browser ohne diese Eigenschaft berechnen einfach alles sofort.
- **SEO-Wert von surprise.** `noindex` ist dort Pflicht; Lighthouse zieht dafür Punkte ab.
- **D1 Time Travel.** Cloudflare hält für D1 30 Tage Wiederherstellungspunkte vor. Wer Zugriff auf das Konto hat, könnte damit theoretisch nachvollziehen, welche Zeilen gleichzeitig entstanden sind. Technisch lässt sich das nicht abschalten; schützen Sie das Konto mit Zwei-Faktor-Login und vergeben Sie keine weiteren Zugänge.
- **Rate Limits sind «ungefähr».** Die Rate-Limit-Bindings von Workers zählen pro Cloudflare-Standort und arbeiten bewusst unscharf. Für den Schutz der Formulare reicht das; Turnstile und der Honeypot kommen dazu.

---

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
