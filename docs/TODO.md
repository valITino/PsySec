# Offene Punkte (von Ihnen zu liefern oder zu prüfen)

Sichtbare Platzhalter auf den Websites haben das Format `[TODO: …]`. Zentrale Stelle für Kontaktdaten und Preise: `apps/web/src/config/site.ts`.

## Inhalte

- [ ] Name (Terminal-Karte «Über», Impressum, Datenschutz)
- [ ] Rolle, z. B. «Cybersecurity-Spezialist» (Terminal-Karte)
- [ ] Motivation, 2–3 Sätze (Terminal-Karte `warum.txt`)
- [ ] Foto (Sektion «Über»; kein Stockfoto)
- [ ] E-Mail-Adresse für Kontakt (Header-Menü, Kontakt, Footer, Fehlermeldung des Formulars, Konsolen-Easter-Egg)
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
- [ ] E-Mail-Adressen existieren: `security@psyber.tech` (steht in `security.txt`) und die Kontaktadresse

## Betrieb

- [ ] Cloudflare-Konto, Zone psyber.tech, D1, Turnstile, Email Routing (Schritt für Schritt in `docs/DEPLOY.md`)
- [ ] GitHub Pages aktivieren, falls die Vorschau gewünscht ist: Repository → Settings → Pages → Source «GitHub Actions»
- [ ] Mindestens einmal pro Jahr neu bauen und deployen (`security.txt` läuft sonst ab)
