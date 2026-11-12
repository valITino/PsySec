# Auftrag: PSYber Web-Plattform (psyber.tech, forms.psyber.tech, surprise.psyber.tech)

Du bist Senior Frontend- und Fullstack-Engineer mit starkem Gespür für Design. Du baust in diesem leeren Repository die komplette Web-Plattform für PSYber: drei Websites und ein kleines API-Backend. Arbeite selbständig, gründlich und in Phasen. Qualitätsmassstab: Agentur-Niveau wie bei preisgekrönten Websites, aber schnell, sicher und barrierefrei.

---

## Kontext und Zweck

Dies ist ein Präventions- und Aufklärungsprojekt (Security Awareness) für Familien. Die Plattform hilft Menschen, Online-Betrug, Phishing, Romance Scam und Cybermobbing zu erkennen, und erklärt, wie sie ihr Heimnetz absichern. Wörter wie «Betrug» oder «Phishing» kommen vor, weil genau das das Thema der Aufklärung ist.

- Gebaut werden ausschliesslich: eine Informations-Website, eine anonyme Umfrage, eine Aufklärungsseite und ein kleines Backend, das Formulareingaben speichert. Keine Angriffs-, Spionage- oder Überwachungssoftware.
- Alle Betrugsbeispiele (SMS, Chat, Adressen) sind fiktiv, dienen nur der Aufklärung und werden nie als klickbare Links ausgegeben.
- Der «Phishing-Test» am Ende der Umfrage ist eine transparente Sensibilisierungsübung, wie sie in Security-Awareness-Trainings üblich ist: Ein Link auf die eigene Domain (surprise.psyber.tech) führt direkt zu einer freundlichen Aufklärungsseite. Dort wird nichts abgefragt und nichts gespeichert ausser einem anonymen Zähler.
- Das Frühwarnsystem für Kundengeräte wird auf der Website nur beschrieben, nicht gebaut. Später läuft es ausschliesslich auf Geräten von Kundinnen und Kunden, mit Einwilligung aller Nutzerinnen und Nutzer.

---

## 0. Arbeitsweise

1. Lies den ganzen Auftrag, bevor du anfängst.
2. Erster Commit: Lege diesen Auftrag unverändert als `docs/BRIEF.md` ab. Erstelle eine knappe `CLAUDE.md` (Projekt in drei Sätzen, Struktur, Befehle, Sprach- und Designregeln, die Verbote aus Abschnitt 12, Verweis auf `docs/BRIEF.md`). Spätere Sessions arbeiten mit diesen Dateien weiter.
3. Arbeite die Phasen aus Abschnitt 11 der Reihe nach ab. Nach jeder Phase: install, lint, typecheck, test, build aller betroffenen Apps. Wenn Playwright verfügbar ist (oder sich installieren lässt), mach Screenshots in 390×844 und 1440×900 und prüfe sie selbst kritisch (Überlappungen, Abstände, Lesbarkeit, Zustände der Animationen). Dann Commit mit klarer Message und Eintrag in `docs/PROGRESS.md`. Danach direkt weiter mit der nächsten Phase, bis alles fertig ist oder du wirklich blockiert bist.
4. Halte `docs/PROGRESS.md` laufend aktuell. Endet die Session vorher, muss eine neue Session mit «Lies CLAUDE.md und docs/PROGRESS.md und mach weiter» nahtlos fortsetzen können.
5. Fehlende Angaben (Name, Adresse, Telefon, Foto, finale Preise) nie erfinden: sichtbare Platzhalter im Format `[TODO: …]` setzen und in `docs/TODO.md` sammeln.
6. Bei Unklarheiten die vernünftigste Annahme treffen, in `docs/DECISIONS.md` festhalten (Entscheidung, Grund, Alternative) und weiterarbeiten.
7. Du hast keine Zugangsdaten für Cloudflare oder Domains. Nichts deployen, keine Secrets ins Repo. Deployment vollständig vorbereiten und in `docs/DEPLOY.md` dokumentieren.
8. Die Website eezyinn.de ist Inspiration für Struktur, Rhythmus und Interaktion (Abschnitt 4.6). Sie ist aus deiner Umgebung eventuell nicht erreichbar; massgeblich ist die Beschreibung hier. Keine Texte, Bilder, Logos oder Code von dort übernehmen.

---

## 1. Was ist PSYber?

PSYber (Schreibweise exakt so, gesprochen /ˈsaɪbɐ/ wie «Cyber»; PSY steht für Psychologie) ist ein neues Angebot für Cyber-Prävention für Familien im Raum Zürich.

- Kernidee: Betrüger hacken Menschen, nicht Router. PSYber erklärt Familien, wie Manipulation funktioniert (Online-Anlagebetrug, Phishing, Romance Scam, Cybermobbing, OpSec und Privatsphäre), und sichert gleichzeitig das Heimnetz ab (Router, DNS-Filter, Kinderprofile, Passwort-Manager, Backup, Überblick über den Netzwerkverkehr).
- Leistungen: Sessions bei den Familien zu Hause, Vorträge, Abos mit «Ist das echt?»-Check und Frühwarnsystem.
- Claim: «Wir patchen Layer 8.» (Layer 8 = der Mensch, als achte Schicht über dem OSI-Modell). Weitere Claims: «Sicherheit, die beim Menschen anfängt.» und «Pause statt Panik.»
- Aktuelle Phase: Marktvalidierung. Zuerst läuft eine Umfrage (forms.psyber.tech), dann ein Pilot mit «Founding Families», dann der Launch.

---

## 2. Die vier Teile

| App | Domain | Zweck |
|---|---|---|
| `apps/web` | psyber.tech (www leitet auf die Apex-Domain weiter) | One-Pager mit Marke, Angebot und Kontakt; dazu `/checkliste`, `/impressum`, `/datenschutz`, 404 |
| `apps/forms` | forms.psyber.tech | Umfrage-Funnel im Typeform-Stil, eine Frage pro Screen |
| `apps/surprise` | surprise.psyber.tech | Auflösung des Phishing-Tests am Ende der Umfrage («Erwischt!») |
| `apps/api` | api.psyber.tech | Cloudflare Worker: speichert Umfrage, Kontaktanfragen und anonyme Zähler |

---

## 3. Tech-Stack (verbindlich)

- Monorepo mit pnpm Workspaces (pnpm über corepack), TypeScript strict, Node 22 oder neuer (Astro ab Version 6 verlangt Node 22; prüfe `node -v`).
- `apps/web`, `apps/forms`, `apps/surprise`: Astro (aktuelle stabile Version, mindestens 6), `output: 'static'`, kein Adapter. Interaktive Teile als Islands. Für den Umfrage-Funnel Preact (`@astrojs/preact`, `@preact/signals`), sonst Vanilla TypeScript.
- Styling: Tailwind CSS (v4 oder neuer) über `@tailwindcss/vite`. Design-Tokens als CSS Custom Properties in `packages/ui`, eingebunden über `@theme`. Kein UI-Kit, kein Bootstrap.
- Animation: GSAP mit ScrollTrigger und SplitText (seit 2025 inklusive aller Plugins kostenlos) und Lenis (npm-Paket `lenis`) für Smooth Scroll. Keine weiteren Animations-Libraries ohne zwingenden Grund.
- Schrift: Recursive (Variable Font, OFL), selbst gehostet über `@fontsource-variable/recursive`. Lade die Variante mit allen Achsen (MONO, CASL, wght, slnt, CRSV), denn MONO und CASL sind Teil der Marke. Nur das Latin-Subset preloaden. Kein Google Fonts, kein CDN.
- Validierung: Zod (Version 4 oder neuer). Die Schemas liegen in `packages/survey`; Client und API nutzen dieselben.
- API: Cloudflare Workers mit Hono; Cloudflare D1 (EU-Jurisdiktion, siehe 8.3); Cloudflare Turnstile gegen Spam; Workers Rate Limiting; Email Routing mit `send_email`-Binding für Benachrichtigungen; Cron Trigger für Löschfristen. Konfiguration in `wrangler.jsonc`.
- Hosting: alle vier Teile als Cloudflare Workers. Die drei Websites sind reine Static-Assets-Worker (ohne Worker-Script) mit `_headers`- und `_redirects`-Dateien. Deployment per Workers Builds aus GitHub. psyber.tech muss als Zone bei Cloudflare laufen (Nameserver), sonst funktionieren Custom Domains auf Workers nicht.
- Qualität: ESLint (flat config) und Prettier mit Astro-Plugins, Vitest, Playwright für E2E-Smoke-Tests, GitHub Actions als CI, Dependabot für npm und Actions.

### 3.1 Repo-Struktur (Ziel)

```
apps/web          psyber.tech
apps/forms        forms.psyber.tech
apps/surprise     surprise.psyber.tech
apps/api          api.psyber.tech (Worker, Hono, D1-Migrationen)
packages/ui       tokens.css, Schrift, Logo- und Psi-Netz-Komponenten, Buttons, Karten, Motion-Helfer (Lenis + GSAP inkl. reduced motion)
packages/survey   Fragen als typisierte Daten, Zod-Schemas, Sprunglogik, Validierung, Tipps zu den Schwerpunkten
packages/config   gemeinsame tsconfig- und ESLint-Basis
docs/             BRIEF.md, DESIGN.md, DEPLOY.md, DECISIONS.md, PROGRESS.md, TODO.md
scripts/          analyze.ts (Auswertung, Phase 6), OG-Bild-Generator
```

Root-Skripte: `pnpm dev:web`, `pnpm dev:forms`, `pnpm dev:surprise`, `pnpm dev:api`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm e2e`, `pnpm analyze`.

Umgebungsvariablen (je App eine `.env.example`):
- `PUBLIC_API_BASE` (Dev: `http://localhost:8787`, Prod: `https://api.psyber.tech`)
- `PUBLIC_TURNSTILE_SITE_KEY` (Dev: die offiziellen Cloudflare-Testkeys)
- `PUBLIC_SITE_PHASE` = `survey` oder `launch` (siehe 5.0)

---

## 4. Designsystem

Grundhaltung: sauber, modern, elegant, minimalistisch und trotzdem aussagekräftig. Technisch und nerdig mit Humor, nie kindisch, nie Angst machend. Dunkel wie die Inspiration, aber mit eigener Identität: Aubergine statt Schwarz. Animationen gezielt, ruhig und angenehm, nie Effekt um des Effekts willen. Halte das Designsystem in `docs/DESIGN.md` fest.

### 4.1 Farben (Kontraste geprüft)

| Token | Hex | Verwendung |
|---|---|---|
| `--night` | #140a29 | Seitenhintergrund |
| `--aubergine` | #261547 | erhöhte Flächen, Karten, Header nach dem Scrollen |
| `--deep` | #1b0d35 | Terminal, Code, tiefe Panels |
| `--line` | #3d2b68 | Linien und Rahmen auf dunkel (nie für Text) |
| `--lav` | #ad9bf6 | Akzent und Sekundärtext auf dunkel (7,96:1 auf night) |
| `--soft` | #e7e1fb | Fliesstext auf dunkel (14,98:1) |
| `--white` | #ffffff | Überschriften auf dunkel (19:1) |
| `--violet` | #6b40c9 | Primärbuttons und Akzente (weisse Schrift 6,56:1) |
| `--violet-dark` | #492293 | Hover und Active |
| `--amber` | #f9ad26 | Warnsignale und Highlights, sparsam (9,98:1 auf night; Text darauf in #22172f, 8,96:1) |
| `--paper` | #f5f4fd | helle Fläche, höchstens zwei Sektionen pro Seite, für Rhythmus |
| `--ink` | #22172f | Text auf hell (15,62:1 auf paper) |
| `--muted` | #675e76 | Sekundärtext auf hell (5,59:1) |

Statusfarben nur zusammen mit Icon und Text, nie als einziges Signal: gut #0ca30c, Warnung #fab219, kritisch #d03b3b.
Erlaubt ist höchstens ein dezenter violetter Radial-Glow hinter dem Hero-Widget. Keine Regenbogenverläufe, kein Glassmorphism-Overkill.

### 4.2 Typografie (Recursive)

- Display (H1, H2): wght 800–900, CASL 0.6–1 (H1 = 1), MONO 0, letter-spacing −0.02em, line-height 0.95–1.05. H1 etwa `clamp(2.75rem, 7vw, 6.5rem)`.
- Fliesstext: wght 400, CASL 0, MONO 0, 17–18 px, line-height 1.55, höchstens 68 Zeichen pro Zeile.
- Code und Meta: MONO 1, CASL 0 oder 1, 13–14 px. Für Kicker, Terminal, Tabellen-Zahlen (`tabular-nums`) und Abschnittsnummern.
- Keine Labels in gesperrten Versalien. Stattdessen zwei nerdige Markenkonventionen: Abschnittsnummern in Hex («0x01», «0x02» …) und Kicker als Code-Kommentar («// So arbeiten wir»).
- Grosse Einzelzahlen in Display-Schnitt mit proportionalen Ziffern.

### 4.3 Logo und Bildwelt

- Wortmarke «PSYber»: Recursive wght 900, CASL 1, letter-spacing −0.02em. Immer exakt diese Schreibweise.
- Icon für Favicon und Header: ein Psi aus einer Linie. `viewBox="0 0 12 14"`, Pfad `M2 2.2 C2 7 4 9.2 6 9.2 C8 9.2 10 7 10 2.2 M6 0.8 V13.2`, `stroke="currentColor"`, `stroke-width="1.4"`, runde Enden, keine Füllung.
- Key Visual «Psi-Netz»: ein Psi aus Netzwerkknoten. Baue es als Komponente aus diesen Daten (`viewBox="0 -12 120 172"`):
  - Schale: Polyline durch 11 Punkte (von links nummeriert 1–11): (12,22) (14.1,47.7) (20.3,67.4) (30.1,81.2) (43.5,89.3) (60,92) (76.5,89.3) (89.9,81.2) (99.7,67.4) (105.9,47.7) (108,22).
  - Stiel: Linie x=60 von y=8 bis y=156; Knoten bei y = 28, 48, 68, 92, 113, 134, 156.
  - Nebenknoten (36,8) und (84,8), je mit Linie zu (60,8).
  - Dünne Querverbindungen (45 % Deckkraft): Punkt 2→(60,28), 3→(60,48), 4→(60,68), 10→(60,28), 9→(60,48), 8→(60,68), 3→(60,28), 9→(60,28), 5→(60,68), 7→(60,68), 2→(36,8), 10→(84,8).
  - Hauptlinien in `--lav`, Strichstärke 1.15. Knoten weiss gefüllt mit Rand in Hintergrundfarbe, r 1.5 (Nebenknoten r 1). Die drei Enden (12,22), (108,22) und (60,8) in `--amber`, r 2.5.
  - Über (60,8) drei Signalbögen in amber (Radien 7, 11.5, 16; Winkel −128° bis −52°; Deckkraft 1, 0.65, 0.35).
  - Animation: Knoten pulsieren leicht versetzt, die Signalbögen senden nacheinander (Loop ca. 3 s), bei feinem Pointer neigt sich das Netz um wenige Grad. Bei reduced motion statisch.
- Hintergrund-Textur: feines Netz aus Punkten und Linien (Weiss, 6–8 % Deckkraft), nur in Hero und Footer.
- Keine Stockfotos, keine KI-Bilder von Menschen. Icons: schlichte Line-Icons (z. B. Lucide), 1.5 px Strich. Emojis nur in Beispiel-Chats und im Test-Link der Umfrage.

### 4.4 Layout

- Container höchstens 1200 px, 12-Spalten-Raster, grosszügiger Weissraum: Sektionen 128–160 px vertikal auf Desktop, 72–96 px auf Mobile.
- Inhalte links ausgerichtet; zentriert nur der Abschluss-CTA.
- Karten: Radius 16 px, 1 px Rahmen in `--line`, kein Schlagschatten. Hover nur bei feinem Pointer: Rahmen in `--lav`, 2 px Anhebung.
- Buttons: primär in `--violet` mit weisser Schrift, Radius 12 px, Höhe 48 px; sekundär als Outline in `--lav`. Fokus-Ring 3 px in `--amber` mit 3 px Abstand, bei Tastaturbedienung immer sichtbar.
- Mobile first, sauber von 360 bis 1920 px, nie horizontales Scrollen.

### 4.5 Motion

- Lenis-Smooth-Scroll (lerp ca. 0.1), Ankerlinks mit Header-Offset, Lenis mit ScrollTrigger synchronisiert.
- `prefers-reduced-motion`: Lenis aus, keine Autoplay- oder Scroll-Scrub-Animationen, alle Inhalte sofort sichtbar und vollständig.
- Tokens: 150 / 250 / 400 / 800 ms; Easing `cubic-bezier(.2,.7,.2,1)` bzw. GSAP `power3.out`.
- Nur diese bewusst gesetzten Momente, sonst keine Animationen:
  1. Hero: Headline zeilenweise hinter einer Maske einblenden (Stagger 80 ms); der Klick-Simulator spielt einmal automatisch ab.
  2. «Drehbuch»: scroll-gesteuerte Kette (ScrollTrigger mit scrub).
  3. Zahlen zählen einmal hoch, sobald sie sichtbar werden.
  4. Phishing-Ticker als Endlosband, pausiert bei Hover und Fokus.
  5. «Haltung»: Wörter werden beim Scrollen von 25 % auf 100 % Deckkraft hell (SplitText).
  6. Die Paket-Treppe wächst einmal.
  7. Chat-Mockup: Nachrichten erscheinen nacheinander mit Tipp-Indikator.
- Kein generisches Fade-up auf jeder Sektion, kein Custom Cursor, kein Parallax auf Text.

### 4.6 Inspiration eezyinn.de und Übersetzung

eezyinn.de ist eine Branding- und Marketing-Agentur. Übernimm Rhythmus und Muster, nicht Inhalte:
- dunkles, ruhiges Layout, sehr grosse fette Headlines, kurze pointierte Texte, kleine Kicker über den Überschriften
- Hero mit zwei Fragen als Headline und einem interaktiven Widget (dort: «Ziehen zum Drehen», mit Ortsname und Uhrzeit sowie den Schritten «1. Sichtbarkeit · vor dem Klick» und «2. Conversion · nach dem Klick»)
- Problem-Split «Zwei Probleme. Gleiches Ergebnis.» mit zwei Karten
- horizontaler Ablauf aus acht nummerierten Schritten, geteilt in «vor dem Klick» und «nach dem Klick»
- zwei nummerierte Lösungskarten (01, 02) mit je einem Button
- Projekte als hervorgehobener Case mit Tag «Neu», darunter eine nummerierte Liste
- endlos laufende Logo-Reihen (zwei Reihen)
- «Unsere Haltung» mit drei Aussagen, die mit «Nicht jedes …» beginnen
- Prozess in vier nummerierten Schritten
- «Der erste Schritt»: Mini-Check mit drei Antwortkarten («Vor dem Klick», «Nach dem Klick», «Keine Ahnung») und Button
- Kontakt, mehrspaltiger Footer, Skip-Link, mobiles Vollbild-Menü

Die Übersetzung für PSYber steht Sektion für Sektion in Abschnitt 5. Ein bewusster Unterschied: PSYber braucht keinen Cookie-Banner, weil keine Cookies gesetzt werden. Das sagen wir im Footer.

### 4.7 Sprache und Texte

- Schweizer Hochdeutsch, Sie-Form. Kein «ß», immer «ss». Anführungszeichen «…», innen ‹…›. Tausendertrennzeichen ’ (64’733), Dezimalkomma (15,9 %), Beträge «CHF 190.–», Gedankenstrich «–» mit Leerzeichen.
- Kurz, aktiv, konkret, freundlich. Nerdiger Humor ja (Layer 8, Hex, Terminal), Angstmacherei nie, Opfer beschämen nie.
- Neutrale Formulierungen (Familien, Eltern, Fachperson), keine Gendersternchen.
- Fiktive Beispiel-Domains (paket-zustellung-ch.info, karten-sicherheit-ch.com, gutschein-sofort.ch) nie als klickbare Links ausgeben. Nimm in `docs/TODO.md` den Prüfpunkt auf, vor dem Launch zu kontrollieren, dass diese Domains keiner echten Firma gehören (sonst ersetzen).
- Alle Texte aus diesem Auftrag wörtlich verwenden. Fehlt ein Text, im gleichen Ton ergänzen und in `docs/DECISIONS.md` vermerken.
- Keine erfundenen Zahlen, Kundenstimmen, Logos, Zertifikate oder Auszeichnungen. Zahlen nur aus 5.17, immer mit Quellenlink.

---

## 5. psyber.tech: der One-Pager

### 5.0 Phasen-Schalter

`PUBLIC_SITE_PHASE` = `survey` (Standard) oder `launch`.
- `survey`: Keine Preise anzeigen, weil sie die Preisfragen der Umfrage beeinflussen würden. Primärer CTA überall «Zur Umfrage» → `https://forms.psyber.tech/?quelle=website`. Bei den Paketen statt Preisen: «Preise folgen nach der Pilotphase. Founding Families erhalten einen Vorzugspreis.» mit Button «Founding Family werden» (→ Umfrage).
- `launch`: Preise sichtbar, primärer CTA «Session anfragen» → `#kontakt`.
- Preise, Kontaktdaten und Links liegen zentral in `apps/web/src/config/site.ts`.

### 5.1 Header

Sticky, anfangs transparent, nach 40 px Scroll `--aubergine` mit 80 % Deckkraft und Backdrop-Blur. Links Psi-Icon und Wortmarke. Navigation: Angebot (`#angebot`), Maschen (`#maschen`), Ablauf (`#ablauf`), Über (`#ueber`), Kontakt (`#kontakt`). Rechts der CTA-Button gemäss Phase. Mobile: Button «Menü» öffnet ein Vollbild-Overlay mit allen Links, E-Mail und Telefon (`[TODO]`); Fokus bleibt im Menü, Esc schliesst, Beschriftung wechselt auf «Schliessen». Skip-Link «Zum Inhalt springen».

### 5.2 Hero

- Kicker: `// Cyber-Prävention für Familien in Zürich`
- H1, zwei Zeilen: «Ein Klick zu viel?» / «Ein Anruf zu glaubwürdig?»
- Unterzeile: «Betrüger hacken keine Router, sondern Menschen. PSYber zeigt Ihrer Familie, wie Manipulation funktioniert, und sichert Ihr Heimnetz gleich mit ab.»
- Buttons: primär gemäss Phase; sekundär «So funktioniert’s» (`#ablauf`).
- Hintergrund: Psi-Netz gross und dezent (15–25 % Deckkraft), rechts angeschnitten.

Widget «Klick-Simulator» (das Herzstück; Desktop rechts neben dem Text, Mobile darunter):
- Smartphone-Rahmen aus CSS/SVG, kein Foto. Die Statusleiste zeigt «Zürich» und die echte Uhrzeit (`Intl.DateTimeFormat('de-CH', { timeZone: 'Europe/Zurich', hour: '2-digit', minute: '2-digit' })`, jede Minute aktualisiert; ohne JS «--:--»).
- Eine SMS erscheint (fiktiv, keine echte Marke): «Ihr Paket konnte nicht zugestellt werden. Zollgebühr CHF 2.40 bis heute 23:59 bezahlen: paket-zustellung-ch.info/z/8812»
- Darunter eine Zeitleiste zum Ziehen, Label «Ziehen zum Abspielen», mit zwei Stationen: «1. Psychologie · vor dem Klick» und «2. Technik · nach dem Klick».
- Station 1: Drei amberfarbene Markierungen erscheinen an der SMS: «Zeitdruck» (bei «bis heute 23:59»), «Fremde Adresse» (bei der Domain), «Kleiner Betrag» (bei CHF 2.40, mit Kurztext «Kleine Beträge senken die Vorsicht.»). Fazit-Chip: «3 Warnsignale erkannt. Nicht klicken.»
- Station 2: Ein Finger tippt trotzdem. Der Browser zeigt «Diese Seite ist nicht erreichbar». Annotation: «Blockiert vom DNS-Filter: Die Adresse ist als Betrug bekannt, Ihr Browser erreicht sie gar nicht erst.» Kleine Zeile darunter: «Und wenn eine Betrugsseite noch neu ist: Ein Passwort-Manager füllt auf falschen Adressen nichts aus, und ein Zwei-Faktor-Login erschwert den Zugriff.»
- Technik: Zeitleiste als `<input type="range">` (0–100) mit `aria-valuetext` je Station, dazu zwei Buttons «Schritt 1» und «Schritt 2». Autoplay einmal beim Laden (nur ohne reduced motion), danach steuert die Person. Mit reduced motion statisch; die Buttons wechseln ohne Animation.

### 5.3 0x01 Problem-Split

- Kicker: `// Wo Familien angreifbar sind`
- H2: «Zwei Einfallstore. Derselbe Schaden.»
- Karte A, Titel «Sie werden manipuliert.»: «Ein Anruf der ‹Polizei›, eine Deepfake-Werbung, eine Online-Liebe, die plötzlich Geld braucht. Solche Angriffe zielen auf Gefühle, nicht auf Technik.» Tags: Online-Anlagebetrug, Phishing, Romance Scam, Cybermobbing, OpSec.
- Karte B, Titel «Ihr Netz steht offen.»: «Standard-Passwort am Router, Kindergeräte ohne Schutz, kein Backup, und niemand weiss, welche Geräte eigentlich im WLAN hängen. Lücken, die im Alltag niemand bemerkt.» Tags: Heimnetz, Netzwerkverkehr, Kinderschutz, Passwörter, Backup.
- Darunter ein Zahlenband mit drei Werten (Zählanimation, Quelle klein in Mono als Link):
  - «15,9 %»: «der Befragten wurden innert 12 Monaten Opfer von Betrug. 2022 waren es 8,4 %.» (Crime Survey 2025, ZHAW und Universität St. Gallen)
  - «4,8×»: «so viele Meldungen zu Werbung für Online-Anlagebetrug wie ein Jahr zuvor (1. Halbjahr 2025).» (BACS)
  - «26 %»: «der Meldungen ans BACS betrafen 2025 Anrufe im Namen falscher Behörden.» (BACS-Jahresrückblick 2025)

### 5.4 0x02 Drehbuch

- Kicker: `// Anatomie eines Betrugs`
- H2: «Jeder Betrug folgt demselben Drehbuch.»
- Text: «Acht Schritte, von der ersten Nachricht bis zum Schweigen danach. PSYber setzt an drei Stellen an.»
- Kette (nummeriert, echte Abfolge) mit Kurztext pro Schritt (aufklappbar bzw. Tooltip, auch per Tastatur):
  - 01 Kontakt: «Eine Nachricht, ein Anruf, eine Anzeige. Unerwartet.»
  - 02 Vertrauen: «Bekanntes Logo, bekannte Stimme, perfekte Sprache.»
  - 03 Gefühl: «Angst, Liebe, Gier oder Mitleid übernehmen.»
  - 04 Zeitdruck: «‹Nur heute›, ‹sofort›, ‹sonst wird gesperrt›.»
  - 05 Klick: «Ein Link, eine App, ein Fernzugriff.»
  - 06 Zahlung oder Daten: «Geld, Codes oder Passwörter wechseln den Besitzer.»
  - 07 Schaden: «Konto leer, Profil gekapert, Fotos weg.»
  - 08 Scham: «Viele schweigen. Genau davon leben Betrüger.»
- Gruppen über der Kette: «Psychologie · vor dem Klick» (01–04), «Technik · nach dem Klick» (05–06), «Hilfe · nach dem Schaden» (07–08).
- Eingriffe, die beim Scrollen einrasten: «Erkennen» bei 01–04 (Sessions, Vorträge, «Ist das echt?»-Check); «Abfangen» bei 05–06 (DNS-Filter, Passwort-Manager, Zwei-Faktor-Login); «Auffangen» bei 07–08 (Notfallkarte, Hilfe beim Melden, keine Vorwürfe).
- Desktop horizontal, Mobile vertikal. Eine Linie zeichnet sich mit dem Scrollen durch die Kette (ScrollTrigger mit scrub; Pinning nur auf Desktop). Reduced motion: statisches Diagramm.

### 5.5 0x03 Lösungen (`id="angebot"`)

- Kicker: `// Was wir tun`
- H2: «Wir setzen dort an, wo Familien verwundbar sind.»
- Karte 01 «Layer 8: Menschen stärken»: «Wir erklären die Tricks hinter Phishing, Anlagebetrug, Romance Scam und Cybermobbing, zeigen, welche Spuren Ihre Familie online hinterlässt, und üben das Erkennen an echten Beispielen.» Punkte: Familien-Session zu Hause; Vorträge für Schulen, Gemeinden und Firmen; «Ist das echt?»-Check per WhatsApp. Button «So läuft eine Session ab» (`#ablauf`).
- Karte 02 «Heimnetz: Technik absichern»: «Wir richten Router, Gästenetz und DNS-Filter ein, schützen die Geräte der Kinder, sorgen für Passwort-Manager und Backup und zeigen Ihnen, welche Geräte im Netz sind und was blockiert wird.» Punkte: Router und Gästenetz; DNS-Filter und Überblick über den Netzwerkverkehr; Kinderprofile direkt auf den Geräten; Passwort-Manager und Backup. Button «Pakete ansehen» (`#pakete`).

### 5.6 0x04 Maschen (`id="maschen"`)

- Kicker: `// Fallakten`
- H2: «Maschen, die gerade kursieren.»
- Umsetzung als Astro Content Collection `src/content/maschen/*.md`, damit neue Fallakten ohne Code dazukommen. Felder: `titel`, `zitat` (typischer Satz der Betrüger), `hebel` (Liste), `warnsignal`, `hilft`, `quelle` (Name und URL), `datum`, `featured`.
- Darstellung: ein hervorgehobener Eintrag mit Tag «Neu» und einem kleinen generischen Mockup (z. B. eine Social-Media-Anzeige mit unscharfem Avatar und Scan-Linie; keine echten Personen oder Marken), darunter eine nummerierte Liste. Jede Zeile zeigt Titel, Zitat und Hebel-Tags und klappt auf zu «Warnsignal» und «Was hilft».
- Start-Einträge:

| Titel | Zitat | Hebel | Warnsignal | Was hilft | Quelle |
|---|---|---|---|---|---|
| Deepfake-Werbung für Anlagen (featured) | «Mit 250 Franken zum passiven Einkommen. Empfohlen von einer bekannten Person.» | Gewinn, Autorität | Bekannte Gesichter werben plötzlich für Krypto oder Trading-Plattformen. | Nie über Werbeanzeigen investieren. Anbieter vorher auf der Warnliste der FINMA prüfen. | BACS, Halbjahresbericht 2025/I |
| Die falsche Polizei am Telefon | «Hier ist die Polizei. Ihr Konto wird von Kriminellen missbraucht.» | Autorität, Angst | Die echte Polizei verlangt am Telefon nie Geld, Codes oder Fernzugriff. | Auflegen und die offizielle Nummer selbst wählen. | BACS-Jahresrückblick 2025 |
| Phishing per SMS | «Ihr Paket wartet. Zollgebühr bis heute bezahlen.» | Zeitdruck | Ein Link mit fremder Adresse und ein kleiner Betrag. | Link nicht antippen. Die Sendung direkt in der App oder auf der Website des Versanddienstes prüfen. | Polizeiliche Kriminalstatistik 2025 |
| Romance Scam | «Ich habe noch nie so jemanden wie dich getroffen. Kannst du mir kurz aushelfen?» | Zuneigung, Mitleid | Jemand, den Sie nie getroffen haben, bittet um Geld. | Kein Geld an Online-Bekanntschaften. Mit einer Vertrauensperson sprechen. | Kantonspolizei Zürich |
| Cybermobbing | «Alle in der Klasse haben das Video schon gesehen.» | Gruppendruck, Scham | Ihr Kind zieht sich zurück und meidet Handy oder Schule. | Beweise sichern, nicht zurückschreiben, Vertrauensperson und Schule einbeziehen. Für Kinder und Jugendliche: Beratung von Pro Juventute unter 147. | Crime Survey 2025 |

### 5.7 Phishing-Ticker (ohne Nummer, als Band)

- H2 (klein): «Sätze, bei denen Sie stutzig werden sollten.»
- Zwei gegenläufige Reihen aus Pillen, jede mit Satz und kleinem Hebel-Tag: «Ihr Paket wartet» (Zeitdruck), «Hallo Mama, das ist meine neue Nummer» (Zuneigung), «Ihr Konto wird gesperrt» (Angst), «Sie haben gewonnen!» (Gewinn), «Hier spricht die Polizei» (Autorität), «Nur heute gültig» (Zeitdruck), «Alle aus der Klasse sind schon dabei» (Gruppendruck), «Bitte sag es niemandem» (Scham), «Garantiert 20 % Rendite» (Gewinn), «Ich brauche kurz deinen Code» (Vertrauen), «Ihr Computer ist infiziert, rufen Sie uns an» (Angst), «Ich vermisse dich, kannst du mir helfen?» (Zuneigung).
- Technik: CSS-Animation über `transform`, die Kopie für den Loop mit `aria-hidden="true"`, pausiert bei Hover und Fokus. Reduced motion: statisch und umbrechend.

### 5.8 0x05 Haltung

- Kicker: `// Unsere Haltung`
- Drei grosse Aussagen im Display-Schnitt mit Wort-für-Wort-Reveal, jeweils mit Erklärsatz:
  1. «Nicht jeder, der klickt, ist naiv.» – «Betrug zielt auf Gefühle, nicht auf Intelligenz. Darum gibt es bei uns keine Vorwürfe.»
  2. «Nicht jede Sicherheit braucht Überwachung.» – «Wir erklären, statt heimlich mitzulesen. Überwacht wird nur, was alle Beteiligten erlaubt haben.»
  3. «Nicht jedes Problem löst eine App.» – «Manchmal braucht es eine Person, die man fragen kann. Genau die sind wir.»

### 5.9 0x06 «Ist das echt?»-Check

- Kicker: `// Ein zweites Bauchgefühl`
- H2: «Unsicher? Fragen Sie, bevor Sie klicken.»
- Text: «Im Abo schicken Sie uns verdächtige Nachrichten einfach per WhatsApp. Sie bekommen eine klare Einschätzung mit Ampel und dem nächsten Schritt. Betrüger setzen auf Zeitdruck. Wir setzen eine Pause dazwischen.»
- Chat-Mockup in eigenem, neutralem Design in Markenfarben (kein WhatsApp-Look, keine fremden Logos):
  - Familie: «Ist das echt? 😬» mit Bild-Platzhalter «Screenshot: ‹Ihre Karte wurde gesperrt. Jetzt entsperren: karten-sicherheit-ch.com›»
  - PSYber (nach Tipp-Indikator): «🔴 Rot: Betrug. Nicht klicken und nicht antworten. Ihre Bank verschickt keine solchen Links. Nachricht löschen und Absender blockieren.»
  - Familie: «Danke!! 🙏»
- Ampel-Legende daneben, je mit Icon und Text: Grün «Echt. Alles gut.» Gelb «Unklar. Nicht reagieren, über den offiziellen Kanal nachfragen.» Rot «Betrug. Nicht reagieren; bei Schaden sofort die Bank anrufen und beim BACS melden.»

### 5.10 0x07 Ablauf (`id="ablauf"`)

- Kicker: `// So arbeiten wir`
- H2: «Erst verstehen. Dann absichern.»
- Vier nummerierte Schritte:
  - 01 Kennenlernen: «Ein kurzes Gespräch: Wer gehört zur Familie, welche Geräte gibt es, was beschäftigt Sie?»
  - 02 Session zu Hause: «Wir erklären die Maschen am Beispiel Ihres Alltags. Ohne Fachchinesisch, mit Humor.»
  - 03 Absichern: «Router, Kindergeräte, Passwörter und Backup: Wir richten alles gemeinsam ein und dokumentieren es.»
  - 04 Dranbleiben: «Mit dem Abo bleiben wir erreichbar, prüfen verdächtige Nachrichten und melden uns bei neuen Maschen.»
- Kasten «Der PSYber-Handshake», angelehnt an TCP, als kleines Sequenzdiagramm zwischen «Familie» und «PSYber»:
  - SYN: «Sie melden sich. PSYber ruft nie unaufgefordert an.»
  - SYN-ACK: «Wir rufen auf Ihre hinterlegte Nummer zurück, mit Codewort.»
  - ACK: «Sie starten die Fernwartung im Programm, das wir beim Hausbesuch eingerichtet haben.»
  - FIN: «Sitzung beendet, kurzes Protokoll per Mail.»
  - Fusszeile: «Wer anruft und sofort Fernzugriff verlangt, ist nie PSYber.»

### 5.11 0x08 Pakete (`id="pakete"`)

- Kicker: `// Pakete`
- H2: «Vier Pakete, ein Upgrade-Pfad.»
- Text: «Jedes Paket baut auf dem vorherigen auf. Einmal-Pakete für den Einstieg, Abos für Schutz, der nicht mit dem Hausbesuch endet.»
- Visual: Treppe aus vier Stufen in violetter Abstufung (#ad9bf6, #8a6ee2, #6b40c9, #492293), wächst einmal beim Erscheinen. Auf jeder Stufe «PSYber» klein und der Paketname gross.
- Pakete (Preis nur bei `launch`):
  - PSYber Ping – «Mal schauen, ob Layer 8 antwortet.» – 90 Minuten Session bei Ihnen zu Hause, zugeschnitten auf Ihre Geräte und Fragen; Quick-Check: Router-Passwort, Updates, Zwei-Faktor-Login für E-Mail und Bank; Notfallkarte für den Kühlschrank. – Für Familien, die einen Einstieg suchen. – CHF 190–250, einmalig.
  - PSYber Patch – «Updates für Router und Köpfe.» – Alles aus Ping; Router absichern, Gästenetz für smarte Geräte, DNS-Filter; Kinderprofile direkt auf den Geräten, Passwort-Manager, Backup; Mappe mit allen Einstellungen. – Für Familien mit Kindern und vielen Geräten. – CHF 490–690, einmalig.
  - PSYber Shield – «Ein zweites Bauchgefühl, jederzeit erreichbar.» – «Ist das echt?»-Check per WhatsApp; Fernwartung nach dem PSYber-Handshake; jährlicher Check-up-Besuch; Infos zu neuen Maschen. – Für Familien, die eine feste Ansprechperson wollen. – CHF 29–39 pro Monat.
  - PSYber Sentinel – «Wir halten Wache, Sie schlafen ruhig.» – Alles aus Shield; Frühwarnsystem für Computer und Router; Haushalt der Grosseltern inklusive; Reaktion innert vereinbarter Zeit. – Für Mehrgenerationen-Familien. – Badge «In Vorbereitung»; CHF 79–99 pro Monat.
- Hinweis: «Shield und Sentinel starten mit einem Patch-Setup.»
- Ehrlichkeitszeile (klein): «Das Frühwarnsystem deckt Computer und Router ab. Handys schützen wir über Geräte-Einstellungen und den DNS-Filter.»
- Zwei Extras nebeneinander:
  - PSYber LAN-Party: «Eine Familie lädt zwei bis vier befreundete Familien oder die Grosseltern ein. Die Session findet im Wohnzimmer statt, die Kosten werden geteilt, das Setup gibt es beim Gastgeber.»
  - PSYber Talk: «Vorträge für Schulen, Elternvereine, Gemeinden und Firmen. Auch als Benefit für Mitarbeitende.»

### 5.12 0x09 Über (`id="ueber"`)

- Kicker: `// whoami`
- H2: «Wer hinter PSYber steckt.»
- Terminal-Karte: `$ whoami` → `[TODO: Name]`; `$ cat rolle.txt` → `[TODO: z. B. Cybersecurity-Spezialist]`; `$ cat warum.txt` → `[TODO: 2–3 Sätze Motivation]`.
- Foto-Platzhalter: Rahmen mit Psi-Icon und `[TODO: Foto]`, kein Stockfoto. Keine erfundenen Zertifikate oder Stationen.

### 5.13 0x0A FAQ

Akkordeon mit nativem `<details>`/`<summary>`, gestylt:
- «Für wen ist PSYber?» – «Für Familien im Raum Zürich: Eltern, Kinder ab Schulalter, Jugendliche und Grosseltern. Technisches Vorwissen braucht es nicht.»
- «Überwacht ihr unsere Kinder?» – «Nein. Kinderprofile und Bildschirmzeit richten wir gemeinsam mit Ihnen ein, ältere Kinder reden mit. Transparenz statt heimlicher Kontrolle.»
- «Was ist mit Handys?» – «Handys schützen wir über die Einstellungen der Geräte und den DNS-Filter. Das Frühwarnsystem deckt vor allem Computer und Router ab.»
- «Was passiert mit unseren Daten und Passwörtern?» – «Wir nehmen keine Passwörter mit. Alle Einstellungen dokumentieren wir für Sie. Fernwartung gibt es nur nach dem PSYber-Handshake.»
- «Ruft PSYber mich an?» – «Nie unaufgefordert. Wenn jemand in unserem Namen anruft und Fernzugriff verlangt, legen Sie auf.»
- «Was kostet das?» – bei `survey`: «Die Preise legen wir nach der Pilotphase fest. Founding Families erhalten einen Vorzugspreis. Machen Sie bei der Umfrage mit, dann reden Sie mit.» Bei `launch`: «Die Preise finden Sie bei den Paketen.»
- «Uns ist schon etwas passiert. Was jetzt?» – «Erstens: Bank oder Kartenherausgeber sofort anrufen und die Karte sperren. Zweitens: Passwörter ändern und den Zwei-Faktor-Login einschalten. Drittens: Anzeige bei der Kantonspolizei. Viertens: Meldung ans BACS. Und: Es ist keine Schande. Betrug trifft Menschen jeden Alters.» (BACS verlinkt auf das Meldeformular, siehe 5.17)

### 5.14 Der erste Schritt (zentriert, ohne Nummer)

- Kicker: `// Der erste Schritt`
- H2: «Wo fühlen Sie sich am unsichersten?»
- Drei Antwortkarten als Radio-Gruppe: «Vor dem Klick» – «Betrug erkennen»; «Nach dem Klick» – «Geräte und Heimnetz»; «Keine Ahnung» – «Genau dafür gibt es die Umfrage.»
- Button «Umfrage starten» → `https://forms.psyber.tech/?quelle=website&fokus=vor|nach|unklar` (gemäss Auswahl; ohne Auswahl ohne `fokus`). Sekundär «Direkt Kontakt aufnehmen» (`#kontakt`).
- Bei `launch`: Der Button heisst «Session anfragen» und führt zu `#kontakt`; die Auswahl wird als erste Zeile ins Nachrichtenfeld übernommen (z. B. «Schwerpunkt: vor dem Klick»).

### 5.15 0x0B Kontakt (`id="kontakt"`)

- H2: «Kontakt. Lassen Sie uns sprechen.»
- Links: E-Mail `[TODO]`, Telefon/WhatsApp `[TODO]`, Region «Stadt und Kanton Zürich».
- Formular: Name*, E-Mail*, Telefon (optional), PLZ und Ort*, Interesse* (Familien-Session, LAN-Party, Vortrag oder Talk, Firma oder Benefit, Anderes), Nachricht (optional, max. 2000 Zeichen), Checkbox* «Ich habe die Datenschutzerklärung gelesen.» (verlinkt), verstecktes Honeypot-Feld, Turnstile. POST an `{PUBLIC_API_BASE}/v1/contact`.
- Steht `?ref=surprise` in der URL: Feld `ref` mitsenden und «Familien-Session» vorauswählen.
- Erfolg: «Danke! Wir melden uns innert zwei Arbeitstagen per E-Mail oder auf der Nummer, die Sie angegeben haben.»
- Fehler: «Das hat nicht geklappt. Bitte versuchen Sie es nochmals oder schreiben Sie uns direkt an [TODO: E-Mail].» Eingaben bleiben erhalten.
- Inline-Validierung mit verständlichen Meldungen (`aria-describedby`), Fokus springt auf das erste fehlerhafte Feld.

### 5.16 Footer

- Spalten: Angebot (Lösungen, Pakete, Ablauf); PSYber (Maschen, Über, Umfrage, Checkliste, Kontakt); Rechtliches (Impressum, Datenschutz); Kontakt (`[TODO]`).
- Unterer Bereich in Mono, jede Aussage auf eigener Zeile: «Kein Cookie-Banner. Weil wir keine Cookies setzen.» / «0 Tracking-Pixel, 0 Deepfakes, genau ein Nerd.» / «Sicherheitslücke gefunden? /.well-known/security.txt» / «© 2026 PSYber»
- Easter Eggs (Phase 6): (a) gestylte Konsolen-Nachricht: «Du liest Quellcode? Layer 8 ist bei dir offensichtlich gepatcht. Sag hallo: [TODO: E-Mail]». (b) Der Konami-Code öffnet ein Terminal-Overlay mit den Befehlen `help`, `whoami`, `ping familie.local`, `sudo patch layer8`, `exit` und witzigen Ausgaben; Esc schliesst, voll per Tastatur bedienbar, reduced motion respektiert.

### 5.17 Quellen (nur diese verwenden; neue Links nur nach Prüfung)

- Crime Survey 2025 (ZHAW/HSG), 15,9 % vs. 8,4 %: https://www.zhaw.ch/de/ueber-uns/aktuell/news/detailansicht-news/event-news/crime-survey-2025-mehr-menschen-in-der-schweiz-erleben-straftaten
- BACS Halbjahresbericht 2025/I, Werbung für Online-Anlagebetrug 729 → 3’485 Meldungen: https://www.netzwoche.ch/news/2025-11-19/betrueger-missbrauchen-vermehrt-promis-als-lockvoegel
- BACS-Jahresrückblick 2025, 26 % Anrufe falscher Behörden: https://www.netzwoche.ch/news/2026-01-06/cybervorfaelle-nehmen-2025-nur-leicht-zu-aber-das-ist-kein-grund-zur-entwarnung
- Polizeiliche Kriminalstatistik 2025, 7’409 Phishing-Fälle (+25 %): https://www.tcs.ch/de/testberichte-ratgeber/ratgeber/sicherheit-internet/
- Kantonspolizei Zürich zu Romance Scam: https://www.zh.ch/de/news-uebersicht/mitteilungen/2022/sicherheit-justiz/kantonspolizei/220214-romance_scam.html
- Crime Survey 2025, Anstieg bei Cybermobbing: https://www.cash.ch/news/starker-anstieg-von-betrugsdelikten-in-der-schweiz-976819
- BACS-Meldeformular: https://www.report.ncsc.admin.ch/de/
- FINMA-Warnliste: https://www.finma.ch/de/finma-public/warnungen/warnliste/
- Schweizerische Kriminalprävention: https://www.skppsc.ch/de/themen/internet/
- Warnungen der Kantonspolizei Zürich: https://www.cybercrimepolice.ch

### 5.18 Weitere Seiten auf psyber.tech

`/checkliste`: «5 Warnsignale für Online-Betrug», druckbar (Button «Als PDF speichern» über `window.print()`, eigene Print-Styles dunkel auf weiss):
1. Unerwarteter Kontakt – «Gewinn, Paket, Behörde oder Bank melden sich von selbst. Echte Stellen fragen nie per SMS, Mail oder Anruf nach Passwörtern, Codes oder Kartendaten.»
2. Zeitdruck – «‹Nur heute›, ‹sofort›, ‹sonst wird Ihr Konto gesperrt›. Wer drängt, will verhindern, dass Sie nachdenken.»
3. Falsche Autorität – «Polizei, Bank, Vorgesetzte oder angeblicher Tech-Support. Auflegen und die offizielle Nummer selbst wählen.»
4. Starke Gefühle – «Liebe, Angst, Mitleid oder Gier. ‹Hallo Mama, das ist meine neue Nummer› oder die Online-Liebe, die plötzlich Geld braucht.»
5. Ungewöhnliche Zahlung oder Zugriff – «Krypto, Geschenkkarten, Bargeld-Abholung, Fernzugriff auf Ihr Gerät, Codes weitergeben oder Login über einen Link.»
- Kasten «Bei Verdacht»: «Pause machen. Selbst über den offiziellen Kanal nachfragen. Nichts weitergeben.»
- Kasten «Wenn es passiert ist»: Bank anrufen und Karte sperren; Passwörter ändern und Zwei-Faktor-Login einschalten; Anzeige bei der Kantonspolizei; Meldung ans BACS (Link); keine Scham, Betrug trifft Menschen jeden Alters.
- Nur wenn `?ref=umfrage` in der URL steht: P.S. «Haben Sie den zweiten Link am Ende der Umfrage bemerkt? Er war ein Test. Gut gemacht, wenn Sie nicht geklickt haben!» und einmal das Ereignis `checklist_click` an die API senden (siehe 8.1).

`/impressum` und `/datenschutz`: saubere Struktur mit `[TODO]`-Platzhaltern und dem Vermerk «Entwurf, rechtlich prüfen lassen». Datenschutzerklärung nach dem revidierten Schweizer Datenschutzgesetz (DSG): Verantwortlicher; welche Daten (Kontaktformular, anonyme Umfrage, freiwillige E-Mail für die Warteliste getrennt von den Antworten, anonyme Zähler ohne IP-Adressen); Zweck; Speicherort (Cloudflare, Datenbank in EU-Jurisdiktion); Turnstile als Spam-Schutz; Löschfristen; Rechte der Betroffenen; keine Cookies, kein Tracking.

404: «404 – Layer 8 nicht gefunden.» mit Terminal-Zeile `ping: Seite nicht gefunden` und Link zur Startseite.

Auf allen drei Websites: `/.well-known/security.txt` nach RFC 9116 (`Contact: mailto:security@psyber.tech`, `Expires` beim Build auf heute + 1 Jahr in ISO 8601 gesetzt, `Preferred-Languages: de, en`, `Canonical`) und `/humans.txt`. In DEPLOY.md vermerken, dass mindestens einmal pro Jahr neu gebaut werden muss.

SEO: Title und Description pro Seite, Canonical, Open Graph, statische OG-Bilder 1200×630 im Markenlook (per Build-Skript erzeugt, z. B. mit satori und resvg), Sitemap über `@astrojs/sitemap` (nur web), robots.txt, Favicon-Set aus dem Psi-Icon, `theme-color` #140a29, `lang="de-CH"`. Eine unverlinkte Styleguide-Seite `/styleguide` mit `noindex`.

---

## 6. forms.psyber.tech: der Umfrage-Funnel

Ziel ist eine möglichst hohe Abschlussquote: ruhig, schnell, auf dem Handy perfekt, gleiche Marke. Kein Menü, nur das Logo (Link auf psyber.tech) und der Fortschritt. Unten klein: Links zu Impressum und Datenschutz auf psyber.tech.

### 6.1 Startscreen

- Kicker: `// Rund 4 Minuten. Anonym. Mit Gratis-Checkliste.`
- H1: «Wie sicher ist Ihre Familie online?»
- Text: «Wir planen ein Angebot für Familien in Zürich und möchten wissen, was Sie wirklich brauchen. Die Umfrage dauert rund 4 Minuten und ist anonym. Am Ende gibt es die Checkliste ‹5 Warnsignale für Online-Betrug› gratis.»
- Datenschutz-Kurzinfo (klein): «Ihre Antworten werden anonym in einem Rechenzentrum in der EU gespeichert und nur zusammengefasst ausgewertet. Eine E-Mail-Adresse ist freiwillig und wird getrennt von den Antworten gespeichert.» mit Link «Datenschutzerklärung» (psyber.tech/datenschutz).
- Button «Los geht’s» mit Hinweis «Enter ↵». Psi-Netz als dezente Deko.

### 6.2 Bedienung

- Eine Frage pro Screen, Fortschrittsbalken und Anzeige «3 / 16» (Gesamtzahl berücksichtigt die Sprunglogik).
- Buttons «Zurück» und «Weiter» immer sichtbar. Bei optionalen Fragen ohne Antwort heisst der Button «Überspringen».
- Tastatur wie bei Typeform: Enter = weiter; Ziffern 1–5 bei Skalen; Buchstaben A, B, C … bei Optionen (Kürzel als kleines Badge auf jeder Option).
- Übergänge 250 ms (Slide und Fade), bei reduced motion sofort.
- Touch-Ziele mindestens 48 px; Skalen auf dem Handy als fünf grosse Kacheln; die Themen-Matrix (Frage 6) als Zeilen mit je fünf Kacheln.
- Fortschritt in `sessionStorage` speichern (nicht `localStorage`), jeden Zugriff in try/catch, nach dem Absenden löschen.
- Pflichtfragen (`required: true`) erst nach Antwort weiter, mit freundlichem Inline-Hinweis.
- Versteckte Felder aus der URL: `quelle` (erlaubt: instagram, tiktok, facebook, linkedin, whatsapp, flyer, vortrag, website, empfehlung; unbekannt → `andere`; fehlt → `direkt`) und `fokus` (vor, nach, unklar; sonst leer).
- Beim Klick auf «Los geht’s» einmal das Ereignis `survey_started` senden.

### 6.3 Fragen (verbindlich; in `packages/survey` als typisierte Daten abbilden)

```yaml
blocks:
  A: Screening
  B: Erfahrung
  C: Interesse
  D: Formate
  E: Abo und Monitoring
  F: Preise
  G: Was zählt
  H: Warteliste

questions:
  - id: q1
    block: A
    required: true
    type: single
    text: "Wo wohnen Sie?"
    options:
      stadt_zh: "Stadt Zürich"
      kanton_zh: "Kanton Zürich (ohne Stadt)"
      deutschschweiz: "Andere Deutschschweiz"
      romandie_tessin: "Romandie oder Tessin"
      ausland: "Ausland"

  - id: q2
    block: A
    required: true
    type: multi
    text: "Wer lebt in Ihrem Haushalt?"
    hint: "Mehrfachauswahl möglich"
    options:
      kinder_0_9: "Kinder bis 9"
      kinder_10_15: "Kinder 10–15"
      jugendliche_16_18: "Jugendliche 16–18"
      erwachsene: "Erwachsene"
      ab_65: "Personen ab 65"

  - id: q3
    block: A
    required: false
    type: single
    text: "Kümmern Sie sich auch um die digitale Sicherheit Ihrer Eltern oder Grosseltern?"
    options:
      regelmaessig: "Ja, regelmässig"
      ab_und_zu: "Ab und zu"
      nein: "Nein"

  - id: q4
    block: B
    required: true
    type: scale
    min: 1
    max: 5
    text: "Wie sicher fühlen Sie sich, Online-Betrug zu erkennen?"
    labels: { 1: "gar nicht", 5: "sehr sicher" }

  - id: q5
    block: B
    required: false
    type: single
    text: "Haben Sie oder jemand in Ihrer Familie schon Erfahrungen mit Online-Betrug, Phishing oder Cybermobbing gemacht?"
    options:
      ja_schaden: "Ja, mit Schaden"
      ja_erkannt: "Ja, aber rechtzeitig erkannt"
      nein: "Nein"
      keine_angabe: "Möchte ich nicht sagen"

  - id: q6
    block: C
    required: true        # jede Zeile muss beantwortet sein
    type: matrix_scale
    min: 1
    max: 5
    text: "Wie interessant sind diese Themen für Ihre Familie?"
    labels: { 1: "gar nicht", 5: "sehr" }
    rows:
      phishing: "Phishing und Fake-SMS"
      anlagebetrug: "Online-Anlagebetrug"
      romance: "Romance Scam"
      cybermobbing: "Cybermobbing"
      heimnetz: "Sicheres Heimnetz und Kinderschutz"
      privatsphaere: "Privatsphäre auf Social Media"

  - id: q7
    block: D
    required: true
    type: multi
    text: "Welche Formate würden Sie nutzen?"
    hint: "Mehrfachauswahl möglich"
    options:
      vortrag: "Vortrag an der Schule oder in der Gemeinde"
      webinar: "Online-Webinar"
      session_zuhause: "Session bei uns zu Hause"
      lan_party: "Session mit befreundeten Familien bei jemandem zu Hause"
      videos: "Kurze Videos auf Social Media"

  - id: q8
    block: E
    required: false
    type: scale
    min: 1
    max: 5
    text: "Wie nützlich fänden Sie einen «Ist das echt?»-Check per WhatsApp?"
    hint: "Sie schicken eine verdächtige Nachricht und bekommen eine Einschätzung."
    labels: { 1: "gar nicht", 5: "sehr" }

  - id: q9
    block: E
    required: false
    type: scale
    min: 1
    max: 5
    text: "Wie wohl wäre Ihnen, wenn eine Fachperson Ihre Computer auf Angriffe überwacht?"
    labels: { 1: "gar nicht wohl", 5: "sehr wohl" }

  - id: q10
    block: F
    required: false
    type: single
    text: "Session bei Ihnen zu Hause, 90 Minuten, mit Quick-Check und Notfallkarte. Was wäre Ihnen das wert?"
    options:
      bis_99: "bis CHF 99"
      chf_100_149: "CHF 100–149"
      chf_150_199: "CHF 150–199"
      chf_200_249: "CHF 200–249"
      chf_250_299: "CHF 250–299"
      ab_300: "ab CHF 300"
      nicht_buchen: "Würde ich nicht buchen"

  - id: q11
    block: F
    required: false
    type: van_westendorp
    text: "Session plus komplettes Setup von Router, Kindergeräten, Passwort-Manager und Backup, rund 4 Stunden. Bitte je einen Betrag in CHF eintragen."
    fields:
      a: "Ab welchem Preis wäre es so günstig, dass Sie an der Qualität zweifeln?"
      b: "Ab welchem Preis wäre es ein gutes Angebot?"
      c: "Ab welchem Preis wird es teuer, Sie würden aber noch darüber nachdenken?"
      d: "Ab welchem Preis wäre es zu teuer?"
    rules: >
      Ganze Zahlen von 0 bis 20000. Entweder alle vier leer (Button «Überspringen»)
      oder alle vier ausgefüllt. Es muss gelten a ≤ b ≤ c ≤ d, sonst Hinweis
      «Die Beträge sollten von oben nach unten steigen.»
      Eingabefelder mit inputmode="numeric" und Präfix «CHF».

  - id: q12
    block: F
    required: false
    type: single
    text: "Abo mit «Ist das echt?»-Check per WhatsApp, Fernwartung und jährlichem Check-up. Was wäre Ihnen das pro Monat wert?"
    options:
      bis_14: "bis CHF 14"
      chf_15_24: "CHF 15–24"
      chf_25_34: "CHF 25–34"
      chf_35_44: "CHF 35–44"
      ab_45: "ab CHF 45"
      nicht_buchen: "Würde ich nicht buchen"

  - id: q13
    block: F
    required: false
    type: single
    skip_if: "q12 == nicht_buchen"
    text: "Das gleiche Abo, zusätzlich mit Frühwarnsystem für Computer und Router, Haushalt der Grosseltern inklusive. Was wäre Ihnen das pro Monat wert?"
    options:
      bis_49: "bis CHF 49"
      chf_50_69: "CHF 50–69"
      chf_70_89: "CHF 70–89"
      chf_90_109: "CHF 90–109"
      ab_110: "ab CHF 110"
      nicht_buchen: "Würde ich nicht buchen"

  - id: q14
    block: G
    required: false
    type: multi
    max: 2
    text: "Was ist Ihnen bei so einem Angebot am wichtigsten?"
    hint: "Höchstens zwei Antworten"
    options:
      vertrauen: "Vertrauen und Seriosität"
      preis: "Preis"
      erklaerungen: "Verständliche Erklärungen"
      datenschutz: "Datenschutz"
      erreichbarkeit: "Schnelle Erreichbarkeit"

  - id: q15
    block: G
    required: false
    type: text
    max_length: 1000
    text: "Was ist Ihre grösste Sorge im digitalen Familienalltag?"
    placeholder: "Zum Beispiel: Ich weiss nicht, mit wem mein Kind online chattet."

  - id: q16
    block: H
    required: false
    type: waitlist
    text: "Möchten Sie informiert werden, wenn PSYber startet?"
    fields:
      email: "E-Mail (freiwillig)"
      founding_family: "Ich interessiere mich für einen vergünstigten Platz als Founding Family."
    note: "Ihre E-Mail-Adresse wird getrennt von Ihren Antworten gespeichert und nur für diese Information verwendet."
    rules: "Die Founding-Family-Checkbox ist nur aktiv, wenn eine gültige E-Mail eingetragen ist."
```

### 6.4 Absenden

POST an `{PUBLIC_API_BASE}/v1/survey` mit Antworten, versteckten Feldern, Turnstile-Token (unsichtbarer Modus, kurz vor dem Absenden ausgeführt) und Honeypot. Ladezustand am Button. Bei Fehler: «Ihre Antworten konnten nicht gesendet werden. Bitte versuchen Sie es nochmals.» mit Button «Erneut senden»; die Antworten bleiben erhalten.

### 6.5 Danke-Screen

- H2: «Danke! Sie haben uns sehr geholfen.»
- Abschnitt «Ihre Schwerpunkte»: bis zu drei Themen aus Frage 6 mit Wert 4 oder 5 (höchster Wert zuerst), je mit Tipp. Gibt es keines, entfällt der Abschnitt.
  - phishing: «Links in SMS nie direkt antippen. Lange drücken, Adresse prüfen, im Zweifel die App oder Website selbst öffnen.»
  - anlagebetrug: «Nie über Werbeanzeigen investieren. Anbieter vorher auf der Warnliste der FINMA prüfen.»
  - romance: «Wer Sie nie getroffen hat und um Geld bittet, ist ein Warnsignal. Immer.»
  - cybermobbing: «Beweise sichern, nicht zurückschreiben, Vertrauensperson einbeziehen. Für Kinder und Jugendliche: Pro Juventute, Telefon 147.»
  - heimnetz: «Router-Standardpasswort ändern, Updates automatisch installieren, ein Gästenetz für smarte Geräte einrichten.»
  - privatsphaere: «Profile auf privat stellen, Standortfreigaben prüfen, Ferienfotos erst nach den Ferien posten.»
- Abschnitt «Ihre Downloads» mit zwei gleich gewichteten Links untereinander. Das ist der Phishing-Test; beide müssen glaubwürdig wirken, es gibt keinen Hinweis auf den Test:
  1. «Checkliste ‹5 Warnsignale› herunterladen» → `https://psyber.tech/checkliste?ref=umfrage`
  2. «🎉 Glückwunsch, Sie wurden ausgewählt! Gratis-Session im Wert von CHF 250 – nur heute einlösbar» → `https://surprise.psyber.tech/gewinn?ref=umfrage&s={Antwort auf Frage 4, Wert 1–5}`
- Teilen: «Kennen Sie jemanden, den das interessiert?» Button «Link teilen» (Web Share API, Fallback: Link kopieren) mit `https://forms.psyber.tech/?quelle=empfehlung`.

### 6.6 Regeln für den Phishing-Test (nicht verhandelbar)

- Der Test-Link nutzt ausschliesslich die eigene Marke und Domain, keine fremden Marken.
- Die Zielseite fragt nichts ab: keine Formulare, keine Eingabefelder, keine Cookies.
- Klicks werden nur als anonyme Gesamtzahl gezählt (aufgeteilt nach Selbsteinschätzung 1–5), nie pro Person.
- Die Auflösung ist freundlich und beschämt niemanden.

---

## 7. surprise.psyber.tech: «Erwischt!»

Routen: `/gewinn` ist die Hauptseite, `/` leitet auf `/gewinn` weiter. Alles mit `noindex` (Meta-Tag und `X-Robots-Tag`-Header), robots.txt mit `Disallow: /`. Referrer-Policy `no-referrer`.

### 7.1 Ablauf

1. Teaser, höchstens 1.2 s, per Klick oder Taste überspringbar: Geschenk-Icon, «Ihr Gutschein wird vorbereitet …», Fortschrittsbalken. Keine Eingabefelder.
2. Glitch-Übergang (ca. 400 ms, RGB-Versatz und Scanlines) zur Auflösung. Bei reduced motion oder ohne JS sofort die Auflösung.
3. Beim Laden mit `?ref=umfrage`: einmal das Ereignis `bait_click` mit `s` (1–5, sonst leer) an die API senden.

### 7.2 Inhalt (wörtlich)

- H1 «Erwischt!» (sehr gross, CASL 1), Unterzeile «Zum Glück nur von uns.»
- «Keine Sorge, es ist nichts passiert. Dieser Link war ein Test. Ein echter Betrüger hätte Sie jetzt auf eine gefälschte Login- oder Zahlungsseite geführt.»
- «Diesen Link haben Sie angeklickt:» darunter eine Box in Mono mit `https://surprise.psyber.tech/gewinn`; der Teil «psyber.tech» wird einmal amberfarben markiert (Marker wischt ein).
- H2 «Diese drei Signale hätten Sie warnen können»
  1. Geschenk-Icon, «Ein Gewinn aus dem Nichts» – «Sie haben an keinem Wettbewerb teilgenommen.»
  2. Uhr-Icon, «Zeitdruck: ‹nur heute›» – «Wer drängt, will verhindern, dass Sie nachdenken.»
  3. Link-Icon, «Die Adresse nicht geprüft» – «Diesmal war sie echt. Betrüger tarnen ihre Adressen aber geschickt.»
- Interaktives Element «Adressen lesen» mit Umschalter «Echt» / «Fälschung»:
  - Echt: `https://surprise.psyber.tech/gewinn`, «psyber.tech» grün markiert mit Haken und Text «Echte Website: psyber.tech».
  - Fälschung: `https://psyber.tech.gutschein-sofort.ch/gewinn`, «gutschein-sofort.ch» rot markiert mit Kreuz und Text «Echte Website: gutschein-sofort.ch. Eine fremde Seite, auch wenn ‹psyber.tech› in der Adresse vorkommt.»
  - Regel: «Lesen Sie die Adresse bis zum ersten einzelnen ‹/›. Entscheidend ist, was direkt davor steht, zum Beispiel ‹psyber.tech›.»
  - Tipp in Mono: «Auf dem Handy einen Link lange gedrückt halten. Dann sehen Sie die Adresse, bevor Sie klicken.»
- «Das passiert den meisten Menschen. Genau diese Hebel funktionieren bei uns allen, deshalb setzen Betrüger sie ein.»
- Angebotskarte auf `--paper`: H2 «Das war erst der Anfang.» – «Buchen Sie eine PSYber-Session, damit Ihre ganze Familie solche Links in Zukunft durchschaut. Wir kommen zu Ihnen nach Hause, erklären die Tricks hinter den Maschen und sichern gleich Ihr Heimnetz ab.» Button «Session anfragen» → `https://psyber.tech/?ref=surprise#kontakt`. Darunter: «Fürs Mitmachen gibt es trotzdem einen Gewinn: 10 % Rabatt mit diesem Code.» und ein Button «LAYER8» mit Zusatz «kopieren» (Clipboard API mit Fallback, Rückmeldung «Kopiert» über `aria-live`).
- Footer: «Diese Seite setzt keine Cookies und fragt nichts ab.» und Links auf Impressum und Datenschutz (psyber.tech).

---

## 8. api.psyber.tech: Cloudflare Worker

### 8.1 Endpunkte (Hono, JSON, Zod, Fehler als `{ "error": "<code>" }`)

- `POST /v1/survey`: Turnstile und Honeypot prüfen, Antworten mit dem Schema aus `packages/survey` validieren (inklusive Sprunglogik und Van-Westendorp-Regel), in `survey_responses` speichern. Ist eine E-Mail angegeben, diese separat in `waitlist` speichern, ohne Verbindung zur Antwort (keine gemeinsame ID, kein Fremdschlüssel). Zähler `survey_completed` erhöhen (mit `s` = Antwort auf Frage 4).
- `POST /v1/event`: `{ "event": "survey_started" | "bait_click" | "checklist_click", "s"?: 1–5 }` → Zähler erhöhen (UPSERT). Ohne Turnstile, aber mit Rate Limit.
- `POST /v1/contact`: Turnstile, Honeypot, Zod; in `contact_requests` speichern und eine Benachrichtigung über das `send_email`-Binding an eine verifizierte Adresse schicken (Variable `NOTIFY_TO`).
- `GET /v1/health`.

### 8.2 Datenschutz by Design

- Keine IP-Adressen, User-Agents oder Fingerprints speichern. Die IP wird nur flüchtig fürs Rate Limiting verwendet.
- In `survey_responses` und `waitlist` nur das Datum (YYYY-MM-DD) speichern, keine Uhrzeit. So lassen sich E-Mails nicht über den Zeitpunkt den Antworten zuordnen.
- Keine Request-Bodies loggen.
- Cron, täglich: `contact_requests` löschen, die älter als 180 Tage sind.

### 8.3 Datenbank (D1, Migrationen in `apps/api/migrations`)

- Die Datenbank wird mit `wrangler d1 create psyber --jurisdiction=eu` angelegt (das gehört in DEPLOY.md; die Jurisdiktion lässt sich später nicht mehr ändern). In `wrangler.jsonc` Platzhalter für `database_id`.
- `survey_responses`: `id` (UUID), `created_day`, `schema_version`, `quelle`, `fokus`; Einfach- und Skalenantworten als eigene Spalten (q1, q3, q4, q5, q8, q9, q10, q12, q13); Mehrfachantworten und die Matrix als JSON (q2, q6, q7, q14); Frage 11 als vier INTEGER-Spalten (`q11_a` bis `q11_d`); q15 als TEXT.
- `waitlist`: `id`, `created_day`, `email`, `founding_family` (0/1).
- `contact_requests`: `id`, `created_at`, `name`, `email`, `phone`, `plz_ort`, `interesse`, `nachricht`, `ref`.
- `counters`: `event`, `s_bucket` (0 = keine Angabe, 1–5), `day`, `count`; Primärschlüssel (`event`, `s_bucket`, `day`).

### 8.4 Sicherheit

- CORS nur für https://psyber.tech, https://forms.psyber.tech und https://surprise.psyber.tech (plus localhost-Ports im Dev-Modus).
- Rate Limits: `/v1/survey` und `/v1/contact` höchstens 5 pro Minute und IP, `/v1/event` höchstens 30.
- Payload höchstens 32 KB, strikte Zod-Schemas (unbekannte Felder ablehnen), nur Prepared Statements.
- Secrets nur über `wrangler secret put` (`TURNSTILE_SECRET`).

### 8.5 Auswertung (Phase 6)

`scripts/analyze.ts` liest einen D1-Export (JSON) und erzeugt `reports/umfrage-YYYY-MM-DD.html` mit:
- Antworten nach Quelle und Fokus; Verteilung von Frage 4
- Anteil 4 oder 5 je Thema (Frage 6); Formate (Frage 7); Anteil 4 oder 5 bei Frage 8 und 9
- Median-Spanne und Anteil «Würde ich nicht buchen» bei Frage 10, 12 und 13
- Van-Westendorp-Kurven für Frage 11 mit Schnittpunkten: akzeptierter Preisbereich (Schnitt «zu günstig» mit «teuer» bis Schnitt «günstig» mit «zu teuer») und optimaler Preis (Schnitt «zu günstig» mit «zu teuer»)
- häufigste Antworten bei Frage 14
- Klickrate auf den Test-Link gesamt und je Selbsteinschätzung (`bait_click` / `survey_completed` pro `s`), Checklisten-Klicks
- Go/No-Go-Ampel: mindestens 150 Antworten, davon mindestens 60 % aus dem Kanton Zürich (q1 = stadt_zh oder kanton_zh); mindestens 30 % geben bei mindestens einem Thema eine 4 oder 5; der akzeptierte Preisbereich für das Setup-Paket reicht bis mindestens CHF 490; mindestens 20 Einträge auf der Warteliste, davon mindestens 5 Founding Families.

Den Export-Befehl dokumentierst du in `docs/DEPLOY.md`.

---

## 9. Sicherheit, Performance, Barrierefreiheit (Definition of Done)

- Strikte Content-Security-Policy ohne `unsafe-inline` für Scripts: Astros `security.csp` (stabil seit Version 6, Hashes) für Scripts und Styles; zusätzlich eine Header-CSP in `_headers` für Direktiven, die per Meta nicht gehen (`frame-ancestors 'none'`), dazu `base-uri 'none'`, `object-src 'none'`, passendes `form-action`, `connect-src 'self' https://api.psyber.tech`; Turnstile (`challenges.cloudflare.com`) nur auf Seiten mit Formular erlauben.
- Header auf allen drei Websites: `Strict-Transport-Security: max-age=31536000; includeSubDomains` (Preload erst nach stabilem Betrieb, in DEPLOY.md beschreiben), `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin` (surprise: `no-referrer`), `Permissions-Policy` (alles aus, was nicht gebraucht wird), `Cross-Origin-Opener-Policy: same-origin`. Gehashte Assets ein Jahr `immutable`, HTML kurz cachen.
- Ziel Mozilla HTTP Observatory A+. Falls etwas nicht erreichbar ist, Begründung in DEPLOY.md.
- Lighthouse mobil mindestens 95 in allen Kategorien auf allen drei Websites; CLS unter 0.05; LCP unter 2 s.
- JS-Budget (gzip, initial, ohne das Turnstile-Script): web höchstens 120 KB, forms höchstens 60 KB, surprise höchstens 25 KB.
- WCAG 2.2 AA: Kontraste gemäss Tokens, sichtbarer Fokus, alles per Tastatur bedienbar, Landmarks, saubere Überschriften-Hierarchie, Labels und Fehlermeldungen an den Feldern, Alt-Texte, reduced motion überall, laufende Bewegung pausierbar.
- Keine Requests an Dritte ausser Turnstile auf Formularseiten. Keine Cookies.
- Tests:
  - Vitest für `packages/survey`: Pflichtfelder, Sprunglogik bei Frage 13, Van-Westendorp-Regel, höchstens zwei Antworten bei Frage 14, Whitelist für `quelle`, Auswahl der Schwerpunkte.
  - Vitest für die API: Validierung, CORS, Trennung von `waitlist` und Antworten, Datumsfelder ohne Uhrzeit, Rate-Limit-Antworten.
  - Playwright-Smoke: Umfrage komplett durchklicken (API gemockt) bis zum Danke-Screen mit beiden Links; surprise: Code kopieren und Umschalter «Adressen lesen»; web: mobiles Menü, Klick-Simulator per Tastatur, Validierung im Kontaktformular.
- CI mit GitHub Actions: Install mit gefrorenem Lockfile, lint, typecheck (`astro check`, `tsc`), test, build aller Apps.

---

## 10. Deployment-Doku (`docs/DEPLOY.md`, Schritt für Schritt, auch für Cloudflare-Neulinge)

1. Cloudflare-Konto anlegen, psyber.tech als Zone hinzufügen, Nameserver beim Registrar umstellen, DNSSEC aktivieren.
2. D1 mit EU-Jurisdiktion anlegen (siehe 8.3) und die Migrationen anwenden.
3. Turnstile-Widget für psyber.tech und forms.psyber.tech anlegen; Site Key als `PUBLIC_TURNSTILE_SITE_KEY`, Secret per `wrangler secret put TURNSTILE_SECRET`.
4. Email Routing aktivieren (z. B. hallo@psyber.tech und security@psyber.tech), Zieladresse verifizieren, `NOTIFY_TO` setzen.
5. Vier Workers per Workers Builds mit dem GitHub-Repo verbinden (Root-Verzeichnis je App, Build- und Deploy-Befehl). Custom Domains: psyber.tech (plus Weiterleitung von www), forms.psyber.tech, surprise.psyber.tech, api.psyber.tech.
6. Umgebungsvariablen pro Worker setzen, `PUBLIC_SITE_PHASE=survey`.
7. Domain-Härtung: CAA-Eintrag, SPF, DKIM und DMARC passend zu Email Routing (DMARC mindestens `p=quarantine`), HSTS-Preload nach stabilem Betrieb.
8. Checks nach dem Go-Live: Observatory, Lighthouse, security.txt, alle Formulare end-to-end, Zähler.
9. Datenexport aus D1 und `pnpm analyze`.
10. Umschalten auf `launch`: Preise in `site.ts` setzen, Variable ändern, neu deployen.

---

## 11. Phasen

- Phase 0, Fundament: Monorepo, Tooling, CI, Dependabot, `CLAUDE.md`, `docs/BRIEF.md` (dieser Auftrag), Docs-Gerüst. `packages/ui` mit Tokens, Schrift (alle Achsen), Psi-Icon, Psi-Netz-Komponente, Wortmarke, Buttons, Karten, Motion-Helfern (Lenis und GSAP mit reduced motion). Styleguide-Seite `/styleguide` in apps/web.
- Phase 1, psyber.tech: alle Sektionen aus Abschnitt 5 mit Inhalten, Phasen-Schalter, Klick-Simulator, Drehbuch, Ticker, Maschen-Collection, Kontaktformular (vorerst gegen einen API-Mock), `/checkliste`, `/impressum`, `/datenschutz`, 404, security.txt, SEO, OG-Bilder.
- Phase 2, API: Worker, Schema, Migrationen, Endpunkte, Tests, lokale Entwicklung mit `wrangler dev` und lokaler D1.
- Phase 3, forms.psyber.tech: kompletter Funnel inklusive Danke-Screen und Phishing-Test-Links, angebunden an die API.
- Phase 4, surprise.psyber.tech: Teaser, Glitch, Auflösung, «Adressen lesen», Zähler.
- Phase 5, Härtung: CSP und Header, Barrierefreiheit, Performance-Budgets, Lighthouse- und Observatory-Prüfung soweit lokal möglich, Playwright-Smoke, DEPLOY.md fertig.
- Phase 6, Extras: `scripts/analyze.ts`, Easter Eggs (Konsole, Konami-Terminal), Feinschliff an den Animationen.
- Abschluss: `docs/PROGRESS.md` mit dem Stand je Phase; `docs/TODO.md` mit allem, was ich noch liefern muss (Name, Bio, Foto, Kontaktdaten, Angaben fürs Impressum, finale Preise, rechtliche Prüfung); eine PR-Beschreibung mit Übersicht der Screenshots und offenen Punkte.

---

## 12. Nicht tun

- Kein WordPress oder anderes CMS, keine Page-Builder, kein jQuery, kein Bootstrap.
- Kein Tracking (Google Analytics, Tag Manager, Meta Pixel o. ä.), keine Cookies, keine externen Fonts oder CDNs (Ausnahme: Turnstile auf Formularseiten).
- Keine erfundenen Inhalte: keine Kundenstimmen, Kundenlogos, Zahlen, Zertifikate, Auszeichnungen oder Lebensläufe.
- Keine echten Marken in Betrugsbeispielen (keine Namen oder Logos von Post, Banken, Swisscom o. ä. in gefälschten Nachrichten).
- Keine Eingabefelder auf surprise.psyber.tech.
- Keine Texte, Bilder oder Code von eezyinn.de.
- Keine Preise anzeigen, solange `PUBLIC_SITE_PHASE=survey`.
- Nichts deployen, keine Secrets committen.

Starte jetzt mit Phase 0.
