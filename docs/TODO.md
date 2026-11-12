# Offene Punkte (von Ihnen zu liefern oder zu prüfen)

Sichtbare Platzhalter auf den Websites haben das Format `[TODO: …]`. Zentrale Stelle für Kontaktdaten und Preise: `apps/web/src/config/site.ts`.

## Nach dem Redesign: Ihre Rückmeldung

- [ ] Look ansehen (lokal `pnpm dev:web`, oder die Vorschau auf GitHub Pages, sobald der Stand auf `main` liegt)
- [ ] Region im Kontakt und im Footer lautet jetzt «Schweiz» (Entscheidung 123). Falls Sie vorerst nur einen Teil der Schweiz abdecken, hier genauer werden: `apps/web/src/config/site.ts`
- [ ] Logo-Kit Runde 6 ist eingebaut. Die Eule im Foto-Platzhalter von «Über» schaut dem Zeiger nach (Entscheidung 121): gefällt das, oder soll sie stillhalten?
- [ ] Sticker-Sprüche und ergänzte Texte gegenlesen (Liste in Entscheidung 112)

## Nach dem Gesamt-Review: Ihre Rückmeldung

- [ ] Drei neue Sätze auf dem Startscreen der Umfrage gegenlesen (Entscheidung 136): der Hinweis, dass es nach dem Antippen von selbst weitergeht, der Zusatz für die Tastatur und der Hinweis «Die Umfrage lädt noch …».
- [ ] Danke-Screen der Umfrage: Nach dem Absenden bleibt bis zum Schliessen des Tabs ein kleiner Merker im Browser (Selbsteinschätzung und Schwerpunkte), damit der Screen ein Neuladen übersteht (Entscheidung 137). Das weicht in einem Punkt von «nach dem Absenden löschen» ab. Einverstanden? Sonst lässt es sich in `apps/forms/src/components/survey/state.ts` mit einer Zeile abschalten (`saveDone`).
- [ ] Anführungszeichen: Wo der Auftrag ‹…› schrieb, steht auf den Seiten jetzt «…» (Entscheidung 149), zum Beispiel «Nur heute», «sofort». Im Auftrag standen diese Texte selbst in Anführungszeichen; auf der Seite sind sie die äussere Ebene.
- [ ] Warteliste: gespeichert wird nur noch der Monat der Eintragung, nicht der Tag (Entscheidung 128). Für die Auswertung genügt das; falls Sie den Tag brauchen, bitte melden.
- [ ] Vor dem Verteilen des Umfrage-Links die Probe aus `docs/DEPLOY.md`, Schritt 8 machen und die Testdaten danach löschen (die Befehle dort sind neu gefasst).

## Sichtbarkeit in Suchmaschinen: Ihre Schritte

Die Technik ist vorbereitet (Entscheidungen 150 bis 159). Das Folgende geht nur mit Ihren Konten bzw. Ihrem Wissen; die Anleitung steht in `docs/DEPLOY.md`, Schritt 9.

- [ ] Bei Cloudflare entscheiden, ob KI-Anbieter die Inhalte fürs Training verwenden dürfen (Schritt 9.1). KI-Suche («Search») erlauben, sonst fehlt PSYber in diesen Antworten.
- [ ] Google Search Console einrichten, Sitemap einreichen, Indexierung der Startseite beantragen (Schritt 9.2)
- [ ] Bing Webmaster Tools einrichten (Schritt 9.3)
- [ ] Google-Unternehmensprofil anlegen (Schritt 9.4)
- [ ] Profile auf anderen Plattformen (LinkedIn, Instagram usw.), falls vorhanden, melden: Sie kommen als `sameAs` in die strukturierten Daten (`apps/web/src/config/site.ts`, `brand`).
- [ ] Ratgeber-Texte je Masche (je rund 300 bis 800 Wörter aus Ihrer Erfahrung). Das ist der grösste Hebel für Sichtbarkeit: Heute steht fast alles auf einer Seite, und die Fallakten sind für eigene Seiten zu kurz.
- [ ] Titel und Beschreibung der Startseite gegenlesen (Entscheidung 155)

## Tracking und Analysen: Entscheidung nötig

Noch nicht eingebaut. Der Auftrag verbietet Tracking und Cookies; die Website sagt das an mehreren Stellen ausdrücklich («Kein Cookie-Banner. Weil wir keine Cookies setzen.», Datenschutzerklärung, `humans.txt`). Bevor etwas eingebaut wird, braucht es Ihre Wahl einer Variante (ohne Cookies und ohne Einwilligung möglich, oder klassisch mit Banner).

## Inhalte

- [ ] Name (Terminal-Karte «Über», Impressum, Datenschutz)
- [ ] Rolle, z. B. «Cybersecurity-Spezialist» (Terminal-Karte)
- [ ] Motivation, 2–3 Sätze (Terminal-Karte `warum.txt`)
- [ ] Foto (Sektion «Über»; kein Stockfoto)
- [ ] E-Mail-Adresse für Kontakt (Header-Menü, Kontakt, Footer, Fehlermeldung des Formulars, Gruss in der Konsole)
- [ ] Telefon/WhatsApp-Nummer (Header-Menü, Kontakt, Footer)
- [ ] Angaben fürs Impressum: Firma bzw. Name, Rechtsform, Adresse, UID (falls vorhanden)
- [ ] Finale Preise der vier Pakete (aktuell die Spannen aus dem Auftrag, nur bei `PUBLIC_SITE_PHASE=launch` sichtbar)

## Rechtliches

- [ ] Impressum rechtlich prüfen lassen (aktuell als Entwurf markiert)
- [ ] Datenschutzerklärung nach revDSG rechtlich prüfen lassen (aktuell als Entwurf markiert)
- [ ] Rabattcode «LAYER8» (10 %) bestätigen und intern festhalten, wie er eingelöst wird

## Vor dem Launch prüfen

- [ ] Fiktive Beispiel-Domains gehören keiner echten Firma (sonst ersetzen): `paket-zustellung-ch.info`, `karten-sicherheit-ch.com`, `gutschein-sofort.ch`
- [ ] Quellenlinks aus Abschnitt 5.17 des Auftrags sind noch erreichbar und stützen die Zahlen
- [ ] E-Mail-Adressen existieren: `security@psyber.tech` (steht in `security.txt`), `hallo@psyber.tech` (Absender der Benachrichtigung) und die Kontaktadresse
- [ ] Texte der Easter Eggs gegenlesen (Konsole und Terminal, `apps/web/src/scripts/egg.ts` und `terminal.ts`)
- [ ] Alle drei Websites einmal in Safari (iPhone und Mac) und Firefox ansehen: Die automatischen Tests laufen nur in Chromium

## Betrieb (Schritt für Schritt in `docs/DEPLOY.md`)

- [ ] Cloudflare-Konto, Zone psyber.tech, Nameserver, DNSSEC
- [ ] D1 mit EU-Jurisdiktion anlegen, `database_id` in `apps/api/wrangler.jsonc` eintragen, Migrationen anwenden
- [ ] Turnstile-Widget anlegen (Site Key und Secret)
- [ ] Email Routing einrichten, Zieladresse verifizieren
- [ ] Vier Workers mit dem Repository verbinden, Variablen setzen, Weiterleitung von www
- [ ] Domain-Härtung: CAA, DMARC; HSTS-Preload erst nach stabilem Betrieb
- [ ] Checks nach dem Go-Live: Observatory, Lighthouse, Formulare, Zähler
- [ ] GitHub Pages aktivieren, falls die Vorschau gewünscht ist: Repository → Settings → Pages → Source «GitHub Actions» (wirkt, sobald der Stand auf `main` liegt)
- [ ] Erinnerung eintragen: mindestens einmal pro Jahr neu bauen und deployen (`security.txt` läuft sonst ab)

## Annahmen, die Sie bestätigen oder ändern können

Alle Annahmen stehen mit Grund und Alternative in `docs/DECISIONS.md`. Die wichtigsten:

- Ampel der Auswertung: «Fast», wenn kein Kriterium unter 80 % seines Ziels liegt (Entscheidung 89).
- Ampel der Auswertung: Das Kriterium «mindestens 60 % der Antworten aus dem Kanton Zürich» stammt aus dem Auftrag. Wenn der Start nicht mehr auf Zürich begrenzt ist, den Wert in `scripts/analyze/compute.ts` anpassen oder streichen.
- Kontaktanfragen werden nach 180 Tagen gelöscht; Umfrage und Warteliste speichern nur das Datum (Auftrag 8.2).
- Die Vorschau auf GitHub Pages simuliert die API: Dort wird nichts gespeichert und nichts gezählt.
