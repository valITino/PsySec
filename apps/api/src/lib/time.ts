/** Datum in der Schweiz als YYYY-MM-DD, bewusst ohne Uhrzeit. */
export function swissDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

/**
 * Erster Tag des Monats zu einem Datum (YYYY-MM-01). Die Warteliste speichert nur den Monat:
 * Stünde dort derselbe Tag wie bei der Antwort, liessen sich beide an ruhigen Tagen zuordnen.
 */
export const monthStart = (day: string): string => `${day.slice(0, 8)}01`;

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Aufbewahrung der Kontaktanfragen */
export const CONTACT_RETENTION_DAYS = 180;
