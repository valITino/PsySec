-- Zähler bekommen eine zweite Dimension: Seite, Herkunft, Knopf oder Frage.
--
-- Datenschutz by Design bleibt: nur Tagessummen, keine Kennung, kein freier Text. Die API nimmt
-- für `dim` ausschliesslich Werte aus festen Listen an (packages/survey, PAGES, SOURCES, CTAS, STEPS).
--
-- SQLite kann einen Primärschlüssel nicht ändern: Tabelle neu anlegen, Zeilen übernehmen, tauschen.

CREATE TABLE counters_v2 (
  event    TEXT NOT NULL,
  -- '' = ohne zweite Dimension (survey_started, survey_completed, bait_click, checklist_click)
  dim      TEXT NOT NULL DEFAULT '' CHECK (length(dim) <= 40),
  s_bucket INTEGER NOT NULL DEFAULT 0 CHECK (s_bucket BETWEEN 0 AND 5),
  day      TEXT NOT NULL CHECK (day GLOB '[0-9][0-9][0-9][0-9]-[0-9][0-9]-[0-9][0-9]'),
  count    INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (event, dim, s_bucket, day)
) WITHOUT ROWID;

INSERT INTO counters_v2 (event, dim, s_bucket, day, count)
SELECT event, '', s_bucket, day, count FROM counters;

DROP TABLE counters;

ALTER TABLE counters_v2 RENAME TO counters;
