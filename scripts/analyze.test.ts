import { describe, expect, it } from 'vitest';
import {
  analyze,
  counterSummary,
  countMulti,
  countSingle,
  crossing,
  parseExport,
  priceBands,
  scale,
  vanWestendorp,
  type ExportData,
  type ResponseRow,
} from './analyze/compute.ts';
import { demoExport } from './analyze/demo.ts';
import {
  criterionValue,
  esc,
  fmtChf,
  fmtDay,
  fmtInt,
  fmtPct,
  renderReport,
} from './analyze/report.ts';

const NBSP = ' ';

/** Eine vollständige Antwort; einzelne Felder lassen sich überschreiben. */
function row(overrides: Partial<ResponseRow> = {}): ResponseRow {
  return {
    created_day: '2026-12-01',
    quelle: 'website',
    fokus: null,
    q1: 'stadt_zh',
    q2: '["erwachsene"]',
    q3: null,
    q4: 3,
    q5: null,
    q6: JSON.stringify({
      phishing: 3,
      anlagebetrug: 3,
      romance: 3,
      cybermobbing: 3,
      heimnetz: 3,
      privatsphaere: 3,
    }),
    q7: '["webinar"]',
    q8: null,
    q9: null,
    q10: null,
    q11_a: null,
    q11_b: null,
    q11_c: null,
    q11_d: null,
    q12: null,
    q13: null,
    q14: null,
    q15: null,
    ...overrides,
  };
}

const exportOf = (responses: ResponseRow[], extra: Partial<ExportData> = {}): ExportData => ({
  exportedDay: '2026-12-21',
  responses,
  counters: [],
  waitlist: { total: 0, founding: 0 },
  ...extra,
});

describe('parseExport', () => {
  it('liest das Format von «pnpm export»', () => {
    const data = parseExport({
      exportedDay: '2026-12-21',
      responses: [row()],
      counters: [{ event: 'bait_click', s_bucket: '4', day: '2026-12-01', count: '2' }],
      waitlist: { total: 7, founding: 2 },
    });
    expect(data.responses).toHaveLength(1);
    expect(data.counters[0]).toEqual({
      event: 'bait_click',
      s_bucket: 4,
      day: '2026-12-01',
      count: 2,
    });
    expect(data.waitlist).toEqual({ total: 7, founding: 2 });
    expect(data.demo).toBe(false);
    expect(data.local).toBe(false);
  });

  it('erkennt den Export der lokalen Testdatenbank', () => {
    const base = { exportedDay: '2026-12-21', responses: [], counters: [], waitlist: {} };
    expect(parseExport({ ...base, source: 'local' }).local).toBe(true);
    expect(parseExport({ ...base, source: 'remote' }).local).toBe(false);
  });

  it('liest die rohe Ausgabe von wrangler (drei Ergebnisse)', () => {
    const data = parseExport(
      [{ results: [row()] }, { results: [] }, { results: [{ total: 3, founding: 1 }] }],
      '2026-12-05',
    );
    expect(data.exportedDay).toBe('2026-12-05');
    expect(data.responses).toHaveLength(1);
    expect(data.waitlist).toEqual({ total: 3, founding: 1 });
  });

  it('lehnt alles andere mit einer klaren Meldung ab', () => {
    expect(() => parseExport({ foo: 1 })).toThrow(/responses/);
    expect(() => parseExport([{ results: [] }])).toThrow(/drei Ergebnisse/);
    expect(() => parseExport('nichts')).toThrow();
  });
});

describe('Zählen', () => {
  it('zählt Einfachantworten und sortiert nach Häufigkeit', () => {
    const shares = countSingle(['a', 'b', 'a', null, ''], { a: 'Alpha', b: 'Beta' }, 4);
    expect(shares).toEqual([
      { key: 'a', label: 'Alpha', count: 2, share: 0.5 },
      { key: 'b', label: 'Beta', count: 1, share: 0.25 },
    ]);
  });

  it('behält auf Wunsch die Reihenfolge der Umfrage und zeigt leere Optionen', () => {
    const shares = countSingle(['b'], { a: 'Alpha', b: 'Beta' }, 1, { keepOrder: true });
    expect(shares.map((share) => [share.key, share.count])).toEqual([
      ['a', 0],
      ['b', 1],
    ]);
  });

  it('zählt Mehrfachantworten pro Person nur einmal', () => {
    const shares = countMulti([['x', 'y'], ['x', 'x'], []], { x: 'X', y: 'Y' }, 3);
    expect(shares[0]).toMatchObject({ key: 'x', count: 2 });
    expect(shares[0]?.share).toBeCloseTo(2 / 3);
    expect(shares[1]).toMatchObject({ key: 'y', count: 1 });
  });

  it('wertet Skalen aus: Verteilung, Anteil 4 oder 5, Mittelwert', () => {
    const result = scale([1, 4, 5, 5, null, 9, 2.5]);
    expect(result.counts).toEqual([1, 0, 0, 1, 2]);
    expect(result.n).toBe(4);
    expect(result.top2).toBe(0.75);
    expect(result.mean).toBe(3.75);
    expect(scale([]).mean).toBeNull();
  });
});

describe('Preisstufen', () => {
  const labels = {
    tief: 'bis 99',
    mittel: '100–199',
    hoch: 'ab 200',
    nicht_buchen: 'Würde ich nicht buchen',
  };

  it('findet die Median-Spanne und den Anteil «Würde ich nicht buchen»', () => {
    const result = priceBands(['tief', 'mittel', 'mittel', 'hoch', 'nicht_buchen', null], labels);
    expect(result.n).toBe(5);
    expect(result.nBands).toBe(4);
    expect(result.median).toEqual({ keys: ['mittel'], label: '100–199' });
    expect(result.notBook).toEqual({ count: 1, share: 0.2 });
    expect(result.bands.map((band) => band.count)).toEqual([1, 2, 1]);
  });

  it('nennt zwei Stufen, wenn die Mitte genau dazwischen liegt', () => {
    const result = priceBands(['tief', 'tief', 'hoch', 'hoch'], labels);
    expect(result.median).toEqual({ keys: ['tief', 'hoch'], label: 'bis 99 bis ab 200' });
  });

  it('kommt mit leeren Antworten zurecht', () => {
    const result = priceBands([null, undefined], labels);
    expect(result.n).toBe(0);
    expect(result.median).toBeNull();
    expect(result.notBook.share).toBe(0);
  });
});

describe('Van Westendorp', () => {
  // Zwei Personen: «zu günstig» bei 100/200, «günstig» bei 200/300, «teuer» bei 300/400, «zu teuer» bei 400/500
  const answers = [
    { a: 100, b: 200, c: 300, d: 400 },
    { a: 200, b: 300, c: 400, d: 500 },
  ];

  it('bildet die kumulierten Kurven an jedem genannten Preis', () => {
    const result = vanWestendorp(answers);
    expect(result.n).toBe(2);
    expect(result.points.map((point) => point.price)).toEqual([100, 200, 300, 400, 500]);
    expect(result.points[0]).toEqual({
      price: 100,
      tooCheap: 1,
      cheap: 1,
      expensive: 0,
      tooExpensive: 0,
    });
    expect(result.points[2]).toEqual({
      price: 300,
      tooCheap: 0,
      cheap: 0.5,
      expensive: 0.5,
      tooExpensive: 0,
    });
    expect(result.points[4]).toEqual({
      price: 500,
      tooCheap: 0,
      cheap: 0,
      expensive: 1,
      tooExpensive: 1,
    });
  });

  it('berechnet die Schnittpunkte laut Auftrag', () => {
    const result = vanWestendorp(answers);
    // «zu günstig» (0.5 → 0) trifft «teuer» (0 → 0.5) zwischen 200 und 300
    expect(result.lower).toBe(250);
    // «günstig» (0.5 → 0) trifft «zu teuer» (0 → 0.5) zwischen 300 und 400
    expect(result.upper).toBe(350);
    // «zu günstig» und «zu teuer» sind beide ab 300 bei 0
    expect(result.optimal).toBe(300);
    expect(result.lower).toBeLessThanOrEqual(result.optimal ?? 0);
    expect(result.optimal).toBeLessThanOrEqual(result.upper ?? 0);
  });

  it('verfeinert den Schnittpunkt linear zwischen zwei Stützpunkten', () => {
    const points = [
      { price: 100, tooCheap: 0.8, cheap: 1, expensive: 0.2, tooExpensive: 0 },
      { price: 200, tooCheap: 0.2, cheap: 1, expensive: 0.6, tooExpensive: 0 },
    ];
    // Differenz 0.6 → −0.4: Nulldurchgang bei 60 % der Strecke
    expect(crossing(points, 'tooCheap', 'expensive')).toBeCloseTo(160);
    expect(crossing(points, 'cheap', 'tooExpensive')).toBeNull();
  });

  it('ignoriert unvollständige Angaben und liefert ohne Daten nichts', () => {
    expect(vanWestendorp([{ a: 1, b: 2, c: Number.NaN, d: 4 }]).n).toBe(0);
    expect(vanWestendorp([])).toEqual({
      n: 0,
      points: [],
      lower: null,
      upper: null,
      optimal: null,
    });
  });
});

describe('Zähler', () => {
  it('rechnet die Klickrate gesamt und je Selbsteinschätzung', () => {
    const summary = counterSummary([
      { event: 'survey_started', s_bucket: 0, day: '2026-12-01', count: 10 },
      { event: 'survey_started', s_bucket: 0, day: '2026-12-02', count: 5 },
      { event: 'survey_completed', s_bucket: 2, day: '2026-12-01', count: 4 },
      { event: 'survey_completed', s_bucket: 5, day: '2026-12-01', count: 6 },
      { event: 'bait_click', s_bucket: 2, day: '2026-12-01', count: 3 },
      { event: 'bait_click', s_bucket: 5, day: '2026-12-02', count: 1 },
      { event: 'bait_click', s_bucket: 0, day: '2026-12-02', count: 1 },
      { event: 'checklist_click', s_bucket: 0, day: '2026-12-02', count: 7 },
    ]);
    expect(summary.started).toBe(15);
    expect(summary.completed).toBe(10);
    expect(summary.baitClicks).toBe(5);
    expect(summary.baitRate).toBe(0.5);
    expect(summary.checklistClicks).toBe(7);
    expect(summary.clicksWithoutS).toBe(1);
    expect(summary.bySelfAssessment[1]).toEqual({ s: 2, completed: 4, clicks: 3, rate: 0.75 });
    expect(summary.bySelfAssessment[4]?.rate).toBeCloseTo(1 / 6);
    expect(summary.bySelfAssessment[0]).toEqual({ s: 1, completed: 0, clicks: 0, rate: null });
  });
});

describe('Go/No-Go-Ampel', () => {
  /** 150 Antworten, alle aus Zürich, alle mit Interesse 5 an Phishing, Setup-Preise bis 600 */
  const strong = () =>
    Array.from({ length: 150 }, () =>
      row({
        q6: JSON.stringify({
          phishing: 5,
          anlagebetrug: 1,
          romance: 1,
          cybermobbing: 1,
          heimnetz: 1,
          privatsphaere: 1,
        }),
        q11_a: 200,
        q11_b: 400,
        q11_c: 500,
        q11_d: 600,
      }),
    );

  it('zeigt Go, wenn alle sechs Kriterien erfüllt sind', () => {
    const analysis = analyze(exportOf(strong(), { waitlist: { total: 20, founding: 5 } }));
    expect(analysis.criteria.map((entry) => entry.state)).toEqual(Array(6).fill('met'));
    expect(analysis.verdict).toBe('go');
    expect(analysis.setup.upper).toBeGreaterThanOrEqual(490);
  });

  it('zeigt Fast, wenn ein Kriterium nur knapp verfehlt ist (ab 80 % des Ziels)', () => {
    const analysis = analyze(
      exportOf(strong().slice(0, 120), { waitlist: { total: 20, founding: 5 } }),
    );
    expect(analysis.criteria.find((entry) => entry.id === 'responses')?.state).toBe('near');
    expect(analysis.verdict).toBe('almost');
  });

  it('zeigt No-Go, wenn ein Kriterium deutlich verfehlt ist', () => {
    const analysis = analyze(exportOf(strong(), { waitlist: { total: 20, founding: 3 } }));
    expect(analysis.criteria.find((entry) => entry.id === 'founding')?.state).toBe('missed');
    expect(analysis.verdict).toBe('no-go');
  });

  it('prüft den Anteil aus dem Kanton Zürich und das Interesse an mindestens einem Thema', () => {
    const rows = [
      ...Array.from({ length: 59 }, () => row({ q1: 'kanton_zh' })),
      ...Array.from({ length: 41 }, () => row({ q1: 'deutschschweiz' })),
    ];
    const analysis = analyze(exportOf(rows));
    expect(analysis.zurichShare).toBeCloseTo(0.59);
    expect(analysis.criteria.find((entry) => entry.id === 'zurichShare')?.state).toBe('near');
    // Niemand vergibt eine 4 oder 5
    expect(analysis.anyTopicShare).toBe(0);
    expect(analysis.criteria.find((entry) => entry.id === 'topicShare')?.state).toBe('missed');
  });

  it('wertet ohne Antworten alles als offen, ohne zu stolpern', () => {
    const analysis = analyze(exportOf([]));
    expect(analysis.n).toBe(0);
    expect(analysis.period).toBeNull();
    expect(analysis.verdict).toBe('no-go');
    expect(analysis.criteria.every((entry) => entry.state === 'missed')).toBe(true);
  });
});

describe('analyze', () => {
  it('fasst Quelle, Fokus, Themen, Formate und Freitext zusammen', () => {
    const analysis = analyze(
      exportOf([
        row({
          quelle: 'instagram',
          fokus: 'vor',
          q7: '["webinar","videos"]',
          q14: '["preis"]',
          q15: ' Sorge A ',
        }),
        row({ quelle: 'instagram', q4: 5, q8: 4, q10: 'chf_150_199', q12: 'nicht_buchen' }),
        row({
          quelle: 'flyer',
          created_day: '2026-12-09',
          q6: JSON.stringify({
            phishing: 4,
            anlagebetrug: 2,
            romance: 1,
            cybermobbing: 5,
            heimnetz: 3,
            privatsphaere: 2,
          }),
        }),
      ]),
    );
    expect(analysis.n).toBe(3);
    expect(analysis.period).toEqual({ first: '2026-12-01', last: '2026-12-09' });
    expect(analysis.bySource[0]).toMatchObject({ key: 'instagram', label: 'Instagram', count: 2 });
    expect(analysis.byFocus.find((share) => share.key === 'ohne')?.count).toBe(2);
    expect(analysis.topics.find((topic) => topic.key === 'cybermobbing')?.result.top2).toBeCloseTo(
      1 / 3,
    );
    expect(analysis.anyTopicShare).toBeCloseTo(1 / 3);
    expect(analysis.formats.find((share) => share.key === 'webinar')?.count).toBe(3);
    expect(analysis.whatsappCheck.n).toBe(1);
    expect(analysis.priceSession.median?.label).toBe('CHF 150–199');
    expect(analysis.priceAbo.notBook.share).toBe(1);
    expect(analysis.priorities).toMatchObject({ n: 1 });
    expect(analysis.worries).toEqual(['Sorge A']);
  });

  it('übersteht kaputtes JSON in einzelnen Feldern', () => {
    const analysis = analyze(exportOf([row({ q2: 'kein json', q6: '{', q7: '', q14: '42' })]));
    expect(analysis.household.every((share) => share.count === 0)).toBe(true);
    expect(analysis.topics.every((topic) => topic.result.n === 0)).toBe(true);
  });
});

describe('Bericht', () => {
  it('formatiert Zahlen nach Schweizer Art', () => {
    expect(fmtInt(64733)).toBe('64’733');
    expect(fmtInt(999)).toBe('999');
    expect(fmtPct(0.159, 1)).toBe(`15,9${NBSP}%`);
    expect(fmtPct(0.5)).toBe(`50${NBSP}%`);
    expect(fmtChf(1490)).toBe(`CHF${NBSP}1’490`);
    expect(fmtDay('2026-12-21')).toBe('21.12.2026');
    expect(esc(`<a href="x">'&`)).toBe('&lt;a href=&quot;x&quot;&gt;&#39;&amp;');
  });

  it('maskiert Freitext und unbekannte Werte (kein HTML aus den Daten)', () => {
    const html = renderReport(
      analyze(
        exportOf([
          row({
            quelle: '<img src=x onerror=alert(1)>',
            q15: '<script>alert("x")</script> & mehr',
          }),
        ]),
      ),
      new Date('2026-12-21T10:00:00Z'),
    );
    expect(html).not.toContain('<script>alert');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; mehr');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('ist eine einzelne Datei ohne externe Ressourcen und ohne E-Mail-Adressen', () => {
    const html = renderReport(analyze(demoExport()), new Date('2026-12-21T10:00:00Z'));
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain('<html lang="de-CH">');
    expect(html).not.toMatch(/(src|href)="https?:/);
    expect(html).not.toMatch(/<link\b/);
    expect(html).not.toMatch(/[\w.+-]+@[\w-]+\.[a-z]{2,}/i);
    expect(html).toContain('noindex');
  });

  it('markiert Demo- und Testdaten unübersehbar und echte Daten gar nicht', () => {
    const at = new Date('2026-12-21T10:00:00Z');
    const demo = renderReport(analyze(demoExport()), at);
    expect(demo).toContain('Demo: Diese Zahlen sind frei erfunden');
    expect(demo).toContain('(Demo)</title>');
    const local = renderReport(analyze(exportOf([row()], { local: true })), at);
    expect(local).toContain('Testdaten: Dieser Bericht stammt aus der lokalen Datenbank');
    expect(local).toContain('(Testdaten)</title>');
    const real = renderReport(analyze(exportOf([row()])), at);
    expect(real).not.toContain('frei erfunden');
    expect(real).not.toContain('Testdaten');
    expect(real).not.toContain('class="demo"');
  });

  it('zeigt in der Ampel nie ein verfehltes Ziel als erreicht', () => {
    const share = (value: number | null) =>
      criterionValue({
        id: 'zurichShare',
        label: '',
        value,
        target: 0.6,
        unit: 'share',
        state: 'near',
      }).value;
    // Anteile mit einer Nachkommastelle
    expect(share(0.598)).toBe(`59,8${NBSP}%`);
    expect(share(0.7011)).toBe(`70,1${NBSP}%`);
    // Knapp darunter: abrunden statt auf das Ziel aufrunden
    expect(share(0.5996)).toBe(`59,9${NBSP}%`);
    expect(share(0.59999)).toBe(`59,9${NBSP}%`);
    // Erreicht ist erreicht
    expect(share(0.6)).toBe(`60,0${NBSP}%`);
    expect(share(0.6004)).toBe(`60,0${NBSP}%`);
    expect(share(null)).toBe('–');

    const chf = (value: number | null) =>
      criterionValue({
        id: 'setupUpper',
        label: '',
        value,
        target: 490,
        unit: 'chf',
        state: 'near',
      }).value;
    expect(chf(489.6)).toBe(`CHF${NBSP}489`);
    expect(chf(484.6)).toBe(`CHF${NBSP}485`);
    expect(chf(490)).toBe(`CHF${NBSP}490`);
    expect(chf(1490.4)).toBe(`CHF${NBSP}1’490`);
    expect(chf(null)).toBe('nicht berechenbar');
  });

  it('trägt das Logo aus dem Logo-Kit, für Bildschirm und Druck', () => {
    const html = renderReport(analyze(exportOf([row()])), new Date('2026-12-21T10:00:00Z'));
    expect(html).toMatch(/<p class="brand"><svg class="logo-dark"[^>]*aria-label="PSYber"/);
    expect(html).toContain('<svg class="logo-light"');
  });

  it('zeigt Ampel, Kurven mit Legende und zu jedem Diagramm eine Tabelle', () => {
    const analysis = analyze(demoExport());
    const html = renderReport(analysis, new Date('2026-12-21T10:00:00Z'));
    expect(html).toContain('Go/No-Go-Ampel');
    for (const entry of analysis.criteria) expect(html).toContain(esc(entry.label));
    // Status nie nur als Farbe: Text «erfüllt», «knapp» oder «offen» steht dabei
    expect(html).toMatch(
      /class="state state-(met|near|missed)"><svg[^>]*>.*?<\/svg>(erfüllt|knapp|offen)/s,
    );
    for (const label of ['zu günstig', 'günstig', 'teuer', 'zu teuer']) {
      expect(html).toContain(`</span>${label}</span>`);
    }
    expect(html).toContain('akzeptiert: CHF');
    expect((html.match(/<details class="table-view">/g) ?? []).length).toBeGreaterThanOrEqual(14);
    expect(html).toContain('id="vw-data"');
  });

  it('ist deterministisch: gleiche Demo-Daten, gleicher Bericht', () => {
    const at = new Date('2026-12-21T10:00:00Z');
    expect(renderReport(analyze(demoExport()), at)).toBe(renderReport(analyze(demoExport()), at));
    expect(demoExport().responses).toHaveLength(184);
  });

  it('kommt ohne Antworten aus (leere Zustände statt Fehler)', () => {
    const html = renderReport(analyze(exportOf([])), new Date('2026-12-21T10:00:00Z'));
    expect(html).toContain('Noch keine Antworten.');
    expect(html).toContain('Zu wenige Antworten für Preiskurven.');
    expect(html).toContain('No-Go');
  });
});
