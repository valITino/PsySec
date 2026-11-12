# Marke: Dateien aus dem Logo-Kit

Quelle: PSYber Logo-Kit, Runde 6 «Der Blick». Die Dateien sind unverändert übernommen (Ausnahme unten). Schriftzüge sind in Pfade umgewandelt; die Wortmarke ist in Chakra Petch gesetzt («PSY» Bold, «ber» Regular). Slogan: «Betrüger hassen diesen Blick.»

| Datei                                            | Inhalt                                                                   | Verwendung                                           |
| ------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------------------------------- |
| `logo-dark.svg`                                  | Eule mit Lupe, Wortmarke, Leiterbahn (für dunkle Flächen, ohne Slogan)   | `Logo.astro`: Header, Footer, Umfrage, surprise      |
| `logo-light.svg`                                 | dasselbe für helle Flächen                                               | Druck der Checkliste                                 |
| `logo-claim-dark.svg`, `logo-claim-light.svg`    | Logo mit dem Slogan unter der Wortmarke                                  | Reserve für Druck und Social Media; Styleguide       |
| `wordmark.svg`                                   | nur die Wortmarke (die zwei Buchstaben-Pfade aus dem Logo, enger Rahmen) | gross im Footer, OG-Bilder                           |
| `owl.svg`                                        | die Eule, Mimik «Blick» (Standard)                                       | `Owl.astro`, OG-Bilder                               |
| `owl-skeptisch.svg`                              | Mimik «skeptisch»                                                        | Menü                                                 |
| `owl-erwischt.svg`                               | Mimik «erwischt»                                                         | surprise                                             |
| `owl-genervt.svg`                                | Mimik «genervt»                                                          | 404                                                  |
| `owl-layer-body.svg`, `-iris`, `-pupils`, `-led` | die Eule in Ebenen für die Animation                                     | `OwlLive.astro`: «Über» (Pupillen folgen dem Zeiger) |
| `favicon.svg`, `avatar.svg`                      | Eule auf Aubergine (runde Ecken bzw. volle Fläche)                       | `pnpm assets` erzeugt daraus Favicons und App-Icons  |
| `app-icon.svg`                                   | App-Icon mit runden Ecken                                                | Reserve                                              |
| `sticker-blick.svg`                              | Sticker «Betrüger hassen diesen Blick.»                                  | «Über»                                               |
| `sticker-netter-versuch.svg`                     | Sticker «Netter Versuch.»                                                | Klick-Simulator, Schritt 2                           |
| `sticker-geklickt.svg`                           | Sticker «Du hast geklickt.»                                              | surprise                                             |

Abgeleitet: `wordmark.svg` stammt aus `logo-dark.svg` (nur die zwei Buchstaben-Pfade).

Die Ebenen sind laut Kit für die Fläche #140a29 gedacht. `OwlLive.astro` legt darum hinter die Augen einen Grund in dieser Farbe; so stimmt die Eule auf jeder Fläche.

Nicht übernommen: gestapeltes Logo, einfarbige Logos und Signets, Patch-Sticker, Key Visual, der Sticker mit dem früheren Claim «Erst Kopf. Dann Klick.» und die PNG-Exporte. Wer eine dieser Dateien braucht, findet sie im Kit.

Neues Kit einspielen: Dateien hier ersetzen, `wordmark.svg` neu ableiten, die Masse in `Logo.astro`, `Owl.astro` und `OwlLive.astro` an die `viewBox` anpassen, dann `pnpm assets` (Favicons, OG-Bilder).
