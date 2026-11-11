/** Datum in der Schweiz als YYYY-MM-DD, bewusst ohne Uhrzeit. */
export function swissDay(date: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Zurich',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date);
}

export const DAY_MS = 24 * 60 * 60 * 1000;

/** Aufbewahrung der Kontaktanfragen */
export const CONTACT_RETENTION_DAYS = 180;
