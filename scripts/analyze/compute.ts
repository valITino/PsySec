/**
 * Auswertung der Umfrage: reine Rechenlogik ohne Datei- oder HTML-Zugriffe (Auftrag 8.5).
 * Eingabe ist der Export aus `pnpm export` (scripts/export-d1.mjs).
 */
import {
  STEPS,
  q10Options,
  q12Options,
  q13Options,
  q14Options,
  q1Options,
  q2Options,
  q3Options,
  q5Options,
  q6Rows,
  q7Options,
} from '../../packages/survey/src/questions.ts';

// ---------------------------------------------------------------- Eingabe

/** Eine Zeile aus `survey_responses` (Mehrfachantworten und Matrix als JSON-Text) */
export interface ResponseRow {
  created_day: string;
  quelle: string;
  fokus: string | null;
  q1: string;
  q2: string;
  q3: string | null;
  q4: number;
  q5: string | null;
  q6: string;
  q7: string;
  q8: number | null;
  q9: number | null;
  q10: string | null;
  q11_a: number | null;
  q11_b: number | null;
  q11_c: number | null;
  q11_d: number | null;
  q12: string | null;
  q13: string | null;
  q14: string | null;
  q15: string | null;
}

export interface CounterRow {
  event: string;
  /** Zweite Dimension: Seite, Herkunft («Seite:Herkunft»), Knopf oder Frage; sonst leer */
  dim?: string;
  s_bucket: number;
  day: string;
  count: number;
}

export interface ExportData {
  exportedDay: string;
  responses: ResponseRow[];
  counters: CounterRow[];
  waitlist: { total: number; founding: number };
  /** Erfundene Beispieldaten (`pnpm analyze --demo`) */
  demo?: boolean;
  /** Lokale Testdatenbank von «wrangler dev» (`pnpm export --local`) statt der Umfrage */
  local?: boolean;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const rowsOf = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter(isRecord) : [];

/**
 * Liest den Export. Akzeptiert das Format von `pnpm export` und die rohe Ausgabe von
 * `wrangler d1 execute --json` mit drei Ergebnissen (Antworten, Zähler, Warteliste).
 */
export function parseExport(input: unknown, fallbackDay = ''): ExportData {
  let data = input;
  if (Array.isArray(input)) {
    if (input.length !== 3) {
      throw new Error('Rohe wrangler-Ausgabe: erwartet werden genau drei Ergebnisse.');
    }
    const sets = input.map((entry) => (isRecord(entry) ? rowsOf(entry.results) : []));
    data = {
      exportedDay: fallbackDay,
      responses: sets[0],
      counters: sets[1],
      waitlist: sets[2]?.[0] ?? {},
    };
  }
  if (!isRecord(data) || !Array.isArray(data.responses) || !Array.isArray(data.counters)) {
    throw new Error('Kein gültiger Export: «responses» und «counters» fehlen.');
  }
  const waitlist = isRecord(data.waitlist) ? data.waitlist : {};
  return {
    exportedDay:
      typeof data.exportedDay === 'string' && data.exportedDay ? data.exportedDay : fallbackDay,
    responses: rowsOf(data.responses) as unknown as ResponseRow[],
    counters: rowsOf(data.counters).map((row) => ({
      event: String(row.event ?? ''),
      // Exporte von vor November 2026 kennen die Spalte noch nicht.
      dim: String(row.dim ?? ''),
      s_bucket: Number(row.s_bucket ?? 0),
      day: String(row.day ?? ''),
      count: Number(row.count ?? 0),
    })),
    waitlist: {
      total: Number(waitlist.total ?? 0) || 0,
      founding: Number(waitlist.founding ?? 0) || 0,
    },
    demo: data.demo === true,
    local: data.source === 'local',
  };
}

// ---------------------------------------------------------------- Bausteine

export interface Share {
  key: string;
  label: string;
  count: number;
  /** Anteil an der Basis `n` (0–1) */
  share: number;
}

const ratio = (count: number, base: number) => (base > 0 ? count / base : 0);

function parseJson<T>(value: unknown, fallback: T): T {
  if (typeof value !== 'string' || value === '') return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

const list = (value: unknown): string[] => {
  const parsed = parseJson<unknown>(value, []);
  return Array.isArray(parsed) ? parsed.map(String) : [];
};

/** Zählt Einfachantworten. Unbekannte Werte erscheinen mit ihrem Rohwert. */
export function countSingle(
  values: (string | null | undefined)[],
  labels: Readonly<Record<string, string>>,
  base: number,
  options: { keepOrder?: boolean; includeEmpty?: boolean } = {},
): Share[] {
  const counts = new Map<string, number>();
  if (options.includeEmpty || options.keepOrder) {
    for (const key of Object.keys(labels)) counts.set(key, 0);
  }
  for (const value of values) {
    if (value === null || value === undefined || value === '') continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  const shares = [...counts.entries()].map(([key, count]) => ({
    key,
    label: labels[key] ?? key,
    count,
    share: ratio(count, base),
  }));
  return options.keepOrder ? shares : shares.sort((a, b) => b.count - a.count);
}

/** Zählt Mehrfachantworten: Anteil = Personen mit dieser Antwort / Basis. */
export function countMulti(
  values: string[][],
  labels: Readonly<Record<string, string>>,
  base: number,
): Share[] {
  const counts = new Map<string, number>(Object.keys(labels).map((key) => [key, 0]));
  for (const answers of values) {
    for (const key of new Set(answers)) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: labels[key] ?? key, count, share: ratio(count, base) }))
    .sort((a, b) => b.count - a.count);
}

export interface ScaleResult {
  /** Anzahl je Wert 1–5 (Index 0 = Wert 1) */
  counts: [number, number, number, number, number];
  n: number;
  /** Anteil der Antworten mit 4 oder 5 */
  top2: number;
  mean: number | null;
}

export function scale(values: (number | null | undefined)[]): ScaleResult {
  const counts: ScaleResult['counts'] = [0, 0, 0, 0, 0];
  let sum = 0;
  let n = 0;
  for (const value of values) {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 5) continue;
    counts[value - 1] = (counts[value - 1] ?? 0) + 1;
    sum += value;
    n++;
  }
  return { counts, n, top2: ratio(counts[3] + counts[4], n), mean: n > 0 ? sum / n : null };
}

// ---------------------------------------------------------------- Preisfragen (10, 12, 13)

export interface PriceBands {
  /** Preisstufen in der Reihenfolge der Umfrage, ohne «Würde ich nicht buchen» */
  bands: Share[];
  /** Antworten insgesamt (inklusive «Würde ich nicht buchen») */
  n: number;
  /** Personen, die eine Preisstufe gewählt haben */
  nBands: number;
  notBook: { count: number; share: number };
  /** Median-Spanne: eine Stufe, oder zwei bei gerader Anzahl mit geteilter Mitte */
  median: { keys: string[]; label: string } | null;
}

const NOT_BOOK = 'nicht_buchen';

export function priceBands(
  values: (string | null | undefined)[],
  labels: Readonly<Record<string, string>>,
): PriceBands {
  const order = Object.keys(labels).filter((key) => key !== NOT_BOOK);
  const answered = values.filter(
    (value): value is string => typeof value === 'string' && value !== '',
  );
  const n = answered.length;
  const chosen = answered.filter((value) => order.includes(value));
  const nBands = chosen.length;
  const bands = order.map((key) => {
    const count = chosen.filter((value) => value === key).length;
    return { key, label: labels[key] ?? key, count, share: ratio(count, n) };
  });
  const notBookCount = answered.filter((value) => value === NOT_BOOK).length;

  let median: PriceBands['median'] = null;
  if (nBands > 0) {
    const indices = chosen.map((value) => order.indexOf(value)).sort((a, b) => a - b);
    const lower = order[indices[Math.floor((nBands - 1) / 2)] ?? 0] ?? '';
    const upper = order[indices[Math.floor(nBands / 2)] ?? 0] ?? '';
    median =
      lower === upper
        ? { keys: [lower], label: labels[lower] ?? lower }
        : {
            keys: [lower, upper],
            label: `${labels[lower] ?? lower} bis ${labels[upper] ?? upper}`,
          };
  }
  return {
    bands,
    n,
    nBands,
    notBook: { count: notBookCount, share: ratio(notBookCount, n) },
    median,
  };
}

// ---------------------------------------------------------------- Van Westendorp (Frage 11)

export type VwCurve = 'tooCheap' | 'cheap' | 'expensive' | 'tooExpensive';

export interface VwPoint {
  price: number;
  tooCheap: number;
  cheap: number;
  expensive: number;
  tooExpensive: number;
}

export interface VanWestendorpResult {
  n: number;
  /** Kumulierte Anteile (0–1) an jedem genannten Preis */
  points: VwPoint[];
  /** Untere Grenze: «zu günstig» schneidet «teuer» */
  lower: number | null;
  /** Obere Grenze: «günstig» schneidet «zu teuer» */
  upper: number | null;
  /** Optimaler Preis: «zu günstig» schneidet «zu teuer» */
  optimal: number | null;
}

export interface VwAnswer {
  a: number;
  b: number;
  c: number;
  d: number;
}

/**
 * Schnittpunkt einer fallenden Kurve mit einer steigenden: der erste Preis, an dem die
 * fallende nicht mehr über der steigenden liegt, linear zwischen zwei Stützpunkten verfeinert.
 */
export function crossing(points: VwPoint[], falling: VwCurve, rising: VwCurve): number | null {
  for (let index = 0; index < points.length; index++) {
    const point = points[index];
    if (!point) continue;
    const diff = point[falling] - point[rising];
    if (diff > 0) continue;
    if (index === 0) return diff === 0 ? point.price : null;
    const before = points[index - 1];
    if (!before) return point.price;
    const diffBefore = before[falling] - before[rising];
    if (diff === 0 || diffBefore === diff) return point.price;
    return before.price + ((point.price - before.price) * diffBefore) / (diffBefore - diff);
  }
  return null;
}

export function vanWestendorp(answers: VwAnswer[]): VanWestendorpResult {
  const valid = answers.filter((answer) =>
    [answer.a, answer.b, answer.c, answer.d].every((value) => Number.isFinite(value) && value >= 0),
  );
  const n = valid.length;
  if (n === 0) return { n, points: [], lower: null, upper: null, optimal: null };

  const prices = [
    ...new Set(valid.flatMap((answer) => [answer.a, answer.b, answer.c, answer.d])),
  ].sort((x, y) => x - y);
  const points = prices.map((price) => ({
    price,
    tooCheap: valid.filter((answer) => answer.a >= price).length / n,
    cheap: valid.filter((answer) => answer.b >= price).length / n,
    expensive: valid.filter((answer) => answer.c <= price).length / n,
    tooExpensive: valid.filter((answer) => answer.d <= price).length / n,
  }));
  return {
    n,
    points,
    lower: crossing(points, 'tooCheap', 'expensive'),
    upper: crossing(points, 'cheap', 'tooExpensive'),
    optimal: crossing(points, 'tooCheap', 'tooExpensive'),
  };
}

// ---------------------------------------------------------------- Zähler

export interface CounterSummary {
  started: number;
  completed: number;
  baitClicks: number;
  checklistClicks: number;
  /** Klickrate auf den Test-Link: bait_click / survey_completed */
  baitRate: number | null;
  /** je Selbsteinschätzung 1–5 (Frage 4) */
  bySelfAssessment: { s: number; completed: number; clicks: number; rate: number | null }[];
  /** Klicks ohne gültige Angabe von `s` */
  clicksWithoutS: number;
}

export function counterSummary(counters: CounterRow[]): CounterSummary {
  const sum = (event: string, bucket?: number) =>
    counters
      .filter((row) => row.event === event && (bucket === undefined || row.s_bucket === bucket))
      .reduce((total, row) => total + (Number.isFinite(row.count) ? row.count : 0), 0);
  const completed = sum('survey_completed');
  const baitClicks = sum('bait_click');
  return {
    started: sum('survey_started'),
    completed,
    baitClicks,
    checklistClicks: sum('checklist_click'),
    baitRate: completed > 0 ? baitClicks / completed : null,
    bySelfAssessment: [1, 2, 3, 4, 5].map((s) => {
      const done = sum('survey_completed', s);
      const clicks = sum('bait_click', s);
      return { s, completed: done, clicks, rate: done > 0 ? clicks / done : null };
    }),
    clicksWithoutS: sum('bait_click', 0),
  };
}

// ---------------------------------------------------------------- Reichweite

export interface ReachItem {
  key: string;
  label: string;
  count: number;
}

export interface ReachDay {
  day: string;
  views: number;
  visits: number;
}

export interface ReachStep extends ReachItem {
  /** Anteil an allen, die Frage 1 gesehen haben; `null`, solange niemand gezählt ist */
  share: number | null;
}

/** Anonyme Tagessummen der Websites: Aufrufe, Einstiege, Klicks, Verlauf durch die Umfrage */
export interface ReachSummary {
  views: number;
  visits: number;
  clicks: number;
  /** Gespeicherte Kontaktanfragen (zählt die API selbst) */
  contacts: number;
  /** Aufrufe je Seite, häufigste zuerst */
  pages: ReachItem[];
  /** Einstiege je Herkunft, häufigste zuerst */
  sources: ReachItem[];
  /** Einstiege je Seite, auf der jemand angekommen ist, häufigste zuerst */
  landings: ReachItem[];
  /** Klicks je Knopf, häufigste zuerst */
  targets: ReachItem[];
  /** Erreichte Fragen in der Reihenfolge der Umfrage */
  steps: ReachStep[];
  /** Jeder Tag vom ersten bis zum letzten gezählten, auch die ohne Aufruf */
  days: ReachDay[];
}

const PAGE_LABELS: Record<string, string> = {
  home: 'Startseite',
  checkliste: 'Checkliste',
  impressum: 'Impressum',
  datenschutz: 'Datenschutzerklärung',
  notfound: 'Seite nicht gefunden (404)',
  umfrage: 'Umfrage',
  erwischt: '«Erwischt!»',
};

const CTA_LABELS: Record<string, string> = {
  header_cta: 'Kopfleiste',
  menu_cta: 'Menü',
  hero_cta: 'Einstieg: Hauptknopf',
  hero_mehr: 'Einstieg: «So funktioniert’s»',
  pakete_cta: 'Pakete',
  schritt_cta: '«Der erste Schritt»',
  footer_umfrage: 'Footer: Umfrage',
  checkliste_drucken: 'Checkliste drucken',
  erwischt_kontakt: '«Erwischt!»: Session anfragen',
  erwischt_code: '«Erwischt!»: Code kopieren',
};

const nextDay = (day: string): string => {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + 1);
  return date.toISOString().slice(0, 10);
};

/** Höchstens so viele Tage zeigt der Verlauf (Schutz vor einem Tippfehler im Datum) */
const MAX_DAYS = 400;

export function reachSummary(counters: CounterRow[]): ReachSummary {
  const valid = counters.filter((row) => Number.isFinite(row.count) && row.count > 0);
  const total = (event: string) =>
    valid.filter((row) => row.event === event).reduce((sum, row) => sum + row.count, 0);
  /** Summen je Schlüssel, häufigste zuerst; bei Gleichstand nach Namen */
  const grouped = (
    event: string,
    keyOf: (dim: string) => string,
    labels: Record<string, string>,
  ): ReachItem[] => {
    const sums = new Map<string, number>();
    for (const row of valid) {
      if (row.event !== event) continue;
      const key = keyOf(row.dim ?? '');
      if (key) sums.set(key, (sums.get(key) ?? 0) + row.count);
    }
    return [...sums]
      .map(([key, count]) => ({ key, label: labels[key] ?? key, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'de'));
  };
  const before = (dim: string) => dim.split(':')[0] ?? '';
  const after = (dim: string) => dim.split(':')[1] ?? '';

  const stepCounts = new Map(
    grouped('survey_step', (dim) => dim, {}).map((item) => [item.key, item.count]),
  );
  const firstStep = stepCounts.get(STEPS[0] ?? '') ?? 0;

  const perDay = new Map<string, ReachDay>();
  for (const row of valid) {
    if (row.event !== 'page_view' && row.event !== 'visit') continue;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(row.day)) continue;
    const entry = perDay.get(row.day) ?? { day: row.day, views: 0, visits: 0 };
    if (row.event === 'page_view') entry.views += row.count;
    else entry.visits += row.count;
    perDay.set(row.day, entry);
  }
  const known = [...perDay.keys()].sort();
  const days: ReachDay[] = [];
  const last = known.at(-1);
  for (
    let day = known[0];
    day && last && day <= last && days.length < MAX_DAYS;
    day = nextDay(day)
  ) {
    days.push(perDay.get(day) ?? { day, views: 0, visits: 0 });
  }

  return {
    views: total('page_view'),
    visits: total('visit'),
    clicks: total('cta_click'),
    contacts: total('contact_sent'),
    pages: grouped('page_view', (dim) => dim, PAGE_LABELS),
    sources: grouped('visit', after, REACH_SOURCE_LABELS),
    landings: grouped('visit', before, PAGE_LABELS),
    targets: grouped('cta_click', (dim) => dim, CTA_LABELS),
    steps: STEPS.map((key, index) => {
      const count = stepCounts.get(key) ?? 0;
      return {
        key,
        label: `Frage ${index + 1}`,
        count,
        share: firstStep > 0 ? count / firstStep : null,
      };
    }),
    days,
  };
}

// ---------------------------------------------------------------- Go/No-Go

export const TARGETS = {
  responses: 150,
  zurichShare: 0.6,
  topicShare: 0.3,
  setupUpper: 490,
  waitlist: 20,
  founding: 5,
} as const;

/** Ab diesem Anteil am Ziel gilt ein verfehltes Kriterium als «knapp» (Gelb). */
export const NEAR = 0.8;

export type CriterionState = 'met' | 'near' | 'missed';

export interface Criterion {
  id: keyof typeof TARGETS;
  label: string;
  /** Erreichter Wert und Ziel in derselben Einheit */
  value: number | null;
  target: number;
  unit: 'count' | 'share' | 'chf';
  state: CriterionState;
}

export type Verdict = 'go' | 'almost' | 'no-go';

function criterion(
  id: Criterion['id'],
  label: string,
  value: number | null,
  unit: Criterion['unit'],
): Criterion {
  const target = TARGETS[id];
  const state: CriterionState =
    value !== null && value >= target
      ? 'met'
      : value !== null && value >= target * NEAR
        ? 'near'
        : 'missed';
  return { id, label, value, target, unit, state };
}

// ---------------------------------------------------------------- Gesamtauswertung

export interface Analysis {
  exportedDay: string;
  demo: boolean;
  /** Daten aus der lokalen Testdatenbank, nicht aus der Umfrage */
  local: boolean;
  n: number;
  period: { first: string; last: string } | null;
  bySource: Share[];
  byFocus: Share[];
  byRegion: Share[];
  zurichShare: number;
  household: Share[];
  caresForParents: { n: number; shares: Share[] };
  experience: { n: number; shares: Share[] };
  selfAssessment: ScaleResult;
  topics: { key: string; label: string; result: ScaleResult }[];
  /** Anteil der Befragten mit 4 oder 5 bei mindestens einem Thema */
  anyTopicShare: number;
  formats: Share[];
  whatsappCheck: ScaleResult;
  monitoring: ScaleResult;
  priceSession: PriceBands;
  priceAbo: PriceBands;
  priceAboPlus: PriceBands;
  setup: VanWestendorpResult;
  priorities: { n: number; shares: Share[] };
  worries: string[];
  counters: CounterSummary;
  reach: ReachSummary;
  waitlist: { total: number; founding: number };
  criteria: Criterion[];
  verdict: Verdict;
}

const FOCUS_LABELS = {
  vor: 'vor dem Klick',
  nach: 'nach dem Klick',
  unklar: 'unklar',
  ohne: 'ohne Angabe',
};
const SOURCE_LABELS: Record<string, string> = {
  instagram: 'Instagram',
  tiktok: 'TikTok',
  facebook: 'Facebook',
  linkedin: 'LinkedIn',
  whatsapp: 'WhatsApp',
  flyer: 'Flyer',
  vortrag: 'Vortrag',
  website: 'Website',
  empfehlung: 'Empfehlung',
  andere: 'andere',
  direkt: 'direkt (ohne Angabe)',
};
/** Herkunft eines Einstiegs: die Werte von `?quelle=`, sonst die Art der verweisenden Seite */
const REACH_SOURCE_LABELS: Record<string, string> = {
  ...SOURCE_LABELS,
  website: 'Eigene Website',
  andere: 'Andere Kennzeichnung',
  direkt: 'Direkt (ohne Verweis)',
  suche: 'Suchmaschine',
  social: 'Soziales Netz',
  verweis: 'Andere Website',
};

export function analyze(data: ExportData): Analysis {
  const rows = data.responses;
  const n = rows.length;
  const days = rows
    .map((row) => row.created_day)
    .filter(Boolean)
    .sort();

  const byRegion = countSingle(
    rows.map((row) => row.q1),
    q1Options,
    n,
    { keepOrder: true },
  );
  const zurich = rows.filter((row) => row.q1 === 'stadt_zh' || row.q1 === 'kanton_zh').length;

  const matrices = rows.map((row) => parseJson<Record<string, number>>(row.q6, {}));
  const topics = Object.entries(q6Rows).map(([key, label]) => ({
    key,
    label,
    result: scale(matrices.map((matrix) => matrix[key])),
  }));
  const anyTopic = matrices.filter((matrix) =>
    Object.keys(q6Rows).some((key) => (matrix[key] ?? 0) >= 4),
  ).length;

  const q3Answers = rows.map((row) => row.q3).filter(Boolean);
  const q5Answers = rows.map((row) => row.q5).filter(Boolean);
  const q14Answers = rows.map((row) => list(row.q14)).filter((answers) => answers.length > 0);

  const setup = vanWestendorp(
    rows
      .filter(
        (row) =>
          row.q11_a !== null && row.q11_b !== null && row.q11_c !== null && row.q11_d !== null,
      )
      .map((row) => ({
        a: Number(row.q11_a),
        b: Number(row.q11_b),
        c: Number(row.q11_c),
        d: Number(row.q11_d),
      })),
  );

  const zurichShare = ratio(zurich, n);
  const anyTopicShare = ratio(anyTopic, n);
  const criteria: Criterion[] = [
    criterion('responses', 'Antworten', n, 'count'),
    criterion('zurichShare', 'davon aus dem Kanton Zürich', n > 0 ? zurichShare : null, 'share'),
    criterion(
      'topicShare',
      'Interesse 4 oder 5 bei mindestens einem Thema',
      n > 0 ? anyTopicShare : null,
      'share',
    ),
    // Auf ganze Franken gerundet: so stimmen Anzeige und Vergleich mit dem Ziel überein.
    criterion(
      'setupUpper',
      'Akzeptierter Preis für das Setup-Paket reicht bis',
      setup.upper === null ? null : Math.round(setup.upper),
      'chf',
    ),
    criterion('waitlist', 'Einträge auf der Warteliste', data.waitlist.total, 'count'),
    criterion('founding', 'davon Founding Families', data.waitlist.founding, 'count'),
  ];
  const verdict: Verdict = criteria.every((entry) => entry.state === 'met')
    ? 'go'
    : criteria.every((entry) => entry.state !== 'missed')
      ? 'almost'
      : 'no-go';

  return {
    exportedDay: data.exportedDay,
    demo: data.demo === true,
    local: data.local === true,
    n,
    period: days.length > 0 ? { first: days[0] ?? '', last: days[days.length - 1] ?? '' } : null,
    bySource: countSingle(
      rows.map((row) => row.quelle),
      SOURCE_LABELS,
      n,
    ),
    byFocus: countSingle(
      rows.map((row) => row.fokus ?? 'ohne'),
      FOCUS_LABELS,
      n,
    ),
    byRegion,
    zurichShare,
    household: countMulti(
      rows.map((row) => list(row.q2)),
      q2Options,
      n,
    ),
    caresForParents: {
      n: q3Answers.length,
      shares: countSingle(q3Answers, q3Options, q3Answers.length, { keepOrder: true }),
    },
    experience: {
      n: q5Answers.length,
      shares: countSingle(q5Answers, q5Options, q5Answers.length, { keepOrder: true }),
    },
    selfAssessment: scale(rows.map((row) => row.q4)),
    topics,
    anyTopicShare,
    formats: countMulti(
      rows.map((row) => list(row.q7)),
      q7Options,
      n,
    ),
    whatsappCheck: scale(rows.map((row) => row.q8)),
    monitoring: scale(rows.map((row) => row.q9)),
    priceSession: priceBands(
      rows.map((row) => row.q10),
      q10Options,
    ),
    priceAbo: priceBands(
      rows.map((row) => row.q12),
      q12Options,
    ),
    priceAboPlus: priceBands(
      rows.map((row) => row.q13),
      q13Options,
    ),
    setup,
    priorities: {
      n: q14Answers.length,
      shares: countMulti(q14Answers, q14Options, q14Answers.length),
    },
    worries: rows
      .map((row) => (typeof row.q15 === 'string' ? row.q15.trim() : ''))
      .filter((text) => text !== ''),
    counters: counterSummary(data.counters),
    reach: reachSummary(data.counters),
    waitlist: data.waitlist,
    criteria,
    verdict,
  };
}
