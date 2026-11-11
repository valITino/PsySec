# PSYber Designsystem

Stand: Redesign November 2026. Stil, Formatierung und Schrift orientieren sich auf Wunsch eng an eezyinn.de: fast schwarze Flächen, violette Bogen, riesige Überschriften in Versalien, Pillen, viel Raum. Alles ist selbst gebaut; von der Referenz stammen keine Texte, Bilder, Logos und kein Code. Die eigene Handschrift von PSYber: die Eule aus dem Logo-Kit, Hex-Nummern, Code-Kommentare, Terminal und ein trockener Ton.

Quelle der Wahrheit sind die Tokens in `packages/ui/src/styles/tokens.css`. Die Seite `/styleguide` auf psyber.tech zeigt alle Bausteine.

## 1. Farben

| Token        | Hex     | Verwendung                                           | Kontrast           |
| ------------ | ------- | ---------------------------------------------------- | ------------------ |
| `--void`     | #08080b | Seitenhintergrund                                    |                    |
| `--carbon`   | #111115 | Karten, Bühnen                                       |                    |
| `--graphite` | #1a1a20 | erhöhte Fläche in Karten                             |                    |
| `--pit`      | #0c0c10 | Terminal, Eingabefelder                              |                    |
| `--hairline` | #27272f | Linien auf Schwarz (nie für Text)                    |                    |
| `--steel`    | #6d6d79 | Rahmen von Bedienelementen                           | 3,9:1 auf void     |
| `--ash`      | #9c9ca6 | Sekundärtext auf Schwarz                             | 7,3:1 auf void     |
| `--bone`     | #f4f4ef | Text und Überschriften                               | 18,1:1 auf void    |
| `--space`    | #3d1e86 | violette Bogen                                       | bone darauf 11,0:1 |
| `--nebula`   | #b678f7 | Lichtschein (nie für Text auf Space)                 |                    |
| `--haze`     | #cfc8e2 | Sekundärtext auf Space                               | 7,5:1 auf space    |
| `--acid`     | #c9fb52 | Aktion: Buttons, Fokus-Ring, Lichtpunkte, «gepatcht» | 16,6:1 auf void    |
| `--ink`      | #08080b | Text auf Acid und Amber                              | 16,6:1 auf acid    |
| `--amber`    | #f9ad26 | Warnsignale (Hebel, Marker); die Augenfarbe der Eule | 10,5:1 auf void    |
| `--white`    | #ffffff | nur Text auf Kritisch-Rot                            | 4,8:1 auf crit     |

Statusfarben nur zusammen mit Icon und Text: gut #0ca30c, Warnung #fab219, kritisch #d03b3b.

Die Akzentfarbe hängt an drei Werten (`--acid-rgb`, `--acid`, `--acid-hi`). Wer sie tauscht, ändert Buttons, Fokus-Ring, Lichtpunkte und den Globus auf einen Schlag.

### Flächen

- Standard ist Schwarz. `.on-space` setzt die Rollen für violette Flächen (Sekundärtext in `--haze`).
- Karten (`.card`) sind immer dunkel, auch auf Space; sie setzen die Rollen selbst zurück.
- `.sheet`: Sektion als Bogen mit runden oberen Ecken, der sich über die vorherige schiebt. `.sheet-space` gibt dem violetten Bogen einen Lichtschein oben rechts.
- `.stage`: grosse Bühne mit Radius bis 44 px und violettem Schein in der Ecke (Simulator, «Ist das echt?», Kontakt, Footer).
- Helle Sektionen gibt es nicht mehr.

## 2. Typografie

Manrope (Variable Font, 200–800) für Überschriften und Text, wie bei der Referenz. Geist Mono nur für Code. Beide SIL Open Font License, selbst gehostet; die zwei Latin-Dateien (zusammen 48 KB) werden vorgeladen.

| Stil             | Grösse                                       | Schnitt                                    |
| ---------------- | -------------------------------------------- | ------------------------------------------ |
| Display / H1     | `clamp(2.375rem, 0.6rem + 5.8vw, 6.25rem)`   | 650, Versalien, −0.045em, Zeilenhöhe 0.92  |
| H2               | `clamp(1.9375rem, 0.9rem + 3.6vw, 4.5rem)`   | 650, Versalien, −0.035em, 0.98             |
| H3               | `clamp(1.375rem, 1.05rem + 1.1vw, 2.125rem)` | 650, Versalien, −0.035em                   |
| Titel (`.title`) | 18–21 px                                     | 600, normale Schreibweise                  |
| Lead             | 19–26 px                                     | 400, Zeilenhöhe 1.36                       |
| Fliesstext       | 16–18 px                                     | 400, Zeilenhöhe 1.55, höchstens 68 Zeichen |
| Label / Kicker   | 13 px                                        | 600, Versalien, gesperrt 0.08em            |
| Button           | 13 px (klein 12 px)                          | 700, Versalien, gesperrt 0.06em            |

- Kicker stehen als Code-Kommentar über der Überschrift: `0x01 // Wo Familien angreifbar sind`. Hex-Nummer und Schrägstriche in Mono, die Nummer in Acid.
- Mono nur für Code: Hex-Nummern, «//», Terminal, Adressen, Zahlenreihen und die Zeilen unten im Footer.
- «PSYber» bleibt auch in Versal-Überschriften exakt so geschrieben (`.brand`; `SectionHead` setzt das selbst).
- Fallback-Schrift mit angepassten Metriken in drei Stufen (Text, Titel, Versalien), damit beim Schriftwechsel nichts springt.

## 3. Logo und Bildwelt

Aus dem Logo-Kit (Runde 5), abgelegt in `packages/ui/src/brand/`:

- **Logo** (`logo-dark.svg`, für Druck `logo-light.svg`): die Eule mit Lupe und die Wortmarke, verbunden durch die Leiterbahn. Komponente `Logo.astro`. In der Kapsel des Headers bleibt nur die Eule sichtbar.
- **Eule** (`Owl.astro`) in vier Mimiken: wach, skeptisch (Menü, «Über»), erwischt (surprise), genervt (404).
- **Wortmarke** allein (`wordmark.svg`, aus dem Logo abgeleitet): gross im Footer, dahinter ein blinkender Cursor.
- **Sticker**: «Betrüger hassen diesen Blick.» («Über»), «Netter Versuch.» (klebt sich auf den Klick-Simulator, sobald der DNS-Filter blockiert), «Du hast geklickt.» (surprise).
- **Favicon und App-Icons** erzeugt `pnpm assets` aus dem Kit, ebenso die OG-Bilder (Eule, Wortmarke, Leiterbahnen).
- Slogan: «Betrüger hassen diesen Blick.» Zweiter Claim: «Wir patchen Layer 8.»

Nicht verwendet werden die Dateien des Kits mit dem früheren Claim (Logo mit Claim, Patch-Sticker, Key Visual).

Weitere Bildelemente: der Globus «Layer 8» im Hero (Canvas, Dekoration), Punktraster (`.dot-grid`), Leuchtpunkte (`.dot`). Keine Stockfotos, keine KI-Bilder von Menschen. Icons: Lucide, 1.5 px Strich. Emojis nur in Beispiel-Chats und im Test-Link der Umfrage.

## 4. Layout

- Container höchstens 1440 px, Seitenrand 20–52 px, Sektionen 72–152 px vertikal.
- Inhalte links ausgerichtet; zentriert nur «Haltung» und die Aussage auf surprise.
- Radien: Karten 22 px, Panels 30 px, Bühnen bis 44 px, Bogen bis 40 px, Eingabefelder 14 px, Buttons und Tags als Pille.
- Mobile first, sauber von 320 bis 1920 px, nie horizontales Scrollen.

## 5. Bausteine

- **Buttons** (`.btn`): Pille, 52 px hoch (klein 44 px). Primär in Acid mit dunkler Schrift und leichtem Schein; sekundär als Glas-Outline mit kurzer Lichtkante oben. `.btn-text` als Textlink mit Pfeil. `.orb`: runder Pfeil-Knopf in Listen.
- **Karten** (`.card`): 1 px Rahmen, kein Schlagschatten, dezenter Verlauf. Hover nur bei feinem Pointer.
- **Tags** (`.tag`): Pille in Versalien; `tag-amber` für Hebel und Warnungen, `tag-solid` (Acid) für «Neu».
- **Formularfelder**: 52 px hoch, Radius 14 px, Rahmen 3:1; Fehler mit Icon und Text.
- **Header**: oben volle Leiste (Logo, Navigation, CTA), nach dem Scrollen eine schwebende Kapsel (Eule, CTA, Menü-Knopf). Das Vollbild-Menü gibt es auf allen Breiten.
- **Schwebende Bedienelemente** (`Chrome.astro`): Fortschritt (Balken auf Mobile, Schiene mit Marken ab 1280 px), Cookie-Knopf (erklärt, warum es keinen Banner gibt), Schalter «Bewegung pausieren». Auf Mobile stehen die Knöpfe als Zeile am Seitenende.
- **Fokus-Ring**: 3 px Acid mit 3 px Abstand, bei Tastaturbedienung immer sichtbar.

## 6. Motion

Tokens: 150 / 250 / 400 / 800 ms; Easing `cubic-bezier(.2,.7,.2,1)` bzw. GSAP `power3.out`. Lenis für sanftes Scrollen (lerp 0.1), synchron zu ScrollTrigger.

Bewegte Momente auf psyber.tech:

1. Hero: Headline fährt zeilenweise hinter einer Maske ein. Der Globus dreht langsam und lässt sich ziehen; beim Scrollen durch den Hero werden seine Knoten «gepatcht» (auf grossen Bildschirmen bleibt der Hero dafür kurz stehen).
2. Header: Wechsel zwischen Leiste und Kapsel.
3. Klick-Simulator: spielt einmal ab; in Schritt 2 klebt sich der Sticker auf.
4. Überschriften der Sektionen fahren einmal zeilenweise ein.
5. «Drehbuch»: scroll-gesteuerte Kette mit Pinning am Desktop.
6. Zahlen zählen einmal hoch.
7. Phishing-Ticker als Endlosband (pausiert bei Hover, Fokus und Button).
8. «Haltung»: Wörter werden beim Scrollen hell.
9. Paket-Treppe wächst einmal; Chat-Nachrichten erscheinen nacheinander.
10. Footer: Cursor hinter der Wortmarke blinkt.

Kein Custom Cursor, kein Parallax auf Text.

### Reduzierte Bewegung und Pausieren

Bei `prefers-reduced-motion` steht alles sofort im Endzustand: kein Lenis, kein Pinning, kein Autoplay, der Globus steht still (lässt sich aber drehen), der Ticker bricht um. Übergänge sind dann ganz aus (0 s, nicht 0.01 ms): Auch ein winziger Übergang hält für ein Bild die alten Werte fest und verschiebt kurz das Layout. Der Schalter «Bewegung pausieren» hält Dauerbewegung an (`html[data-motion='off']`).

## 7. Technische Regeln fürs Markup

- Keine Inline-`style`-Attribute und keine Inline-Skripte (strikte CSP mit Hashes); Werte zur Laufzeit per `element.style…` setzen.
- Interne Links über den `href()`-Helfer der jeweiligen App.
- Klassennamen in Scoped Styles nie so nennen wie einen Baustein aus `components.css` (`pnpm test` prüft das).
- Bilder aus dem Kit als `<img>` mit `width`, `height` und `alt` (leer, wenn Dekoration).
- Startseite: Sektionen weit unter dem ersten Bildschirm tragen `data-lazy`; der Browser rechnet sie erst bei Bedarf (`content-visibility`). `home.ts` holt sie nach der ersten Interaktion nach und vor jedem Sprung zu einer Marke sofort. Frisch ausgelegt gelten sie zwei Bilder lang als `data-laid="new"` (darin kein Übergang), danach als `data-laid=""`.
- Startseite: Ändert sich die Länge der Seite, während jemand schon weiter unten steht (Anpinnen im Drehbuch), bleibt der Abschnitt in der Bildmitte stehen (`keepInView` in `scroll.ts`). Die Leseposition für Neuladen und «Zurück» merkt `position.ts` im Verlaufseintrag (`history.state`), nie in Cookies oder Web-Speicher.
