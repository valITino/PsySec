-- PSYber: Datenbank (Cloudflare D1, EU-Jurisdiktion)
--
-- Datenschutz by Design:
--   * keine IP-Adressen, keine User-Agents, keine Fingerprints
--   * Umfrage nur mit Datum (YYYY-MM-DD), ohne Uhrzeit; Warteliste nur mit dem Monat
--     (als Monatserster), damit sich Antwort und E-Mail auch an ruhigen Tagen nicht zuordnen lassen
--   * Umfrage und Warteliste haben keine gemeinsame ID und keinen Fremdschlüssel
--   * WITHOUT ROWID: SQLite führt keine fortlaufende Zeilennummer mit, aus der sich die
--     Reihenfolge der Einträge (und damit eine Zuordnung) ablesen liesse

-- Anonyme Antworten der Umfrage
CREATE TABLE survey_responses (
  id             TEXT PRIMARY KEY,
  created_day    TEXT NOT NULL CHECK (created_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  schema_version INTEGER NOT NULL,
  quelle         TEXT NOT NULL,
  fokus          TEXT,
  -- Einfach- und Skalenantworten
  q1             TEXT NOT NULL,
  q3             TEXT,
  q4             INTEGER NOT NULL CHECK (q4 BETWEEN 1 AND 5),
  q5             TEXT,
  q8             INTEGER CHECK (q8 BETWEEN 1 AND 5),
  q9             INTEGER CHECK (q9 BETWEEN 1 AND 5),
  q10            TEXT,
  q12            TEXT,
  q13            TEXT,
  -- Mehrfachantworten und Matrix als JSON
  q2             TEXT NOT NULL,
  q6             TEXT NOT NULL,
  q7             TEXT NOT NULL,
  q14            TEXT,
  -- Van Westendorp: vier Beträge in CHF
  q11_a          INTEGER,
  q11_b          INTEGER,
  q11_c          INTEGER,
  q11_d          INTEGER,
  -- Freitext
  q15            TEXT
) WITHOUT ROWID;

CREATE INDEX idx_survey_day ON survey_responses (created_day);

-- Freiwillige E-Mail für die Warteliste, getrennt von den Antworten.
-- created_day enthält bewusst nur den Monat (YYYY-MM-01).
CREATE TABLE waitlist (
  id              TEXT PRIMARY KEY,
  created_day     TEXT NOT NULL CHECK (created_day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  email           TEXT NOT NULL UNIQUE,
  founding_family INTEGER NOT NULL DEFAULT 0 CHECK (founding_family IN (0, 1))
) WITHOUT ROWID;

-- Kontaktanfragen: werden nach 180 Tagen automatisch gelöscht (Cron)
CREATE TABLE contact_requests (
  id         TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  plz_ort    TEXT NOT NULL,
  interesse  TEXT NOT NULL,
  nachricht  TEXT,
  ref        TEXT
) WITHOUT ROWID;

CREATE INDEX idx_contact_created ON contact_requests (created_at);

-- Anonyme Zähler als Tagessummen. s_bucket: 0 = keine Angabe, 1–5 = Selbsteinschätzung
CREATE TABLE counters (
  event    TEXT NOT NULL,
  s_bucket INTEGER NOT NULL DEFAULT 0 CHECK (s_bucket BETWEEN 0 AND 5),
  day      TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event, s_bucket, day)
) WITHOUT ROWID;
