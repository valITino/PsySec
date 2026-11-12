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

Statusfarben nur zusammen mit Icon und Text: gut #0ca30c, Warnung #fab219, kritisch #d03b3b. Die Kugeln (Globus im Hero, Deko der Umfrage) nutzen drei eigene Abstufungen von der Mitte zum Rand: `--orb-core`, `--orb-mid`, `--orb-edge`.

Durchscheinende Flächen, Glows und Verläufe nutzen die Kanal-Tokens (`--void-rgb`, `--carbon-rgb`, `--bone-rgb`, `--space-rgb`, `--nebula-rgb`, `--acid-rgb`), zum Beispiel `rgb(var(--bone-rgb) / 0.4)`. Ausgeschriebene `rgb(…)`- oder Hex-Werte gehören nicht ins CSS; die Farb-Tokens leiten sich selbst aus den Kanälen ab.

Die Akzentfarbe hängt an drei Werten (`--acid-rgb`, `--acid`, `--acid-hi`). Wer sie tauscht, ändert Buttons, Fokus-Ring, Lichtpunkte und den Globus auf einen Schlag. Entschieden ist Lime (Entscheidung 122): Amber bleibt den Warnsignalen vorbehalten.

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

Aus dem Logo-Kit (Runde 6 «Der Blick»), abgelegt in `packages/ui/src/brand/`:

- **Logo** (`logo-dark.svg`, für Druck `logo-light.svg`): die Eule mit Lupe und die Wortmarke, verbunden durch die Leiterbahn. Komponente `Logo.astro`. In der Kapsel des Headers bleibt nur die Eule sichtbar.
- **Eule** (`Owl.astro`) in vier Mimiken: Blick (Standard), skeptisch (Menü), erwischt (surprise), genervt (404).
- **«Der Blick»** (`OwlLive.astro`): die Eule aus den Ebenen des Kits. Ihre Pupillen folgen dem Zeiger, auf Geräten ohne Zeiger dem Scrollen. Sie hält im Foto-Platzhalter von «Über» die Stellung.
- **Wortmarke** allein (`wordmark.svg`, aus dem Logo abgeleitet): gross im Footer, dahinter ein blinkender Cursor.
- **Sticker**: «Betrüger hassen diesen Blick.» («Über»), «Netter Versuch.» (klebt sich auf den Klick-Simulator, sobald der DNS-Filter blockiert), «Du hast geklickt.» (surprise).
- **Favicon und App-Icons** erzeugt `pnpm assets` aus dem Kit, ebenso die OG-Bilder (Eule, Wortmarke, Leiterbahnen).
- Slogan: «Betrüger hassen diesen Blick.» Zweiter Claim: «Wir patchen Layer 8.»

Das Logo mit Slogan (`logo-claim-*.svg`) liegt für Druck und Social Media bereit; auf den Websites steht der Slogan als Text, weil er im Logo bei kleinen Grössen nicht lesbar ist. Nicht verwendet werden gestapeltes Logo, einfarbige Varianten, Patch-Sticker und Key Visual.

Weitere Bildelemente: der Globus «Layer 8» im Hero (Canvas, Dekoration), Punktraster (`.dot-grid`), Leuchtpunkte (`.dot`). Keine Stockfotos, keine KI-Bilder von Menschen. Icons: Lucide, 1.5 px Strich. Emojis nur in Beispiel-Chats und im Test-Link der Umfrage.

## 4. Layout

- Container höchstens 1440 px, Seitenrand 20–52 px, Sektionen 72–152 px vertikal.
- Inhalte links ausgerichtet; zentriert nur «Haltung» und die Aussage auf surprise.
- Radien: Karten 22 px, Panels 30 px, Bühnen bis 44 px, Bogen bis 40 px, Eingabefelder 14 px, Buttons und Tags als Pille.
- Mobile first, sauber von 320 bis 1920 px, nie horizontales Scrollen.
- Nichts ragt über den Bildrand, und kein Wort bricht mitten im Wort um. `overflow-x: clip` am `body` würde beides still verdecken; die Tests messen darum die Kanten selbst (`cutOff` und `brokenWords` in `e2e/helpers.ts`, zehn Seiten, zwölf Breiten).
- Lange Wörter in schmalen Spalten: Die Schrift richtet sich nach der Spalte (Container-Einheiten wie beim Titel der Datenschutzerklärung und der Adresse auf surprise), oder die Spalten wechseln früher auf weniger Reihen (Footer). Trennstellen als weiches Trennzeichen im Text, nie als Entität in einem Attribut.
- Angepinnte oder klebende Flächen müssen auch in niedrigen Fenstern (650 bis 800 px Höhe, typische Laptops) ganz ins Bild passen: Grössen dort an die Fensterhöhe hängen (`svh`).

## 5. Bausteine

- **Buttons** (`.btn`): Pille, 52 px hoch (klein 44 px). Primär in Acid mit dunkler Schrift und leichtem Schein; sekundär als Glas-Outline mit kurzer Lichtkante oben. `.btn-text` als Textlink mit Pfeil. `.orb`: runder Pfeil-Knopf in Listen.
- **Karten** (`.card`): 1 px Rahmen, kein Schlagschatten, dezenter Verlauf. Hover nur bei feinem Pointer.
- **Tags** (`.tag`): Pille in Versalien; `tag-amber` für Hebel und Warnungen, `tag-solid` (Acid) für «Neu».
- **Formularfelder**: 52 px hoch, Radius 14 px, Rahmen 3:1; Fehler mit Icon und Text.
- **Header**: oben volle Leiste (Logo, Navigation, CTA), nach dem Scrollen eine schwebende Kapsel (Eule, CTA, Menü-Knopf). Das Vollbild-Menü gibt es auf allen Breiten.
- **Schwebende Bedienelemente** (`Chrome.astro`): Fortschritt (Balken auf Mobile, Schiene mit Marken ab 1280 px), Cookie-Knopf (erklärt, warum es keinen Banner gibt), Schalter «Bewegung pausieren». Ab 1280 px schweben die Knöpfe in der Randspalte; der Schalter zeigt seine Beschriftung nur ganz oben auf der Startseite ausgeklappt. Darunter stehen die Knöpfe als Zeile am Seitenende.
- **Umfrage**: Kopf mit Fortschritt oben, unten eine klebende Leiste mit «Zurück» und «Weiter» über die ganze Breite. Hinweise und Fehlermeldungen stehen in dieser Leiste direkt über den Buttons und sind so immer im Bild.
- **Schalter mit wechselndem Namen** («Band anhalten» / «Band fortsetzen») tragen kein `aria-pressed`; Schalter mit festem Namen (Echt / Fälschung, Schritte im Simulator) schon.
- **Fokus-Ring**: 3 px Acid mit 3 px Abstand, bei Tastaturbedienung immer sichtbar.

## 6. Motion

Tokens: 150 / 250 / 400 / 800 ms; Easing `cubic-bezier(.2,.7,.2,1)` bzw. GSAP `power3.out`. Lenis für sanftes Scrollen (lerp 0.1), synchron zu ScrollTrigger.

Bewegte Momente auf psyber.tech:

1. Hero: Headline fährt zeilenweise hinter einer Maske ein. Der Globus dreht langsam und lässt sich ziehen; beim Scrollen durch den Hero werden seine Knoten «gepatcht» (auf grossen Bildschirmen bleibt der Hero dafür kurz stehen).
2. Header: Wechsel zwischen Leiste und Kapsel.
3. Klick-Simulator: spielt einmal ab; in Schritt 2 klebt sich der Sticker auf.
4. Überschriften der Sektionen fahren einmal zeilenweise ein.
5. «Drehbuch»: scroll-gesteuerte Kette mit Pinning am Desktop (ab 736 px Fensterhöhe; bis 848 px rückt die Bühne zusammen, damit sie ganz ins Bild passt).
6. Zahlen zählen einmal hoch.
7. Phishing-Ticker als Endlosband (pausiert bei Hover und über den Button).
8. «Haltung»: Wörter werden beim Scrollen hell.
9. Paket-Treppe wächst einmal; Chat-Nachrichten erscheinen nacheinander.
10. Footer: Cursor hinter der Wortmarke blinkt.
11. Kicker («0x01 // …») tippen sich wie eine Zeile im Terminal ein, sobald ihre Sektion ins Bild kommt.
12. «Über»: Der Sucher stellt scharf (die Ecken rücken an ihren Platz), eine feine Linie tastet das Porträt einmal ab, der Sticker klebt sich auf; im Terminal erscheinen die Zeilen nacheinander.
13. Sticker reagieren auf den Zeiger: ein Stück weiter gedreht, etwas näher.
14. Cookie-Hinweis: wächst aus seinem Knopf und zieht sich dorthin zurück.
15. Seitenwechsel innerhalb von psyber.tech: kurzes Überblenden (View Transitions, wo der Browser es kann).
16. Checkliste: Die Nummern der fünf Signale federn beim Laden der Reihe nach herein; der Text steht sofort da.
17. 404 (alle drei Sites): Die Zahl zuckt einmal mit Farbversatz, der Befehl im Terminal tippt sich, dann kommt die Antwort.

Auf forms.psyber.tech: Fragen gleiten herein (vorwärts von unten, zurück von oben), das Häkchen der gewählten Antwort federt kurz, der Danke-Screen baut sich Block für Block auf.

Auf surprise.psyber.tech: der Übergang zur Auflösung in vier Takten (Teaser, Störung, Spur, Einrasten; Zeiten als `--sp-*` in `apps/surprise/src/styles/global.css`, Entscheidung 173), danach kommen Untertitel, Text, Eule, Sticker und Adresse gestaffelt, zuletzt wischt der Marker ein.

Die Eule, die dem Zeiger nachschaut, lebt im Styleguide.

Kein Custom Cursor, kein Parallax auf Text.

**Regeln für neue Auftritte:** einmalig, kurz (unter einer Sekunde), nur `opacity`, `transform` und `clip-path`. Grosse Texte, die beim Laden im Bild stehen, blenden nie aus dem Nichts ein: Der Browser malte sie sonst später, und die Seite wirkte langsamer (gemessen an der Checkliste). Der Grundzustand im CSS ist immer die fertige Seite; der Auftritt ist ein `from`-Keyframe obendrauf. Was erst beim Hereinscrollen auftritt, trägt `data-enter` und wird von `reveal.ts` gemeldet. Helle Flächen blinken nie: höchstens drei deutliche Helligkeitswechsel pro Sekunde, und nur auf kleinen Flächen. **Gestufte Animationen (`steps()`) nie vorwärts halten, wenn der letzte Schritt zählt:** Läuft eine Animation von selbst aus, rechnet der Browser ihren Fortschritt manchmal auf 0,999… statt 1 (Rundung), und der letzte Schritt kommt nie. Entweder endet sie im Grundzustand und wird nur rückwärts gefüllt (`backwards`), oder ihre letzten beiden Keyframes sind gleich. Beim Vorspulen (`currentTime` setzen) zeigt sich der Fehler nicht; darum gibt es Tests, die in Echtzeit laufen.

### Reduzierte Bewegung und Pausieren

Bei `prefers-reduced-motion` steht alles sofort im Endzustand: kein Lenis, kein Pinning, kein Autoplay, keine Auftritte, kein Überblenden beim Seitenwechsel, der Globus steht still (lässt sich aber drehen) und zeigt alle Knoten gepatcht, der Ticker bricht um. Nichts hängt dann am Scrollen. Übergänge sind dann ganz aus (0 s, nicht 0.01 ms): Auch ein winziger Übergang hält für ein Bild die alten Werte fest und verschiebt kurz das Layout. Der Schalter «Bewegung pausieren» hält Dauerbewegung an (`html[data-motion='off']`).

## 7. Technische Regeln fürs Markup

- Keine Inline-`style`-Attribute und keine Inline-Skripte (strikte CSP mit Hashes); Werte zur Laufzeit per `element.style…` setzen.
- Interne Links über den `href()`-Helfer der jeweiligen App.
- Satzzeichen direkt nach einem Link oder einer Hervorhebung: Der Formatierer bricht nach dem schliessenden Tag um, und der Umbruch wird zum sichtbaren Leerzeichen («BACS .»). Solche Stellen auf eine Zeile schreiben und mit `{/* prettier-ignore */}` davor schützen (Beispiele in `Faq.astro` und `ClickSimulator.astro`).
- Anführungszeichen im sichtbaren Text: «…», darin ‹…›. Texte aus dem Auftrag standen dort selbst in «…»; was im Auftrag ‹…› hiess, ist auf der Seite also «…».
- Formulare tragen immer `method="post"`, auch wenn ein Skript sie sendet: Ohne Angabe sendet der Browser per GET, und die Eingaben stünden in der Adresse, sobald das Skript fehlt.
- Overlays mit eigenem Scrollen (Menü, Terminal) tragen `data-lenis-prevent`.
- Klassennamen in Scoped Styles nie so nennen wie einen Baustein aus `components.css` (`pnpm test` prüft das).
- Bilder aus dem Kit als `<img>` mit `width`, `height` und `alt` (leer, wenn Dekoration).
- Startseite: Sektionen weit unter dem ersten Bildschirm tragen `data-lazy`; der Browser rechnet sie erst bei Bedarf (`content-visibility`). `home.ts` holt sie nach der ersten Interaktion nach und vor jedem Sprung zu einer Marke sofort. Frisch ausgelegt gelten sie zwei Bilder lang als `data-laid="new"` (darin kein Übergang), danach als `data-laid=""`.
- Startseite: Ändert sich die Länge der Seite, während jemand schon weiter unten steht (Anpinnen im Drehbuch), bleibt der Abschnitt in der Bildmitte stehen (`keepInView` in `scroll.ts`). Die Leseposition für Neuladen und «Zurück» merkt `position.ts` im Verlaufseintrag (`history.state`), nie in Cookies oder Web-Speicher.

## 8. Regeln für Suchmaschinen

Was ein Crawler bekommt, steht im gemeinsamen Seitenkopf (`packages/ui/src/components/BaseHead.astro`); die Regeln prüft `e2e/seo.spec.ts` am rohen HTML.

- **Titel und Beschreibung** je Seite eigen: zuerst das Thema, am Schluss « – PSYber». Keine Preise, keine Platzhalter.
- **Im Index oder nicht** entscheidet `noindex` am Layout. Seiten im Index tragen ein absolutes Canonical ohne Parameter und erlauben grosse Vorschauen. Seiten mit `noindex` tragen weder Canonical noch strukturierte Daten und stehen nie zusätzlich unter `Disallow` in der robots.txt: Ein Crawler, der nicht abrufen darf, sieht das `noindex` nicht.
- **Strukturierte Daten** (JSON-LD) entstehen aus der Konfiguration, nie von Hand im Markup. Nur Angaben, die stimmen: keine Bewertungen, keine Preise, keine Adresse, solange sie nicht eingetragen ist.
- **Nachgestellte Betrugsnachrichten** tragen `data-nosnippet` (an `span` oder `div`): Sie sollen nie als Textauszug unter einem PSYber-Treffer stehen.
- **Inhalte stehen im HTML**, nicht erst nach JavaScript: Jede Seite ist ohne Skript vollständig lesbar.

## 9. Zählung der Reichweite

Gezählt wird anonym und nur als Tagessumme (`packages/ui/src/lib/track.ts`, Entscheidungen 164 bis 168). Für neue Seiten und Knöpfe gilt:

- **Neue Seite, deren Aufrufe zählen sollen:** Schlüssel in `PAGES` (`packages/survey/src/questions.ts`), im Layout der App zuordnen (`COUNTED`), Name für den Bericht in `scripts/analyze/compute.ts`.
- **Neuer Haupt-Knopf:** `data-track` mit einem Schlüssel aus `CTAS`, benannt nach dem Platz auf der Seite, nicht nach dem Ziel (das Ziel wechselt mit der Phase).
- **Nie freier Text:** keine Adressen, keine Eingaben, keine Parameter aus der URL. Was nicht in einer der Listen steht, lehnt die API ab.
- **Kein Speicher im Browser** für die Zählung: keine Cookies, kein `localStorage`, keine Kennung. `e2e/tracking.spec.ts` prüft das.
