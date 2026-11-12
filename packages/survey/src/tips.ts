import type { Q6Row } from './questions.ts';

/** Tipps zu den Schwerpunkten auf dem Danke-Screen (Abschnitt 6.5, wörtlich). */
export const tips: Record<Q6Row, string> = {
  phishing:
    'Links in SMS nie direkt antippen. Lange drücken, Adresse prüfen, im Zweifel die App oder Website selbst öffnen.',
  anlagebetrug:
    'Nie über Werbeanzeigen investieren. Anbieter vorher auf der Warnliste der FINMA prüfen.',
  romance: 'Wer Sie nie getroffen hat und um Geld bittet, ist ein Warnsignal. Immer.',
  cybermobbing:
    'Beweise sichern, nicht zurückschreiben, Vertrauensperson einbeziehen. Für Kinder und Jugendliche: Pro Juventute, Telefon 147.',
  heimnetz:
    'Router-Standardpasswort ändern, Updates automatisch installieren, ein Gästenetz für smarte Geräte einrichten.',
  privatsphaere:
    'Profile auf privat stellen, Standortfreigaben prüfen, Ferienfotos erst nach den Ferien posten.',
};
