# Offene Punkte (von Ihnen zu liefern oder zu prüfen)

Sichtbare Platzhalter auf den Websites haben das Format `[TODO: …]`. Zentrale Stelle für Kontaktdaten und Preise: `apps/web/src/config/site.ts`.

## Nach dem Redesign: Ihre Rückmeldung

- [ ] Look ansehen (lokal `pnpm dev:web`, oder die Vorschau auf GitHub Pages, sobald der Stand auf `main` liegt)
- [ ] Akzentfarbe: Lime wie bei der Referenz (jetzt) oder das Amber der Eule? Der Tausch ist eine Zeile in `packages/ui/src/styles/tokens.css` (Entscheidung 103)
- [ ] «Zürich» steht weiterhin dort, wo der heutige Stand beschrieben wird: FAQ («Für Familien im Raum Zürich»), Einleitung der Umfrage, Kontakt («Stadt und Kanton Zürich»), Meta-Description. Sollen auch diese Stellen offener formuliert werden?
- [ ] Logo-Kit Runde 6 ist eingebaut. Die Eule im Foto-Platzhalter von «Über» schaut dem Zeiger nach (Entscheidung 121): gefällt das, oder soll sie stillhalten?
- [ ] Sticker-Sprüche und ergänzte Texte gegenlesen (Liste in Entscheidung 112)

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
- Kontaktanfragen werden nach 180 Tagen gelöscht; Umfrage und Warteliste speichern nur das Datum (Auftrag 8.2).
- Die Vorschau auf GitHub Pages simuliert die API: Dort wird nichts gespeichert und nichts gezählt.
