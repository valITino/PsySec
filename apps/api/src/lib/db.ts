/** Hilfen für D1. Es werden ausschliesslich Prepared Statements verwendet. */

export interface CounterKey {
  /** Selbsteinschätzung 1–5; fehlt sie, zählt die Zeile unter 0 = keine Angabe */
  s?: number | undefined;
  /** Zweite Dimension aus einer festen Liste (Seite, Herkunft, Knopf, Frage); sonst leer */
  dim?: string | undefined;
}

/** Zähler erhöhen (UPSERT). */
export function bumpCounter(
  db: D1Database,
  event: string,
  day: string,
  key: CounterKey = {},
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO counters (event, dim, s_bucket, day, count) VALUES (?1, ?2, ?3, ?4, 1)
       ON CONFLICT (event, dim, s_bucket, day) DO UPDATE SET count = count + 1`,
    )
    .bind(event, key.dim ?? '', key.s ?? 0, day);
}

/**
 * Wie `bumpCounter`, zählt aber nur, wenn die Anweisung direkt davor im selben Batch eine Zeile
 * geschrieben hat (`changes()`). So zählt eine doppelt gesendete Antwort nicht zweimal.
 */
export function bumpCounterIfChanged(
  db: D1Database,
  event: string,
  day: string,
  key: CounterKey = {},
): D1PreparedStatement {
  return db
    .prepare(
      `INSERT INTO counters (event, dim, s_bucket, day, count)
       SELECT ?1, ?2, ?3, ?4, 1 WHERE changes() > 0
       ON CONFLICT (event, dim, s_bucket, day) DO UPDATE SET count = count + 1`,
    )
    .bind(event, key.dim ?? '', key.s ?? 0, day);
}
