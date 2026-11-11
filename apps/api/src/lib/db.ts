/** Hilfen für D1. Es werden ausschliesslich Prepared Statements verwendet. */

/** Zähler erhöhen (UPSERT). `s`: Selbsteinschätzung 1–5, sonst 0 = keine Angabe. */
export function bumpCounter(
  db: D1Database,
  event: string,
  day: string,
  s?: number,
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO counters (event, s_bucket, day, count) VALUES (?1, ?2, ?3, 1)
       ON CONFLICT (event, s_bucket, day) DO UPDATE SET count = count + 1`,
    )
    .bind(event, s ?? 0, day);
}
