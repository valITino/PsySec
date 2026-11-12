/**
 * Auswertung der Umfrage als einzelne HTML-Datei (ohne externe Ressourcen).
 * Diagramme: Balken und Meter in HTML/CSS, die Van-Westendorp-Kurven und der Verlauf der
 * Seitenaufrufe als SVG.
 * Jedes Diagramm hat eine Tabellenansicht; Tooltips ergänzen nur, was ohnehin lesbar ist.
 * Farben: Marken-Violett für Einzelreihen, vier geprüfte Farben für die Kurven
 * (auch bei Farbfehlsichtigkeit unterscheidbar), Statusfarben nur mit Icon und Text.
 */
import { readFileSync } from 'node:fs';
import type {
  Analysis,
  Criterion,
  PriceBands,
  ReachDay,
  ReachItem,
  ReachSummary,
  ScaleResult,
  Share,
  VanWestendorpResult,
  VwCurve,
  VwPoint,
} from './compute.ts';

// ---------------------------------------------------------------- Formatierung

const NBSP = ' ';

export const esc = (value: unknown): string =>
  String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

export const fmtInt = (value: number): string =>
  Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '’');

export const fmtPct = (share: number, digits = 0): string =>
  `${(share * 100).toFixed(digits).replace('.', ',')}${NBSP}%`;

export const fmtChf = (value: number): string => `CHF${NBSP}${fmtInt(value)}`;

/** 2026-12-21 → 21.12.2026 */
export const fmtDay = (day: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[3]}.${match[2]}.${match[1]}` : day;
};

/** Preise aus den Kurven: auf ganze Franken */
const whole = (value: number) => Math.round(value);

// ---------------------------------------------------------------- Bausteine

const ICONS = {
  met: '<path d="M21.8 10A10 10 0 1 1 17 3.3"/><path d="m9 11 3 3L22 4"/>',
  near: '<circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/>',
  missed: '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
} as const;

const STATE_TEXT = { met: 'erfüllt', near: 'knapp', missed: 'offen' } as const;

const icon = (name: keyof typeof ICONS, size = 18) =>
  `<svg class="icon icon-${name}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name]}</svg>`;

interface TableData {
  head: string[];
  rows: (string | number)[][];
}

function table({ head, rows }: TableData): string {
  return `<details class="table-view"><summary>Tabelle</summary><table><thead><tr>${head
    .map((cell) => `<th scope="col">${esc(cell)}</th>`)
    .join('')}</tr></thead><tbody>${rows
    .map(
      (row) =>
        `<tr>${row
          .map((cell, index) =>
            index === 0 ? `<th scope="row">${esc(cell)}</th>` : `<td>${esc(cell)}</td>`,
          )
          .join('')}</tr>`,
    )
    .join('')}</tbody></table></details>`;
}

function card(
  title: string,
  sub: string,
  body: string,
  tableData?: TableData,
  wide = false,
): string {
  return `<figure class="card${wide ? ' card-wide' : ''}"><figcaption><h3>${esc(title)}</h3>${
    sub ? `<p class="sub">${esc(sub)}</p>` : ''
  }</figcaption>${body}${tableData ? table(tableData) : ''}</figure>`;
}

interface BarRow {
  label: string;
  /** Länge des Balkens relativ zum grössten Wert der Liste (0–1) */
  size: number;
  value: string;
  detail?: string;
  tip: string;
  /** Kontext statt Aussage: grau */
  muted?: boolean;
}

/** Balkenliste: Name, dünner Balken ab gemeinsamer Grundlinie, Wert an der Spitze */
function bars(rows: BarRow[]): string {
  return `<div class="bars">${rows
    .map(
      (row) =>
        `<div class="bar-row" data-tip="${esc(row.tip)}"><span class="bar-label">${esc(row.label)}</span><span class="bar-track"><span class="bar${
          row.muted ? ' bar-muted' : ''
        }" style="--v:${Math.max(0, Math.min(1, row.size)).toFixed(4)}"></span><span class="bar-value">${esc(
          row.value,
        )}${row.detail ? ` <span class="bar-detail">${esc(row.detail)}</span>` : ''}</span></span></div>`,
    )
    .join('')}</div>`;
}

/** Balkenliste aus Anteilen; Balkenlänge relativ zum grössten Anteil */
function shareBars(shares: Share[], base: number, mutedKeys: string[] = []): string {
  const max = Math.max(...shares.map((share) => share.share), 0.0001);
  return bars(
    shares.map((share) => ({
      label: share.label,
      size: share.share / max,
      value: fmtPct(share.share),
      detail: fmtInt(share.count),
      tip: `${share.label}: ${fmtInt(share.count)} von ${fmtInt(base)} (${fmtPct(share.share, 1)})`,
      muted: mutedKeys.includes(share.key),
    })),
  );
}

const shareTable = (first: string, shares: Share[]): TableData => ({
  head: [first, 'Anzahl', 'Anteil'],
  rows: shares.map((share) => [share.label, fmtInt(share.count), fmtPct(share.share, 1)]),
});

interface MeterRow {
  label: string;
  /** Füllung 0–1 */
  fill: number;
  value: string;
  tip: string;
}

/** Meter-Liste: je Zeile ein Anteil an 100 %, mit Spur im helleren Ton derselben Farbe */
function meters(rows: MeterRow[]): string {
  return `<div class="meters">${rows
    .map(
      (row) =>
        `<div class="meter-row" data-tip="${esc(row.tip)}"><span class="bar-label">${esc(row.label)}</span><span class="meter"><span class="meter-fill" style="--v:${Math.max(
          0,
          Math.min(1, row.fill),
        ).toFixed(4)}"></span></span><span class="meter-value">${esc(row.value)}</span></div>`,
    )
    .join('')}</div>`;
}

function tile(label: string, value: string, note = ''): string {
  return `<div class="tile"><p class="tile-label">${esc(label)}</p><p class="tile-value">${esc(value)}</p>${
    note ? `<p class="tile-note">${esc(note)}</p>` : ''
  }</div>`;
}

const empty = (text: string) => `<p class="empty">${esc(text)}</p>`;

// ---------------------------------------------------------------- Ampel

/**
 * Rundet für die Anzeige, ohne ein verfehltes Ziel als erreicht zu zeigen: 59,96 bei Ziel 60
 * wird 59,9 und nicht 60,0. Sonst stünde «60 %, Ziel ≥ 60 %, knapp» in der Ampel.
 */
const roundBelowTarget = (value: number, target: number): number => {
  const rounded = Math.round(value);
  return value < target && rounded >= target ? Math.floor(value) : rounded;
};

/** Wert und Ziel eines Kriteriums als Text. Anteile mit einer Nachkommastelle. */
export function criterionValue(entry: Criterion): { value: string; target: string } {
  if (entry.unit === 'share') {
    return {
      value:
        entry.value === null
          ? '–'
          : fmtPct(roundBelowTarget(entry.value * 1000, entry.target * 1000) / 1000, 1),
      target: fmtPct(entry.target),
    };
  }
  if (entry.unit === 'chf') {
    return {
      value:
        entry.value === null
          ? 'nicht berechenbar'
          : fmtChf(roundBelowTarget(entry.value, entry.target)),
      target: fmtChf(entry.target),
    };
  }
  return { value: entry.value === null ? '–' : fmtInt(entry.value), target: fmtInt(entry.target) };
}

function ampel(analysis: Analysis): string {
  const met = analysis.criteria.filter((entry) => entry.state === 'met').length;
  const total = analysis.criteria.length;
  const verdict = {
    go: { state: 'met', title: 'Go', text: 'Alle Kriterien sind erfüllt.' },
    almost: {
      state: 'near',
      title: 'Fast',
      text: 'Kein Kriterium ist weit entfernt. Weiter sammeln, dann neu auswerten.',
    },
    'no-go': {
      state: 'missed',
      title: 'No-Go',
      text: 'Mindestens ein Kriterium ist deutlich verfehlt.',
    },
  }[analysis.verdict] as { state: keyof typeof ICONS; title: string; text: string };

  const rows = analysis.criteria
    .map((entry) => {
      const { value, target } = criterionValue(entry);
      const fill = entry.value === null ? 0 : Math.max(0, Math.min(1, entry.value / entry.target));
      return `<div class="ampel-row" data-tip="${esc(`${entry.label}: ${value}, Ziel mindestens ${target}`)}"><span class="ampel-label">${esc(
        entry.label,
      )}</span><span class="meter meter-${entry.state}"><span class="meter-fill" style="--v:${fill.toFixed(
        4,
      )}"></span></span><span class="ampel-figure"><strong>${esc(value)}</strong> <span class="bar-detail">Ziel ≥ ${esc(
        target,
      )}</span></span><span class="state state-${entry.state}">${icon(entry.state, 16)}${
        STATE_TEXT[entry.state]
      }</span></div>`;
    })
    .join('');

  return `<section class="ampel" aria-labelledby="ampel-title"><div class="verdict verdict-${verdict.state}"><p class="eyebrow" id="ampel-title">Go/No-Go-Ampel</p><p class="hero">${icon(
    verdict.state,
    44,
  )}<span>${verdict.title}</span></p><p class="verdict-text">${met} von ${total} Kriterien erfüllt. ${
    verdict.text
  }</p></div><div class="ampel-list">${rows}</div>${table({
    head: ['Kriterium', 'Wert', 'Ziel', 'Stand'],
    rows: analysis.criteria.map((entry) => {
      const { value, target } = criterionValue(entry);
      return [entry.label, value, `mindestens ${target}`, STATE_TEXT[entry.state]];
    }),
  })}</section>`;
}

// ---------------------------------------------------------------- Skalen

const SCALE_HEAD = ['1', '2', '3', '4', '5', 'Antworten', 'Anteil 4 oder 5', 'Mittelwert'];

const scaleCells = (result: ScaleResult): (string | number)[] => [
  ...result.counts.map((count) => fmtInt(count)),
  fmtInt(result.n),
  result.n > 0 ? fmtPct(result.top2, 1) : '–',
  result.mean === null ? '–' : result.mean.toFixed(2).replace('.', ','),
];

function distribution(result: ScaleResult, low: string, high: string): string {
  if (result.n === 0) return empty('Noch keine Antworten.');
  const max = Math.max(...result.counts, 1);
  return bars(
    result.counts.map((count, index) => ({
      label: index === 0 ? `1 (${low})` : index === 4 ? `5 (${high})` : String(index + 1),
      size: count / max,
      value: fmtPct(count / result.n),
      detail: fmtInt(count),
      tip: `Wert ${index + 1}: ${fmtInt(count)} von ${fmtInt(result.n)} (${fmtPct(count / result.n, 1)})`,
    })),
  );
}

// ---------------------------------------------------------------- Preisstufen

function priceCard(title: string, question: string, price: PriceBands): string {
  if (price.n === 0) return card(title, question, empty('Noch keine Antworten.'));
  const max = Math.max(...price.bands.map((band) => band.count), 1);
  const medianKeys = price.median?.keys ?? [];
  const body = `<div class="tiles tiles-inline">${tile(
    'Median-Spanne',
    price.median?.label ?? '–',
    `von ${fmtInt(price.nBands)} mit Preisangabe`,
  )}${tile(
    '«Würde ich nicht buchen»',
    fmtPct(price.notBook.share),
    `${fmtInt(price.notBook.count)} von ${fmtInt(price.n)} Antworten`,
  )}</div>${bars(
    price.bands.map((band) => ({
      label: band.label,
      size: band.count / max,
      value: fmtPct(band.share),
      detail: fmtInt(band.count),
      tip: `${band.label}: ${fmtInt(band.count)} von ${fmtInt(price.n)} (${fmtPct(band.share, 1)})${
        medianKeys.includes(band.key) ? ', Median' : ''
      }`,
      muted: !medianKeys.includes(band.key),
    })),
  )}<p class="legend"><span class="legend-item"><span class="key key-bar"></span>Median-Spanne</span><span class="legend-item"><span class="key key-bar key-muted"></span>übrige Preisstufen</span></p>`;
  return card(title, question, body, {
    head: ['Preisstufe', 'Anzahl', 'Anteil'],
    rows: [
      ...price.bands.map((band) => [band.label, fmtInt(band.count), fmtPct(band.share, 1)]),
      ['Würde ich nicht buchen', fmtInt(price.notBook.count), fmtPct(price.notBook.share, 1)],
    ],
  });
}

// ---------------------------------------------------------------- Van Westendorp

const VW_SERIES: { key: VwCurve; label: string; color: string }[] = [
  { key: 'tooCheap', label: 'zu günstig', color: '#2a78d6' },
  { key: 'cheap', label: 'günstig', color: '#008300' },
  { key: 'expensive', label: 'teuer', color: '#eda100' },
  { key: 'tooExpensive', label: 'zu teuer', color: '#e87ba4' },
];

const niceStep = (rough: number): number => {
  const steps = [5, 10, 20, 25, 50, 100, 200, 250, 500, 1000, 2000, 2500, 5000, 10000];
  return steps.find((step) => step >= rough) ?? 10000;
};

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const overlaps = (a: Box, b: Box) =>
  a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

/** Schneidet die Strecke das Rechteck? (Liang-Barsky) */
function segmentHitsBox(x1: number, y1: number, x2: number, y2: number, box: Box): boolean {
  let t0 = 0;
  let t1 = 1;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const edges: [number, number][] = [
    [-dx, x1 - box.x],
    [dx, box.x + box.w - x1],
    [-dy, y1 - box.y],
    [dy, box.y + box.h - y1],
  ];
  for (const [p, q] of edges) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const r = q / p;
    if (p < 0) {
      if (r > t1) return false;
      if (r > t0) t0 = r;
    } else {
      if (r < t0) return false;
      if (r < t1) t1 = r;
    }
  }
  return true;
}

function vwChart(vw: VanWestendorpResult): { body: string; script: string; tableData?: TableData } {
  if (vw.n < 2 || vw.points.length < 2) {
    return { body: empty('Zu wenige Antworten für Preiskurven.'), script: '' };
  }
  const W = 760;
  const H = 400;
  const M = { l: 46, r: 18, t: 16, b: 62 };
  const pw = W - M.l - M.r;
  const ph = H - M.t - M.b;

  // Wertebereich: von dort, wo die ersten «nicht mehr zu günstig» sagen, bis dorthin, wo fast
  // alle «zu teuer» sagen. Die flachen Enden davor und danach tragen nichts bei.
  const first = vw.points[0] as VwPoint;
  const last = vw.points[vw.points.length - 1] as VwPoint;
  const head =
    [...vw.points].reverse().find((point) => point.tooCheap >= 0.97)?.price ?? first.price;
  const tail = vw.points.find((point) => point.tooExpensive >= 0.97)?.price ?? last.price;
  const hi = Math.max(tail, (vw.upper ?? 0) * 1.15);
  const lo = Math.max(0, Math.min(head, (vw.lower ?? head) * 0.85));
  const step = niceStep((hi - lo) / 7);
  const x0 = Math.floor(lo / step) * step;
  const x1 = Math.max(Math.ceil(hi / step) * step, x0 + step);
  const x = (price: number) => M.l + ((price - x0) / (x1 - x0)) * pw;
  const y = (share: number) => M.t + (1 - share) * ph;

  // Kurven über den ganzen Bereich: vor dem ersten Preis 100 % bzw. 0 %, danach umgekehrt
  const points: VwPoint[] = [
    ...(x0 < first.price
      ? [{ price: x0, tooCheap: 1, cheap: 1, expensive: 0, tooExpensive: 0 }]
      : []),
    ...vw.points,
    ...(x1 > last.price
      ? [{ price: x1, tooCheap: 0, cheap: 0, expensive: 1, tooExpensive: 1 }]
      : []),
  ];
  const path = (key: VwCurve) =>
    points.map((point) => `${x(point.price).toFixed(1)},${y(point[key]).toFixed(1)}`).join(' ');

  const ticksX: number[] = [];
  for (let value = x0; value <= x1 + 1e-9; value += step) ticksX.push(value);
  const grid = [0, 0.25, 0.5, 0.75, 1]
    .map(
      (share) =>
        `<line class="gridline" x1="${M.l}" x2="${W - M.r}" y1="${y(share)}" y2="${y(share)}"/><text class="tick" x="${
          M.l - 8
        }" y="${y(share) + 4}" text-anchor="end">${share * 100}${NBSP}%</text>`,
    )
    .join('');
  const axis = ticksX
    .map(
      (value) =>
        `<text class="tick" x="${x(value).toFixed(1)}" y="${M.t + ph + 18}" text-anchor="middle">${fmtInt(value)}</text>`,
    )
    .join('');

  // Akzeptierter Bereich als Fläche; Bereich und optimaler Preis stehen gemeinsam unter der Achse
  let band = '';
  const optimalText = vw.optimal !== null ? `optimal: ${fmtChf(whole(vw.optimal))}` : '';
  const noteAt = (center: number, text: string) => {
    const half = (text.length * 7.4) / 2;
    const cx = Math.max(M.l + half, Math.min(W - M.r - half, center));
    return `<text class="note" x="${cx.toFixed(1)}" y="${M.t + ph + 52}" text-anchor="middle">${esc(text)}</text>`;
  };
  if (vw.lower !== null && vw.upper !== null && vw.upper > vw.lower) {
    const xa = x(vw.lower);
    const xb = x(vw.upper);
    const text = `akzeptiert: ${fmtChf(whole(vw.lower))} bis ${fmtInt(whole(vw.upper))}${
      optimalText ? ` · ${optimalText}` : ''
    }`;
    const tick =
      vw.optimal !== null && vw.optimal >= vw.lower && vw.optimal <= vw.upper
        ? `M${x(vw.optimal).toFixed(1)} ${M.t + ph + 32}v8`
        : '';
    band = `<rect class="band" x="${xa.toFixed(1)}" y="${M.t}" width="${(xb - xa).toFixed(1)}" height="${ph}"/><path class="bracket" d="M${xa.toFixed(
      1,
    )} ${M.t + ph + 30}v6H${xb.toFixed(1)}v-6${tick}"/>${noteAt((xa + xb) / 2, text)}`;
  } else if (vw.optimal !== null) {
    band = `<path class="bracket" d="M${x(vw.optimal).toFixed(1)} ${M.t + ph + 30}v8"/>${noteAt(
      x(vw.optimal),
      optimalText,
    )}`;
  }

  // Beschriftung direkt an den Kurven: nur dort, wo sie nichts verdeckt
  const placed: Box[] = [];
  const allSegments: [number, number, number, number][] = [];
  for (const series of VW_SERIES) {
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1] as VwPoint;
      const b = points[index] as VwPoint;
      allSegments.push([x(a.price), y(a[series.key]), x(b.price), y(b[series.key])]);
    }
  }
  const free = (box: Box) =>
    box.x >= M.l + 2 &&
    box.x + box.w <= W - M.r - 2 &&
    box.y >= M.t + 2 &&
    box.y + box.h <= M.t + ph - 2 &&
    !placed.some((other) => overlaps(box, other)) &&
    !allSegments.some((segment) => segmentHitsBox(...segment, box));
  const crossingAt = (key: VwCurve, level: number): { px: number; py: number } | null => {
    for (let index = 1; index < points.length; index++) {
      const a = points[index - 1] as VwPoint;
      const b = points[index] as VwPoint;
      const va = a[key];
      const vb = b[key];
      if ((va - level) * (vb - level) <= 0 && va !== vb) {
        const t = (level - va) / (vb - va);
        return { px: x(a.price + (b.price - a.price) * t), py: y(level) };
      }
    }
    return null;
  };
  const KEY = 16; // Farbschlüssel vor dem Text: kurzer Strich in der Farbe der Kurve
  const place = (text: string, color: string, anchors: { px: number; py: number }[]): string => {
    const w = text.length * 6.7 + 8 + KEY;
    const h = 18;
    for (const anchor of anchors) {
      const candidates: Box[] = [
        { x: anchor.px + 8, y: anchor.py - h / 2, w, h },
        { x: anchor.px - 8 - w, y: anchor.py - h / 2, w, h },
      ];
      for (const candidate of candidates) {
        if (!free(candidate)) continue;
        placed.push(candidate);
        const kx = candidate.x + 2;
        return `<line class="label-key" stroke="${color}" x1="${kx.toFixed(1)}" x2="${(
          kx + 10
        ).toFixed(
          1,
        )}" y1="${anchor.py.toFixed(1)}" y2="${anchor.py.toFixed(1)}"/><text class="label" x="${(
          kx + KEY
        ).toFixed(1)}" y="${(anchor.py + 4).toFixed(1)}">${esc(text)}</text>`;
      }
    }
    return '';
  };

  let optimal = '';
  if (vw.optimal !== null) {
    const share = interpolate(points, 'tooCheap', vw.optimal);
    const px = x(vw.optimal);
    const py = y(share);
    placed.push({ x: px - 8, y: py - 8, w: 16, h: 16 });
    optimal = `<circle class="optimal" cx="${px.toFixed(1)}" cy="${py.toFixed(1)}" r="5"/>`;
  }
  const levels = [0.5, 0.35, 0.65, 0.2, 0.8, 0.1, 0.9];
  const labels = VW_SERIES.map((series) =>
    place(
      series.label,
      series.color,
      levels
        .map((level) => crossingAt(series.key, level))
        .filter((anchor): anchor is { px: number; py: number } => anchor !== null),
    ),
  ).join('');

  const lines = VW_SERIES.map(
    (series) => `<polyline class="line" stroke="${series.color}" points="${path(series.key)}"/>`,
  ).join('');
  const legend = `<p class="legend">${VW_SERIES.map(
    (series) =>
      `<span class="legend-item"><span class="key key-line" style="--c:${series.color}"></span>${esc(
        series.label,
      )}</span>`,
  ).join('')}</p>`;

  const summary = `Preiskurven für das Setup-Paket aus ${fmtInt(vw.n)} Antworten. ${
    vw.lower !== null && vw.upper !== null
      ? `Akzeptierter Bereich ${fmtChf(whole(vw.lower))} bis ${fmtChf(whole(vw.upper))}.`
      : 'Der akzeptierte Bereich ist nicht berechenbar.'
  } ${vw.optimal !== null ? `Optimaler Preis ${fmtChf(whole(vw.optimal))}.` : ''}`;

  const body = `${legend}<div class="vw" tabindex="0" role="group" aria-label="${esc(
    `${summary} Mit den Pfeiltasten lassen sich die Werte je Preis ablesen.`,
  )}" data-vw><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(summary)}"><defs><clipPath id="vw-clip"><rect x="${
    M.l
  }" y="${M.t - 2}" width="${pw}" height="${ph + 4}"/></clipPath></defs>${grid}${band}<line class="axis" x1="${
    M.l
  }" x2="${W - M.r}" y1="${M.t + ph}" y2="${M.t + ph}"/>${axis}<text class="tick" x="${W - M.r}" y="${
    M.t + ph + 18
  }" text-anchor="end" dx="0" dy="14">Preis in CHF</text><g clip-path="url(#vw-clip)">${lines}</g>${optimal}${labels}<line class="crosshair" data-vw-crosshair x1="0" x2="0" y1="${
    M.t
  }" y2="${M.t + ph}" hidden/><rect class="hit" data-vw-hit x="${M.l}" y="${M.t}" width="${pw}" height="${ph}"/></svg></div>`;

  const inside = points.filter((point) => point.price >= x0 && point.price <= x1);
  const data = {
    x0,
    x1,
    left: M.l,
    width: pw,
    viewWidth: W,
    series: VW_SERIES.map((series) => ({ label: series.label, color: series.color })),
    points: inside.map((point) => [
      point.price,
      ...VW_SERIES.map((series) => Math.round(point[series.key] * 1000) / 10),
    ]),
  };
  const script = `<script type="application/json" id="vw-data">${JSON.stringify(data).replace(
    /</g,
    '\\u003c',
  )}</script>`;

  return {
    body,
    script,
    tableData: {
      head: ['Preis in CHF', ...VW_SERIES.map((series) => series.label)],
      rows: inside.map((point) => [
        fmtInt(point.price),
        ...VW_SERIES.map((series) => fmtPct(point[series.key], 1)),
      ]),
    },
  };
}

/** Wert einer Kurve an einem beliebigen Preis (linear zwischen den Stützpunkten) */
function interpolate(points: VwPoint[], key: VwCurve, price: number): number {
  for (let index = 1; index < points.length; index++) {
    const a = points[index - 1] as VwPoint;
    const b = points[index] as VwPoint;
    if (price >= a.price && price <= b.price) {
      const t = b.price === a.price ? 0 : (price - a.price) / (b.price - a.price);
      return a[key] + (b[key] - a[key]) * t;
    }
  }
  return points[points.length - 1]?.[key] ?? 0;
}

/** Freitexte: die ersten zehn direkt, weitere aufklappbar (alles maskiert ausgegeben) */
function worryList(texts: string[]): string {
  const items = (part: string[]) =>
    `<ul class="worries">${part.map((text) => `<li>${esc(text)}</li>`).join('')}</ul>`;
  const rest = texts.slice(10);
  return `${items(texts.slice(0, 10))}${
    rest.length > 0
      ? `<details class="table-view"><summary>${fmtInt(rest.length)} weitere anzeigen</summary>${items(rest)}</details>`
      : ''
  }`;
}

// ---------------------------------------------------------------- Seite

// ---------------------------------------------------------------- Reichweite

/** 2026-12-21 → 21.12. */
const fmtDayShort = (day: string): string => {
  const match = /^\d{4}-(\d{2})-(\d{2})$/.exec(day);
  return match ? `${match[2]}.${match[1]}.` : day;
};

/** Runde Obergrenze für die Achse: 1, 2 oder 5 mal eine Zehnerpotenz */
export function niceCeil(value: number): number {
  if (!(value > 0)) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  const lead = value / power;
  return (lead <= 1 ? 1 : lead <= 2 ? 2 : lead <= 5 ? 5 : 10) * power;
}

/**
 * Verlauf der Seitenaufrufe je Tag: eine Linie, zurückhaltende Achsen, je Tag eine Trefferfläche
 * mit Tooltip. Eine Reihe braucht keine Legende; der Titel der Karte nennt sie.
 */
function dayChart(days: ReachDay[]): string {
  const width = 720;
  const height = 240;
  const left = 44;
  const right = 18;
  const top = 14;
  const bottom = 30;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const max = niceCeil(Math.max(...days.map((day) => day.views)));
  const step = plotWidth / Math.max(1, days.length - 1);
  const x = (index: number) => left + index * step;
  const y = (value: number) => top + (1 - value / max) * plotHeight;

  // Nur ganze Zahlen an der Achse: Halbe Seitenaufrufe gibt es nicht.
  const ticks = max % 2 === 0 ? [0, max / 2, max] : [0, max];
  const grid = ticks
    .map(
      (tick) =>
        `<line class="${tick === 0 ? 'axis' : 'gridline'}" x1="${left}" x2="${width - right}" y1="${y(tick).toFixed(1)}" y2="${y(tick).toFixed(1)}"/><text class="tick" x="${left - 8}" y="${(y(tick) + 4).toFixed(1)}" text-anchor="end">${esc(fmtInt(tick))}</text>`,
    )
    .join('');

  // Höchstens sechs Daten an der Achse, immer das erste und das letzte.
  const labelCount = Math.min(6, days.length);
  const labelled = new Set(
    Array.from({ length: labelCount }, (_, index) =>
      Math.round((index * (days.length - 1)) / Math.max(1, labelCount - 1)),
    ),
  );
  const labels = days
    .map((day, index) =>
      labelled.has(index)
        ? `<text class="tick" x="${x(index).toFixed(1)}" y="${height - 8}" text-anchor="${
            index === 0 ? 'start' : index === days.length - 1 ? 'end' : 'middle'
          }">${esc(fmtDayShort(day.day))}</text>`
        : '',
    )
    .join('');

  const path = days
    .map(
      (day, index) => `${index === 0 ? 'M' : 'L'}${x(index).toFixed(1)} ${y(day.views).toFixed(1)}`,
    )
    .join(' ');
  // Punkte nur, solange sie sich nicht drängen.
  const markers =
    days.length <= 31
      ? days
          .map(
            (day, index) =>
              `<circle class="marker" cx="${x(index).toFixed(1)}" cy="${y(day.views).toFixed(1)}" r="4"/>`,
          )
          .join('')
      : '';
  const hits = days
    .map((day, index) => {
      const from = Math.max(left, x(index) - step / 2);
      const to = Math.min(width - right, x(index) + step / 2);
      return `<rect class="hit" x="${from.toFixed(1)}" y="${top}" width="${Math.max(1, to - from).toFixed(1)}" height="${plotHeight}" data-tip="${esc(
        `${fmtDay(day.day)}: ${fmtInt(day.views)} Seitenaufrufe, ${fmtInt(day.visits)} Einstiege`,
      )}"/>`;
    })
    .join('');

  const first = days[0];
  const last = days.at(-1);
  const peak = days.reduce((best, day) => (day.views > best.views ? day : best), days[0]!);
  const summary = `Seitenaufrufe je Tag vom ${fmtDay(first?.day ?? '')} bis ${fmtDay(last?.day ?? '')}. Höchster Wert: ${fmtInt(peak.views)} am ${fmtDay(peak.day)}.`;
  return `<div class="days"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${esc(summary)}">${grid}${labels}<path class="line line-series" d="${path}"/>${markers}${hits}</svg></div>`;
}

/** Balkenliste für Zählwerte: Länge relativ zum grössten Wert, daneben der Anteil an der Summe */
function countBars(items: ReachItem[], unit: string): string {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const max = Math.max(...items.map((item) => item.count), 1);
  return bars(
    items.map((item) => ({
      label: item.label,
      size: item.count / max,
      value: fmtInt(item.count),
      detail: total > 0 ? fmtPct(item.count / total) : '',
      tip: `${item.label}: ${fmtInt(item.count)} ${unit}${
        total > 0 ? ` (${fmtPct(item.count / total, 1)} von ${fmtInt(total)})` : ''
      }`,
    })),
  );
}

const countTable = (first: string, second: string, items: ReachItem[]): TableData => {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  return {
    head: [first, second, 'Anteil'],
    rows: items.map((item) => [
      item.label,
      fmtInt(item.count),
      total > 0 ? fmtPct(item.count / total, 1) : '–',
    ]),
  };
};

function reachSection(reach: ReachSummary, started: number, completed: number): string {
  const heading = `<h2>Reichweite der Websites</h2><p class="lead">Anonyme Tagessummen aus der eigenen Zählung: ohne Cookies, ohne Kennung, ohne Dritte. Nicht mitgezählt sind automatische Abrufe und alle, deren Browser «Global Privacy Control» oder «Do Not Track» sendet. Die Zahlen sind darum eine Untergrenze.</p>`;
  const reached = reach.steps.some((entry) => entry.count > 0);
  if (reach.views === 0 && reach.visits === 0 && reach.clicks === 0 && !reached) {
    return `${heading}${empty('Noch nichts gezählt. Die Zählung beginnt, sobald die Websites unter ihrer eigenen Adresse laufen.')}`;
  }

  const stepMax = Math.max(...reach.steps.map((entry) => entry.count), 1);
  return `${heading}<div class="tiles">${[
    tile('Seitenaufrufe', fmtInt(reach.views), 'alle drei Websites zusammen'),
    tile(
      'Einstiege',
      fmtInt(reach.visits),
      'Aufrufe, die nicht von einer unserer eigenen Seiten kamen',
    ),
    tile('Klicks auf Haupt-Knöpfe', fmtInt(reach.clicks)),
    tile('Kontaktanfragen', fmtInt(reach.contacts), 'gespeicherte Anfragen, ohne Inhalt'),
  ].join('')}</div><div class="grid">${[
    card(
      'Seitenaufrufe je Tag',
      'Alle drei Websites zusammen; Tage ohne Aufruf zählen als null',
      reach.days.length >= 2
        ? dayChart(reach.days)
        : empty('Ein Verlauf erscheint, sobald an zwei Tagen gezählt wurde.'),
      {
        head: ['Tag', 'Seitenaufrufe', 'Einstiege'],
        rows: reach.days.map((day) => [fmtDay(day.day), fmtInt(day.views), fmtInt(day.visits)]),
      },
      true,
    ),
    card(
      'Seitenaufrufe je Seite',
      'Welche Seiten wie oft geöffnet wurden',
      reach.pages.length > 0
        ? countBars(reach.pages, 'Seitenaufrufe')
        : empty('Noch keine Aufrufe.'),
      countTable('Seite', 'Seitenaufrufe', reach.pages),
    ),
    card(
      'Einstiege nach Herkunft',
      'Kennzeichnung im Link (?quelle=), sonst die Art der verweisenden Seite',
      reach.sources.length > 0
        ? countBars(reach.sources, 'Einstiege')
        : empty('Noch keine Einstiege.'),
      countTable('Herkunft', 'Einstiege', reach.sources),
    ),
    card(
      'Einstiege je Seite',
      'Auf welcher Seite jemand angekommen ist',
      reach.landings.length > 0
        ? countBars(reach.landings, 'Einstiege')
        : empty('Noch keine Einstiege.'),
      countTable('Seite', 'Einstiege', reach.landings),
    ),
    card(
      'Klicks auf die Haupt-Knöpfe',
      'Benannt nach dem Platz auf der Seite',
      reach.targets.length > 0 ? countBars(reach.targets, 'Klicks') : empty('Noch keine Klicks.'),
      countTable('Knopf', 'Klicks', reach.targets),
    ),
    card(
      'Umfrage: bis zu welcher Frage',
      `Wie viele jede Frage gesehen haben, in der Reihenfolge der Umfrage. Zum Vergleich: ${fmtInt(started)} gestartet, ${fmtInt(completed)} abgeschlossen. Fragen, die je nach Antwort übersprungen werden, liegen von Natur aus tiefer.`,
      reached
        ? bars(
            reach.steps.map((entry) => ({
              label: entry.label,
              size: entry.count / stepMax,
              value: fmtInt(entry.count),
              detail: entry.share === null ? '' : fmtPct(entry.share),
              tip: `${entry.label}: von ${fmtInt(entry.count)} gesehen${
                entry.share === null ? '' : ` (${fmtPct(entry.share, 1)} von Frage 1)`
              }`,
            })),
          )
        : empty('Noch keine Frage gezählt.'),
      {
        head: ['Frage', 'gesehen', 'Anteil an Frage 1'],
        rows: reach.steps.map((entry) => [
          entry.label,
          fmtInt(entry.count),
          entry.share === null ? '–' : fmtPct(entry.share, 1),
        ]),
      },
      true,
    ),
  ].join('')}</div>`;
}

const STYLE = `
:root{color-scheme:light;--page:#f5f4fd;--surface:#fff;--ink:#22172f;--ink-2:#675e76;--grid:#e7e4f0;--axis:#cfc9de;--series:#6b40c9;--series-track:#e4dcf7;--muted-mark:#a8a2b8;--good:#0ca30c;--warning:#fab219;--critical:#d03b3b;--wash:rgba(107,64,201,.1);--night:#140a29}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--page);color:var(--ink);font:16px/1.5 system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}
.wrap{width:min(100% - 2rem,66rem);margin-inline:auto}
header.top{background:var(--night);color:#fff;padding:1.75rem 0 2rem}
.brand{margin:0 0 1.25rem;line-height:0}
.brand svg{width:auto;height:2.5rem}
.brand .logo-light{display:none}
h1{margin:0;font-size:clamp(1.75rem,1.2rem + 2.4vw,2.75rem);line-height:1.1;letter-spacing:-.02em}
.top p.meta{margin:.75rem 0 0;color:#e7e1fb;max-width:46rem}
.demo{margin:0;padding:.6rem 1rem;background:var(--warning);color:var(--ink);font-weight:700;text-align:center;print-color-adjust:exact;-webkit-print-color-adjust:exact}
main{padding:2rem 0 3rem}
h2{margin:2.75rem 0 .25rem;font-size:1.5rem;line-height:1.2;letter-spacing:-.015em}
h2+p.lead{margin:0 0 1rem;color:var(--ink-2);max-width:46rem}
h3{margin:0;font-size:1.0625rem;line-height:1.3}
.sub{margin:.125rem 0 0;color:var(--ink-2);font-size:.875rem}
.grid{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(min(100%,26rem),1fr))}
.card{margin:0;padding:1.25rem 1.25rem 1rem;border:1px solid rgba(34,23,47,.1);border-radius:16px;background:var(--surface);display:grid;gap:1rem;align-content:start;min-width:0}
.card-wide{grid-column:1/-1}
.ampel{display:grid;gap:1.25rem;padding:1.5rem;border:1px solid rgba(34,23,47,.1);border-radius:16px;background:var(--surface)}
.eyebrow{margin:0;color:var(--ink-2);font-size:.875rem;font-weight:600}
.hero{display:flex;align-items:center;gap:.75rem;margin:.25rem 0 0;font-size:clamp(3rem,2rem + 4vw,4.5rem);font-weight:800;line-height:1;letter-spacing:-.03em}
.verdict-text{margin:.5rem 0 0;max-width:40rem}
.verdict-met .icon{color:var(--good)}.verdict-near .icon{color:#b77900}.verdict-missed .icon{color:var(--critical)}
.ampel-list{display:grid;gap:.75rem}
.ampel-row{display:grid;grid-template-columns:minmax(0,1fr);gap:.25rem .75rem;align-items:center}
.ampel-label{font-weight:600}
.ampel-figure{font-variant-numeric:tabular-nums}
.state{display:inline-flex;align-items:center;gap:.375rem;font-weight:600;font-size:.9375rem}
.state-met .icon{color:var(--good)}.state-near .icon{color:#b77900}.state-missed .icon{color:var(--critical)}
.meter{display:block;height:12px;border-radius:6px;background:var(--series-track);overflow:hidden}
.meter-fill{display:block;height:100%;width:calc(var(--v)*100%);border-radius:6px;background:var(--series)}
.meter-met{background:#d5efd5}.meter-met .meter-fill{background:var(--good)}
.meter-near{background:#fdebc4}.meter-near .meter-fill{background:var(--warning)}
.meter-missed{background:#f6dada}.meter-missed .meter-fill{background:var(--critical)}
.tiles{display:grid;gap:1rem;grid-template-columns:repeat(auto-fit,minmax(11rem,1fr))}
.tiles-inline{gap:.75rem 2rem}
.tiles+.grid{margin-top:1rem}
.tile{min-width:0}
.tiles:not(.tiles-inline) .tile{padding:1rem 1.25rem;border:1px solid rgba(34,23,47,.1);border-radius:16px;background:var(--surface)}
.tile-label{margin:0;color:var(--ink-2);font-size:.875rem}
.tile-value{margin:.125rem 0 0;font-size:1.625rem;font-weight:700;line-height:1.2;letter-spacing:-.01em}
.tiles-inline .tile-value{font-size:1.25rem}
.tile-note{margin:.125rem 0 0;color:var(--ink-2);font-size:.8125rem}
.bars,.meters{display:grid;gap:.5rem}
.bar-row{display:grid;grid-template-columns:minmax(0,11rem) minmax(0,1fr);gap:.75rem;align-items:center}
.bar-label{font-size:.9375rem;line-height:1.3;overflow-wrap:anywhere}
.bar-track{display:flex;align-items:center;gap:.5rem;min-width:0}
.bar{flex:0 0 auto;width:calc((100% - 6.5rem)*var(--v));min-width:2px;height:14px;border-radius:0 4px 4px 0;background:var(--series)}
.bar-muted{background:var(--muted-mark)}
.bar-value{font-weight:600;font-size:.9375rem;white-space:nowrap;font-variant-numeric:tabular-nums}
.bar-detail{color:var(--ink-2);font-weight:400;font-size:.8125rem}
.bar-row:hover .bar,.meter-row:hover .meter-fill,.ampel-row:hover .meter-fill{filter:brightness(1.15)}
.meter-row{display:grid;grid-template-columns:minmax(0,11rem) minmax(0,1fr) auto;gap:.75rem;align-items:center}
.meter-value{font-size:.9375rem;font-variant-numeric:tabular-nums;white-space:nowrap}
.legend{display:flex;flex-wrap:wrap;gap:.375rem 1rem;align-items:center;margin:0;color:var(--ink-2);font-size:.875rem}
.legend-item{display:inline-flex;align-items:center;gap:.375rem}
.key{display:inline-block;flex:none}
.key-line{width:18px;height:0;border-top:3px solid var(--c);border-radius:2px}
.key-bar{width:12px;height:12px;border-radius:3px;background:var(--series)}
.key-muted{background:var(--muted-mark)}
.vw{border-radius:8px;overflow-x:auto}
.vw:focus-visible{outline:3px solid var(--series);outline-offset:4px}
.vw svg{display:block;width:100%;min-width:38rem;height:auto}
svg .gridline{stroke:var(--grid);stroke-width:1}
svg .axis{stroke:var(--axis);stroke-width:1}
svg .tick{fill:var(--ink-2);font-size:12px;font-variant-numeric:tabular-nums}
svg .line{fill:none;stroke-width:2;stroke-linejoin:round;stroke-linecap:round}
svg .band{fill:var(--wash)}
svg .bracket{fill:none;stroke:var(--series);stroke-width:1.5}
svg .note{fill:var(--ink);font-size:13px;font-weight:600}
svg .label{fill:var(--ink);font-size:12.5px;paint-order:stroke;stroke:var(--surface);stroke-width:4px;stroke-linejoin:round}
svg .label-strong{font-weight:700}
svg .label-key{stroke-width:3;stroke-linecap:round}
svg .optimal{fill:var(--ink);stroke:var(--surface);stroke-width:2}
svg .crosshair{stroke:var(--ink);stroke-width:1}
svg [hidden]{display:none}
svg .hit{fill:transparent;cursor:crosshair}
.days{overflow-x:auto}
.days svg{display:block;width:100%;min-width:30rem;height:auto}
.days .hit:hover{fill:var(--wash)}
svg .line-series{stroke:var(--series)}
svg .marker{fill:var(--series);stroke:var(--surface);stroke-width:2}
.table-view{font-size:.875rem}
.table-view summary{display:inline-block;padding:.25rem 0;color:var(--series);font-weight:600;cursor:pointer}
.table-view table{margin-top:.5rem;border-collapse:collapse;width:100%;display:block;overflow-x:auto}
.table-view th,.table-view td{padding:.3rem .75rem .3rem 0;border-bottom:1px solid var(--grid);text-align:left;white-space:nowrap;font-variant-numeric:tabular-nums}
.table-view thead th{color:var(--ink-2);font-weight:600}
.table-view tbody th{font-weight:400;white-space:normal}
.empty{margin:0;color:var(--ink-2)}
.worries{margin:0;padding:0;list-style:none;display:grid;gap:.5rem}
.table-view .worries{margin-top:.5rem;font-size:1rem}
.worries li{padding:.625rem .875rem;border-left:3px solid var(--series-track);background:var(--page);border-radius:0 8px 8px 0;overflow-wrap:anywhere}
footer{padding:1.5rem 0 3rem;color:var(--ink-2);font-size:.875rem}
#tip{position:fixed;z-index:10;max-width:20rem;padding:.4rem .6rem;border-radius:8px;background:var(--ink);color:#fff;font-size:.8125rem;line-height:1.4;pointer-events:none;box-shadow:0 4px 16px rgba(20,10,41,.25)}
#tip[hidden]{display:none}
#tip .row{display:flex;align-items:center;gap:.5rem;white-space:nowrap}
#tip .row b{min-width:3.25rem;text-align:right;font-variant-numeric:tabular-nums}
#tip .row i{display:inline-block;width:12px;border-top:3px solid var(--c);border-radius:2px}
#tip .head{font-weight:700;margin-bottom:.125rem}
@media (min-width:44rem){.ampel-row{grid-template-columns:minmax(0,17rem) minmax(6rem,1fr) minmax(0,13rem) 5.5rem}}
@media print{body{background:#fff}header.top{background:#fff;color:var(--ink)}.brand .logo-dark{display:none}.brand .logo-light{display:inline}.top p.meta{color:var(--ink-2)}.card,.ampel,.tile{break-inside:avoid}.table-view,#tip{display:none}}
`;

const SCRIPT = `
(() => {
  const tip = document.getElementById('tip');
  const move = (x, y) => {
    tip.hidden = false;
    const box = tip.getBoundingClientRect();
    tip.style.left = Math.max(8, Math.min(x + 14, innerWidth - box.width - 8)) + 'px';
    tip.style.top = Math.max(8, y - box.height - 12 < 8 ? y + 18 : y - box.height - 12) + 'px';
  };
  // Balken, Meter, Ampel: der ganze Eintrag ist die Trefferfläche
  document.addEventListener('pointermove', (event) => {
    const mark = event.target.closest('[data-tip]');
    if (!mark) {
      if (!event.target.closest('[data-vw]')) tip.hidden = true;
      return;
    }
    tip.textContent = mark.dataset.tip;
    move(event.clientX, event.clientY);
  });
  document.addEventListener('pointerleave', () => { tip.hidden = true; });

  // Preiskurven: Fadenkreuz rastet am nächsten genannten Preis ein, ein Tooltip für alle Kurven
  const root = document.querySelector('[data-vw]');
  const source = document.getElementById('vw-data');
  if (!root || !source) return;
  const data = JSON.parse(source.textContent);
  const svg = root.querySelector('svg');
  const hair = root.querySelector('[data-vw-crosshair]');
  const hit = root.querySelector('[data-vw-hit]');
  let index = -1;
  const xOf = (price) => data.left + ((price - data.x0) / (data.x1 - data.x0)) * data.width;
  const show = (next, clientX, clientY) => {
    index = Math.max(0, Math.min(data.points.length - 1, next));
    const point = data.points[index];
    const x = xOf(point[0]);
    hair.setAttribute('x1', x);
    hair.setAttribute('x2', x);
    hair.removeAttribute('hidden');
    tip.replaceChildren();
    const head = document.createElement('div');
    head.className = 'head';
    head.textContent = 'CHF\u00a0' + String(Math.round(point[0])).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '’');
    tip.append(head);
    data.series.forEach((series, i) => {
      const row = document.createElement('div');
      row.className = 'row';
      const key = document.createElement('i');
      key.style.setProperty('--c', series.color);
      const value = document.createElement('b');
      value.textContent = point[i + 1].toFixed(1).replace('.', ',') + '\u00a0%';
      const label = document.createElement('span');
      label.textContent = series.label;
      row.append(key, value, label);
      tip.append(row);
    });
    if (clientX === undefined) {
      const rect = svg.getBoundingClientRect();
      move(rect.left + (x / data.viewWidth) * rect.width, rect.top + rect.height * 0.3);
    } else {
      move(clientX, clientY);
    }
  };
  const hide = () => { hair.setAttribute('hidden', ''); tip.hidden = true; index = -1; };
  hit.addEventListener('pointermove', (event) => {
    const rect = svg.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * data.viewWidth;
    const price = data.x0 + ((x - data.left) / data.width) * (data.x1 - data.x0);
    let best = 0;
    data.points.forEach((point, i) => {
      if (Math.abs(point[0] - price) < Math.abs(data.points[best][0] - price)) best = i;
    });
    show(best, event.clientX, event.clientY);
  });
  hit.addEventListener('pointerleave', hide);
  root.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowLeft') {
      event.preventDefault();
      const start = index < 0 ? Math.floor(data.points.length / 2) : index;
      show(start + (event.key === 'ArrowRight' ? 1 : -1));
    } else if (event.key === 'Home') { event.preventDefault(); show(0); }
    else if (event.key === 'End') { event.preventDefault(); show(data.points.length - 1); }
    else if (event.key === 'Escape') hide();
  });
  root.addEventListener('blur', hide);
})();
`;

/** Logo aus dem Logo-Kit, direkt eingebettet: Der Bericht bleibt eine Datei ohne Abhängigkeiten. */
const logo = (name: 'dark' | 'light'): string =>
  readFileSync(new URL(`../../packages/ui/src/brand/logo-${name}.svg`, import.meta.url), 'utf8')
    .trim()
    .replace('<svg ', `<svg class="logo-${name}" width="115" height="40" `);

export function renderReport(analysis: Analysis, generatedAt: Date = new Date()): string {
  const { n, counters } = analysis;
  const stamp = new Intl.DateTimeFormat('de-CH', {
    timeZone: 'Europe/Zurich',
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(generatedAt);
  const period = analysis.period
    ? analysis.period.first === analysis.period.last
      ? fmtDay(analysis.period.first)
      : `${fmtDay(analysis.period.first)} bis ${fmtDay(analysis.period.last)}`
    : '–';
  const vw = vwChart(analysis.setup);
  const completion = counters.started > 0 ? counters.completed / counters.started : null;

  const topics = [...analysis.topics].sort((a, b) => b.result.top2 - a.result.top2);
  const topicMax = Math.max(...topics.map((topic) => topic.result.top2), 0.0001);

  const sections = [
    ampel(analysis),

    `<h2>Überblick</h2><div class="tiles">${[
      tile('Antworten', fmtInt(n), `Zeitraum: ${period}`),
      tile(
        'Abschlussquote',
        completion === null ? '–' : fmtPct(completion),
        `${fmtInt(counters.completed)} von ${fmtInt(counters.started)} gestarteten Umfragen`,
      ),
      tile(
        'Warteliste',
        fmtInt(analysis.waitlist.total),
        `davon ${fmtInt(analysis.waitlist.founding)} Founding Families`,
      ),
      tile(
        'Klickrate Test-Link',
        counters.baitRate === null ? '–' : fmtPct(counters.baitRate),
        `${fmtInt(counters.baitClicks)} Klicks auf ${fmtInt(counters.completed)} Abschlüsse`,
      ),
      tile(
        'Checklisten-Klicks',
        fmtInt(counters.checklistClicks),
        counters.completed > 0
          ? `${fmtPct(counters.checklistClicks / counters.completed)} der Abschlüsse`
          : '',
      ),
    ].join('')}</div>`,

    `<h2>Wer hat geantwortet?</h2><p class="lead">Basis: alle ${fmtInt(n)} Antworten, wenn nicht anders vermerkt.</p><div class="grid">${[
      card(
        'Antworten nach Quelle',
        'Über welchen Kanal die Umfrage geöffnet wurde',
        n > 0 ? shareBars(analysis.bySource, n) : empty('Noch keine Antworten.'),
        shareTable('Quelle', analysis.bySource),
      ),
      card(
        'Antworten nach Fokus',
        'Vorauswahl aus «Der erste Schritt» auf psyber.tech',
        n > 0 ? shareBars(analysis.byFocus, n, ['ohne']) : empty('Noch keine Antworten.'),
        shareTable('Fokus', analysis.byFocus),
      ),
      card(
        'Wohnort',
        `Frage 1. Kanton Zürich zusammen: ${fmtPct(analysis.zurichShare)}`,
        n > 0 ? shareBars(analysis.byRegion, n) : empty('Noch keine Antworten.'),
        shareTable('Wohnort', analysis.byRegion),
      ),
      card(
        'Haushalt',
        'Frage 2, Mehrfachauswahl: Anteil der Haushalte',
        n > 0 ? shareBars(analysis.household, n) : empty('Noch keine Antworten.'),
        shareTable('Im Haushalt', analysis.household),
      ),
      card(
        'Sorge um Eltern oder Grosseltern',
        `Frage 3, freiwillig: ${fmtInt(analysis.caresForParents.n)} Antworten`,
        analysis.caresForParents.n > 0
          ? shareBars(analysis.caresForParents.shares, analysis.caresForParents.n)
          : empty('Noch keine Antworten.'),
        shareTable('Antwort', analysis.caresForParents.shares),
      ),
      card(
        'Erfahrung mit Online-Betrug',
        `Frage 5, freiwillig: ${fmtInt(analysis.experience.n)} Antworten`,
        analysis.experience.n > 0
          ? shareBars(analysis.experience.shares, analysis.experience.n)
          : empty('Noch keine Antworten.'),
        shareTable('Antwort', analysis.experience.shares),
      ),
    ].join('')}</div>`,

    `<h2>Selbsteinschätzung und Interesse</h2><div class="grid">${[
      card(
        'Wie sicher fühlen Sie sich, Online-Betrug zu erkennen?',
        `Frage 4, Skala 1 bis 5. Mittelwert ${
          analysis.selfAssessment.mean === null
            ? '–'
            : analysis.selfAssessment.mean.toFixed(2).replace('.', ',')
        }`,
        distribution(analysis.selfAssessment, 'gar nicht', 'sehr sicher'),
        { head: SCALE_HEAD, rows: [scaleCells(analysis.selfAssessment)] },
      ),
      card(
        'Interesse je Thema',
        `Frage 6: Anteil mit 4 oder 5. Bei mindestens einem Thema: ${fmtPct(analysis.anyTopicShare)}`,
        n > 0
          ? bars(
              topics.map((topic) => ({
                label: topic.label,
                size: topic.result.top2 / topicMax,
                value: fmtPct(topic.result.top2),
                detail: `${fmtInt(topic.result.counts[3] + topic.result.counts[4])} von ${fmtInt(topic.result.n)}`,
                tip: `${topic.label}: ${fmtPct(topic.result.top2, 1)} mit 4 oder 5 (${fmtInt(
                  topic.result.counts[3] + topic.result.counts[4],
                )} von ${fmtInt(topic.result.n)})`,
              })),
            )
          : empty('Noch keine Antworten.'),
        {
          head: ['Thema', ...SCALE_HEAD],
          rows: topics.map((topic) => [topic.label, ...scaleCells(topic.result)]),
        },
      ),
      card(
        'Formate',
        'Frage 7, Mehrfachauswahl: Anteil der Befragten',
        n > 0 ? shareBars(analysis.formats, n) : empty('Noch keine Antworten.'),
        shareTable('Format', analysis.formats),
      ),
      card(
        'Abo-Bausteine',
        'Fragen 8 und 9, freiwillig: Anteil mit 4 oder 5',
        analysis.whatsappCheck.n + analysis.monitoring.n > 0
          ? meters([
              {
                label: '«Ist das echt?»-Check per WhatsApp: nützlich',
                fill: analysis.whatsappCheck.top2,
                value: analysis.whatsappCheck.n > 0 ? fmtPct(analysis.whatsappCheck.top2) : '–',
                tip: `Frage 8: ${fmtPct(analysis.whatsappCheck.top2, 1)} mit 4 oder 5 (${fmtInt(
                  analysis.whatsappCheck.n,
                )} Antworten)`,
              },
              {
                label: 'Überwachung der Computer durch eine Fachperson: wohl dabei',
                fill: analysis.monitoring.top2,
                value: analysis.monitoring.n > 0 ? fmtPct(analysis.monitoring.top2) : '–',
                tip: `Frage 9: ${fmtPct(analysis.monitoring.top2, 1)} mit 4 oder 5 (${fmtInt(
                  analysis.monitoring.n,
                )} Antworten)`,
              },
            ])
          : empty('Noch keine Antworten.'),
        {
          head: ['Frage', ...SCALE_HEAD],
          rows: [
            ['Frage 8: WhatsApp-Check', ...scaleCells(analysis.whatsappCheck)],
            ['Frage 9: Überwachung', ...scaleCells(analysis.monitoring)],
          ],
        },
      ),
    ].join('')}</div>`,

    `<h2>Preise</h2><p class="lead">Alle Preisfragen sind freiwillig. Die Median-Spanne ist die mittlere gewählte Preisstufe unter allen, die eine Stufe gewählt haben.</p><div class="grid">${[
      card(
        'Setup-Paket: Preiskurven nach Van Westendorp',
        `Frage 11: ${fmtInt(analysis.setup.n)} vollständige Antworten. Anteil der Befragten, die einen Preis so einschätzen.`,
        `<div class="tiles tiles-inline">${[
          tile(
            'Akzeptierter Preisbereich',
            analysis.setup.lower !== null && analysis.setup.upper !== null
              ? `${fmtChf(whole(analysis.setup.lower))} bis ${fmtInt(whole(analysis.setup.upper))}`
              : '–',
            '«zu günstig» trifft «teuer» bis «günstig» trifft «zu teuer»',
          ),
          tile(
            'Optimaler Preis',
            analysis.setup.optimal === null ? '–' : fmtChf(whole(analysis.setup.optimal)),
            '«zu günstig» trifft «zu teuer»',
          ),
        ].join('')}</div>${vw.body}`,
        vw.tableData,
        true,
      ),
      priceCard(
        'Session zu Hause',
        'Frage 10: 90 Minuten mit Quick-Check und Notfallkarte',
        analysis.priceSession,
      ),
      priceCard(
        'Abo pro Monat',
        'Frage 12: Check per WhatsApp, Fernwartung, Check-up',
        analysis.priceAbo,
      ),
      priceCard(
        'Abo mit Frühwarnsystem pro Monat',
        'Frage 13: zusätzlich Frühwarnsystem, Grosseltern inklusive',
        analysis.priceAboPlus,
      ),
    ].join('')}</div>`,

    `<h2>Was zählt</h2><div class="grid">${[
      card(
        'Am wichtigsten bei so einem Angebot',
        `Frage 14, höchstens zwei Antworten: ${fmtInt(analysis.priorities.n)} Befragte`,
        analysis.priorities.n > 0
          ? shareBars(analysis.priorities.shares, analysis.priorities.n)
          : empty('Noch keine Antworten.'),
        shareTable('Antwort', analysis.priorities.shares),
      ),
      card(
        'Grösste Sorge im digitalen Familienalltag',
        `Frage 15, Freitext: ${fmtInt(analysis.worries.length)} Antworten`,
        analysis.worries.length > 0 ? worryList(analysis.worries) : empty('Noch keine Antworten.'),
      ),
    ].join('')}</div>`,

    `<h2>Test-Link nach der Umfrage</h2><p class="lead">Gezählt werden nur anonyme Tagessummen, getrennt nach der Selbsteinschätzung aus Frage 4. Wer geklickt hat, ist nicht bekannt.</p><div class="grid">${card(
      'Klickrate je Selbsteinschätzung',
      'Klicks auf den Test-Link geteilt durch abgeschlossene Umfragen',
      counters.completed > 0
        ? meters([
            {
              label: 'Gesamt',
              fill: counters.baitRate ?? 0,
              value: `${fmtPct(counters.baitRate ?? 0)} (${fmtInt(counters.baitClicks)} von ${fmtInt(counters.completed)})`,
              tip: `Gesamt: ${fmtInt(counters.baitClicks)} Klicks auf ${fmtInt(counters.completed)} Abschlüsse`,
            },
            ...counters.bySelfAssessment.map((entry) => ({
              label:
                entry.s === 1
                  ? '1 (gar nicht sicher)'
                  : entry.s === 5
                    ? '5 (sehr sicher)'
                    : String(entry.s),
              fill: entry.rate ?? 0,
              value:
                entry.rate === null
                  ? 'keine Abschlüsse'
                  : `${fmtPct(entry.rate)} (${fmtInt(entry.clicks)} von ${fmtInt(entry.completed)})`,
              tip: `Selbsteinschätzung ${entry.s}: ${fmtInt(entry.clicks)} Klicks auf ${fmtInt(entry.completed)} Abschlüsse`,
            })),
          ])
        : empty('Noch keine abgeschlossenen Umfragen gezählt.'),
      {
        head: ['Selbsteinschätzung', 'Abschlüsse', 'Klicks', 'Klickrate'],
        rows: [
          [
            'Gesamt',
            fmtInt(counters.completed),
            fmtInt(counters.baitClicks),
            counters.baitRate === null ? '–' : fmtPct(counters.baitRate, 1),
          ],
          ...counters.bySelfAssessment.map((entry) => [
            String(entry.s),
            fmtInt(entry.completed),
            fmtInt(entry.clicks),
            entry.rate === null ? '–' : fmtPct(entry.rate, 1),
          ]),
          ['ohne Angabe', '–', fmtInt(counters.clicksWithoutS), '–'],
        ],
      },
      true,
    )}</div>`,

    reachSection(analysis.reach, counters.started, counters.completed),
  ];

  return `<!doctype html>
<html lang="de-CH">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<title>PSYber Umfrage: Auswertung vom ${esc(fmtDay(analysis.exportedDay))}${
    analysis.demo ? ' (Demo)' : analysis.local ? ' (Testdaten)' : ''
  }</title>
<style>${STYLE}</style>
</head>
<body>
<header class="top"><div class="wrap">
<p class="brand">${logo('dark')}${logo('light')}</p>
<h1>Umfrage: Auswertung</h1>
<p class="meta">Stand der Daten: ${esc(fmtDay(analysis.exportedDay))}. ${fmtInt(n)} Antworten${
    analysis.period ? `, eingegangen ${esc(period)}` : ''
  }. Erstellt am ${esc(stamp)} mit <code>pnpm analyze</code>.</p>
</div></header>
${analysis.demo ? '<p class="demo">Demo: Diese Zahlen sind frei erfunden und kein Ergebnis der Umfrage.</p>' : ''}${
    analysis.local
      ? '<p class="demo">Testdaten: Dieser Bericht stammt aus der lokalen Datenbank, nicht aus der Umfrage.</p>'
      : ''
  }
<main class="wrap">
${sections.join('\n')}
</main>
<footer><div class="wrap">Dieser Bericht enthält keine E-Mail-Adressen und keine Kontaktanfragen. Die Antworten sind anonym; Freitexte können trotzdem Persönliches enthalten. Bitte vertraulich behandeln.</div></footer>
<div id="tip" hidden></div>
${vw.script}
<script>${SCRIPT}</script>
</body>
</html>
`;
}
