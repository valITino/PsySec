# PSYber Designsystem

Grundhaltung: sauber, modern, elegant, minimalistisch und trotzdem aussagekräftig. Technisch und nerdig mit Humor, nie kindisch, nie Angst machend. Aubergine statt Schwarz. Animationen gezielt und ruhig.

Der Code dazu liegt in `packages/ui`. Live ansehen: `pnpm dev:web`, dann `/styleguide`.

## 1. Farben

Quelle: `packages/ui/src/styles/tokens.css`. In Tailwind stehen sie als Utilities bereit (`bg-night`, `text-lav`, `border-line` usw.); die Standardpalette von Tailwind ist entfernt.

| Token           | Hex     | Verwendung                        | Kontrast                               |
| --------------- | ------- | --------------------------------- | -------------------------------------- |
| `--night`       | #140a29 | Seitenhintergrund                 |                                        |
| `--aubergine`   | #261547 | Karten, erhöhte Flächen, Header   |                                        |
| `--deep`        | #1b0d35 | Terminal, Code, tiefe Panels      |                                        |
| `--line`        | #3d2b68 | Linien und Rahmen (nie Text)      | 1,58:1 auf night (nur Dekor)           |
| `--lav`         | #ad9bf6 | Akzent, Sekundärtext auf dunkel   | 7,96:1 night · 6,87:1 aubergine        |
| `--soft`        | #e7e1fb | Fliesstext auf dunkel             | 14,98:1 night · 12,93:1 aubergine      |
| `--white`       | #ffffff | Überschriften auf dunkel          | 19:1 night                             |
| `--violet`      | #6b40c9 | Primärbuttons, Akzent auf hell    | Weiss darauf 6,56:1 · auf paper 6,01:1 |
| `--violet-dark` | #492293 | Hover und Active                  | Weiss darauf 10,86:1                   |
| `--amber`       | #f9ad26 | Warnsignale, Highlights (sparsam) | 9,98:1 night · ink darauf 8,96:1       |
| `--paper`       | #f5f4fd | helle Fläche, max. zwei pro Seite |                                        |
| `--ink`         | #22172f | Text auf hell                     | 15,62:1 paper                          |
| `--muted`       | #675e76 | Sekundärtext auf hell             | 5,59:1 paper                           |

Statusfarben, nie ohne Icon und Text: gut `--ok` #0ca30c, Warnung `--warn` #fab219, kritisch `--crit` #d03b3b. Auf dunklem Grund erreichen sie nur für Icons und grosse Schrift genug Kontrast (3:1), darum steht der Text daneben immer in `--soft` oder `--white`.

Zusätzlich abgeleitet (kein neuer Markenton):

- `--border-strong` #7c68c0: Rahmen von Eingabefeldern und Checkboxen, weil Bedienelemente 3:1 zum Hintergrund brauchen (`--line` allein hat 1,58:1).
- Paket-Treppe: `--step-1` #ad9bf6, `--step-2` #8a6ee2, `--step-3` #6b40c9, `--step-4` #492293. Schrift auf Stufe 1 und 2 in `--night` (7,96:1 und 4,89:1), auf Stufe 3 und 4 in Weiss.

### Flächen

Komponenten nutzen semantische Rollen (`--bg`, `--fg`, `--fg-strong`, `--fg-muted`, `--accent`, `--border`, `--surface`, `--surface-deep`). Standard ist dunkel. Die Klasse `.on-paper` schaltet eine Sektion auf hell um, `.on-dark` innerhalb davon wieder zurück. So passen sich Buttons, Karten, Tags und Kicker ohne Sonderfälle an.

Erlaubt ist ein einziger dezenter violetter Radial-Glow hinter dem Hero-Widget. Keine Regenbogenverläufe, kein Glassmorphism ausser dem leichten Blur des Headers.

## 2. Typografie

Recursive (Variable Font, OFL), selbst gehostet aus `@fontsource-variable/recursive`, Variante mit allen fünf Achsen. Vorgeladen wird nur das Latin-Subset. Die Achsen MONO, CASL und CRSV steuern wir über die vererbbaren Custom Properties `--mono`, `--casl`, `--crsv`; Gewicht und Neigung über `font-weight` und `font-style`.

| Rolle             | Klasse         | Einstellung                                                    |
| ----------------- | -------------- | -------------------------------------------------------------- |
| Display H1        | `.display .h1` | wght 900, CASL 1, letter-spacing −0.02em, line-height 0.98     |
| H2                | `.display .h2` | wght 850, CASL 0.8, line-height 1.02                           |
| H3                | `.h3`          | wght 800, CASL 0.6, line-height 1.12                           |
| Lead              | `.lead`        | `--fs-lead`, line-height 1.5                                   |
| Fliesstext        | (Standard)     | wght 400, CASL 0, 17 px (ab 768 px: 18 px), line-height 1.55   |
| Zeilenlänge       | `.measure`     | 34em, das sind rund 68 Zeichen                                 |
| Code und Meta     | `.mono`        | MONO 1, 13–14 px                                               |
| Kicker            | `.kicker`      | MONO 1, 14 px, Farbe `--accent`, als Code-Kommentar: `// Text` |
| Abschnittsnummer  | `.hexnum`      | MONO 1, tabular-nums, in Hex: `0x01`                           |
| Grosse Einzelzahl | `.num`         | wght 900, CASL 1, proportionale Ziffern                        |

- Keine gesperrten Versalien. Stattdessen Hex-Nummern und Kicker als Code-Kommentar.
- `68ch` wäre in Recursive zu breit (die Null ist 0.6em breit, der Durchschnittsbuchstabe 0.5em), darum `34em`.
- Der H1 im Hero nutzt eine eigene, auf die zweispaltige Bühne abgestimmte Grösse (siehe `docs/DECISIONS.md`).
- Fallback: `Recursive Fallback` (Arial bzw. Arial Bold mit `size-adjust` und angepassten Metriken), damit beim Schriftwechsel nichts springt. Recursive ist über alle Gewichte gleich breit; das hilft zusätzlich.

## 3. Logo und Bildwelt

- Wortmarke «PSYber»: Recursive wght 900, CASL 1, letter-spacing −0.02em (`Wordmark.astro`, Klasse `.wordmark`). Immer exakt diese Schreibweise.
- Psi-Icon (`PsiIcon.astro`): ein Psi aus einer Linie, `viewBox="0 0 12 14"`, Strich 1.4, runde Enden. Auch Basis des Favicon-Sets (`pnpm assets`).
- Key Visual «Psi-Netz» (`PsiNet.astro`, Daten in `lib/psi-net-data.ts`): Schale aus 11 Punkten, Stiel mit 7 Knoten, 2 Nebenknoten, 12 dünne Querverbindungen (45 % Deckkraft), drei amberfarbene Enden und drei Signalbögen. Animiert pulsieren die Knoten versetzt, die Bögen senden nacheinander (Loop 3 s); bei feinem Pointer neigt sich das Netz um bis zu 5°. Ausserhalb des Viewports ruht die Animation.
  - Farben per CSS-Variablen: `--psi-line`, `--psi-node`, `--psi-bg` (Rand der Knoten = Hintergrund der Fläche).
- Textur `.net-texture`: feines, kachelbares Netz aus Punkten und Linien in Weiss mit 7 % Deckkraft. Nur in Hero und Footer. Erzeugt von `packages/ui/scripts/gen-texture.mjs` (fester Seed).
- Icons: Lucide, 1.5 px Strich bei 20 px (`Icon.astro`). Die Auswahl steht in `packages/ui/scripts/gen-icons.mjs`; nur gelistete Icons landen im Bundle.
- Keine Stockfotos, keine KI-Bilder von Menschen. Emojis nur in Beispiel-Chats und im Test-Link der Umfrage.

## 4. Layout

- Container `.wrap`: höchstens 1200 px, seitlicher Abstand `--gutter` (20–40 px).
- Raster `.grid-12`: 12 Spalten, Spaltenabstand 16–24 px.
- Sektionen `.section`: vertikal `--section-y`, 72 px (Mobile) bis 160 px (Desktop).
- Inhalte links ausgerichtet; zentriert ist nur der Abschluss-CTA «Der erste Schritt».
- Höchstens zwei helle Sektionen pro Seite (`.on-paper`), für Rhythmus.
- Mobile first, geprüft von 360 bis 1920 px, nie horizontales Scrollen.

## 5. Bausteine

| Baustein    | Klasse / Komponente                  | Regeln                                                                                                  |
| ----------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------- |
| Button      | `.btn .btn-primary` / `Button.astro` | Violett, weisse Schrift, 48 px hoch, Radius 12 px. Hover: violet-dark.                                  |
| Button sek. | `.btn .btn-secondary`                | Outline in Lavendel (auf hell: Violett).                                                                |
| Textlink    | `.btn-text`, `.link`                 | Unterstrichen in Akzentfarbe, Pfeil rückt beim Hover 3 px.                                              |
| Karte       | `.card` / `Card.astro`               | Radius 16 px, 1 px Rahmen, kein Schatten. `.card-hover`: Rahmen lav, 2 px hoch, nur bei feinem Pointer. |
| Tag         | `.tag` / `Tag.astro`                 | Pille in Mono. `.tag-amber` für Hebel und Warnsignale, `.tag-solid` für «Neu».                          |
| Eingabefeld | `.field`, `.label`, `.input`         | 48 px hoch, Rahmen `--border-strong`. Fehler: roter Rahmen plus Icon plus Text.                         |
| Checkbox    | `.checkbox`                          | 22 px, Haken per `clip-path`.                                                                           |
| Fokus       | global                               | 3 px Amber mit 3 px Abstand. Auf hell zusätzlich dunkle Kontur (3:1).                                   |
| Skip-Link   | `.skip-link`                         | «Zum Inhalt springen», erscheint beim ersten Tab.                                                       |

## 6. Motion

Tokens: 150 / 250 / 400 / 800 ms (`--dur-1` bis `--dur-4`), Easing `cubic-bezier(.2,.7,.2,1)` (`--ease`), in GSAP `power3.out`.

Smooth Scroll: Lenis mit lerp 0.1, über den GSAP-Ticker getaktet und mit ScrollTrigger synchronisiert (`@psyber/ui/motion/smooth`). Ankerlinks berücksichtigen die Höhe des Headers.

Nur diese sieben Momente bewegen sich:

1. Hero: Headline zeilenweise hinter einer Maske (Stagger 80 ms, reines CSS); der Klick-Simulator spielt einmal ab.
2. «Drehbuch»: scroll-gesteuerte Kette (ScrollTrigger mit scrub, Pinning nur auf Desktop).
3. Zahlen zählen einmal hoch (`countUp`).
4. Phishing-Ticker als Endlosband, pausiert bei Hover, Fokus und über einen Pause-Button.
5. «Haltung»: Wörter werden beim Scrollen von 25 % auf 100 % Deckkraft hell (SplitText).
6. Die Paket-Treppe wächst einmal.
7. Chat-Mockup: Nachrichten erscheinen nacheinander mit Tipp-Indikator.

Dazu kommt das Psi-Netz (Abschnitt 3). Kein generisches Fade-up, kein Custom Cursor, kein Parallax auf Text.

surprise.psyber.tech hat eine eigene, im Auftrag (7.1 und 7.2) vorgegebene Abfolge, sonst bewegt sich dort nichts: Teaser mit Fortschrittsbalken (höchstens 1.2 s, überspringbar), Glitch (400 ms: Streifenversatz, Farbkanäle in `--crit` und `--violet`, Scanlines) und der Amber-Marker, der einmal über «psyber.tech» wischt. Die Zeiten stehen als `--sp-*` in `apps/surprise/src/styles/global.css`.

### Reduzierte Bewegung und Pausieren

- `prefers-reduced-motion: reduce`: Lenis startet nicht, keine Autoplay- und Scrub-Animationen, alle Inhalte sind sofort sichtbar und vollständig. Eine globale CSS-Regel setzt zusätzlich alle Animationen und Übergänge auf sofort.
- Laufende Bewegung ist pausierbar (WCAG 2.2.2): Der Ticker hat einen eigenen Pause-Button, im Footer gibt es den Schalter «Bewegung pausieren» für alle Dauerschleifen (`html[data-motion='off']`).
- Helfer: `prefersReducedMotion()`, `motionAllowed()`, `setMotionPaused()` in `@psyber/ui/motion`.

## 7. Technische Regeln fürs Markup

- Keine Inline-`style`-Attribute und keine Inline-Skripte: Die CSP erlaubt Styles und Skripte nur per Hash bzw. von der eigenen Herkunft. Zustände über Klassen und `data-`-Attribute, Werte zur Laufzeit über die CSSOM-API (`element.style.x = …`).
- Keine `data:`-URIs (Vite: `assetsInlineLimit: 0`).
- Dekorative Elemente (Hex-Nummern, `//`, Icons ohne Aussage) bekommen `aria-hidden="true"`.
- Fiktive Adressen als `<span class="fake-link">`, nie als `<a>`.
- Interne Links immer über `href()` aus der Site-Konfiguration der App.
