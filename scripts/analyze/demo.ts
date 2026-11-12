/**
 * Erfundene Beispieldaten für `pnpm analyze --demo`: zum Ausprobieren des Berichts,
 * bevor echte Antworten da sind. Deterministisch (fester Seed). Kein Ergebnis der Umfrage.
 */
import {
  type q10Options,
  type q12Options,
  type q13Options,
  q14Options,
  q2Options,
  q6Rows,
  q7Options,
} from '../../packages/survey/src/questions.ts';
import type { CounterRow, ExportData, ResponseRow } from './compute.ts';

/** Mulberry32: kleiner, deterministischer Zufallsgenerator */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function demoExport(seed = 20261111, n = 184): ExportData {
  const random = rng(seed);
  /** Zieht einen Schlüssel nach Gewichten */
  const pick = <T extends string>(weights: Partial<Record<T, number>>): T => {
    const entries = Object.entries(weights) as [T, number][];
    const total = entries.reduce((sum, [, weight]) => sum + weight, 0);
    let at = random() * total;
    for (const [key, weight] of entries) {
      at -= weight;
      if (at <= 0) return key;
    }
    return (entries[entries.length - 1] as [T, number])[0];
  };
  const chance = (probability: number) => random() < probability;
  /** Annähernd normalverteilt (Summe aus drei Gleichverteilungen) */
  const normal = (mean: number, spread: number) =>
    mean + ((random() + random() + random()) / 1.5 - 1) * spread * 1.7;
  const round = (value: number, step: number) => Math.max(step, Math.round(value / step) * step);
  const scale = (weights: number[]) =>
    Number(pick(Object.fromEntries(weights.map((weight, index) => [String(index + 1), weight]))));

  const topicWeights: Record<string, number[]> = {
    phishing: [3, 8, 20, 38, 31],
    anlagebetrug: [14, 24, 30, 22, 10],
    romance: [34, 30, 20, 11, 5],
    cybermobbing: [10, 14, 22, 30, 24],
    heimnetz: [5, 10, 22, 36, 27],
    privatsphaere: [8, 16, 30, 30, 16],
  };

  const responses: ResponseRow[] = [];
  for (let index = 0; index < n; index++) {
    const day = 1 + Math.floor(random() * 21);
    const q12 = chance(0.86)
      ? pick<keyof typeof q12Options>({
          bis_14: 22,
          chf_15_24: 34,
          chf_25_34: 20,
          chf_35_44: 7,
          ab_45: 3,
          nicht_buchen: 14,
        })
      : null;
    const answersSetup = chance(0.72);
    const a = round(normal(240, 90), 10);
    const b = a + round(normal(130, 60), 10);
    const c = b + round(normal(170, 80), 10);
    const d = c + round(normal(210, 110), 10);
    const household = (Object.keys(q2Options) as (keyof typeof q2Options)[]).filter((key) =>
      chance(
        {
          kinder_0_9: 0.34,
          kinder_10_15: 0.42,
          jugendliche_16_18: 0.22,
          erwachsene: 0.9,
          ab_65: 0.12,
        }[key],
      ),
    );
    const formats = (Object.keys(q7Options) as (keyof typeof q7Options)[]).filter((key) =>
      chance(
        { vortrag: 0.38, webinar: 0.31, session_zuhause: 0.44, lan_party: 0.19, videos: 0.36 }[key],
      ),
    );
    const priorities = (Object.keys(q14Options) as (keyof typeof q14Options)[])
      .filter((key) =>
        chance(
          {
            vertrauen: 0.55,
            preis: 0.32,
            erklaerungen: 0.42,
            datenschutz: 0.3,
            erreichbarkeit: 0.14,
          }[key],
        ),
      )
      .slice(0, 2);

    responses.push({
      created_day: `2026-12-${String(day).padStart(2, '0')}`,
      quelle: pick({
        instagram: 26,
        whatsapp: 18,
        flyer: 12,
        website: 12,
        vortrag: 10,
        empfehlung: 10,
        facebook: 5,
        linkedin: 4,
        tiktok: 1,
        direkt: 2,
      }),
      fokus: chance(0.6) ? pick({ vor: 5, nach: 3, unklar: 2 }) : null,
      q1: pick({ stadt_zh: 38, kanton_zh: 30, deutschschweiz: 26, romandie_tessin: 3, ausland: 3 }),
      q2: JSON.stringify(household.length > 0 ? household : ['erwachsene']),
      q3: chance(0.8) ? pick({ regelmaessig: 22, ab_und_zu: 41, nein: 37 }) : null,
      q4: scale([6, 20, 38, 28, 8]),
      q5: chance(0.85) ? pick({ ja_schaden: 9, ja_erkannt: 46, nein: 38, keine_angabe: 7 }) : null,
      q6: JSON.stringify(
        Object.fromEntries(
          Object.keys(q6Rows).map((key) => [key, scale(topicWeights[key] ?? [1, 1, 1, 1, 1])]),
        ),
      ),
      q7: JSON.stringify(formats.length > 0 ? formats : ['videos']),
      q8: chance(0.9) ? scale([5, 9, 20, 36, 30]) : null,
      q9: chance(0.88) ? scale([24, 26, 26, 16, 8]) : null,
      q10: chance(0.88)
        ? pick<keyof typeof q10Options>({
            bis_99: 14,
            chf_100_149: 24,
            chf_150_199: 27,
            chf_200_249: 16,
            chf_250_299: 6,
            ab_300: 3,
            nicht_buchen: 10,
          })
        : null,
      q11_a: answersSetup ? a : null,
      q11_b: answersSetup ? b : null,
      q11_c: answersSetup ? c : null,
      q11_d: answersSetup ? d : null,
      q12,
      q13:
        q12 !== null && q12 !== 'nicht_buchen' && chance(0.92)
          ? pick<keyof typeof q13Options>({
              bis_49: 30,
              chf_50_69: 31,
              chf_70_89: 15,
              chf_90_109: 5,
              ab_110: 2,
              nicht_buchen: 17,
            })
          : null,
      q14: priorities.length > 0 ? JSON.stringify(priorities) : null,
      q15: chance(0.12) ? `Beispielantwort ${index + 1} (erfunden, Demo-Daten).` : null,
    });
  }

  // Zähler passend zu den Antworten: Klickrate sinkt leicht mit der Selbsteinschätzung
  const counters: CounterRow[] = [
    { event: 'survey_started', s_bucket: 0, day: '2026-12-21', count: Math.round(n * 1.55) },
    { event: 'checklist_click', s_bucket: 0, day: '2026-12-21', count: Math.round(n * 0.58) },
    { event: 'bait_click', s_bucket: 0, day: '2026-12-21', count: 3 },
  ];
  const clickRate = [0.46, 0.41, 0.33, 0.27, 0.22];
  for (let s = 1; s <= 5; s++) {
    const completed = responses.filter((row) => row.q4 === s).length;
    counters.push({ event: 'survey_completed', s_bucket: s, day: '2026-12-21', count: completed });
    counters.push({
      event: 'bait_click',
      s_bucket: s,
      day: '2026-12-21',
      count: Math.round(completed * (clickRate[s - 1] ?? 0.3)),
    });
  }

  counters.push(...demoReach(n));

  return {
    exportedDay: '2026-12-21',
    responses,
    counters,
    waitlist: { total: 31, founding: 9 },
    demo: true,
  };
}

/**
 * Erfundene Reichweite über drei Wochen: unter der Woche mehr als am Wochenende, ein Ausschlag
 * nach einem Vortrag, in der Umfrage springen von Frage zu Frage einige ab.
 */
function demoReach(n: number): CounterRow[] {
  const rows: CounterRow[] = [];
  const add = (event: string, dim: string, day: string, count: number) => {
    if (count > 0) rows.push({ event, dim, s_bucket: 0, day, count });
  };
  const pages: [string, number][] = [
    ['home', 0.46],
    ['umfrage', 0.31],
    ['checkliste', 0.12],
    ['erwischt', 0.06],
    ['datenschutz', 0.03],
    ['impressum', 0.015],
    ['notfound', 0.005],
  ];
  const sources: [string, string, number][] = [
    ['home', 'suche', 0.17],
    ['home', 'direkt', 0.14],
    ['umfrage', 'website', 0.16],
    ['umfrage', 'whatsapp', 0.12],
    ['umfrage', 'flyer', 0.1],
    ['umfrage', 'instagram', 0.09],
    ['home', 'social', 0.07],
    ['umfrage', 'vortrag', 0.06],
    ['umfrage', 'empfehlung', 0.05],
    ['home', 'verweis', 0.03],
    ['checkliste', 'suche', 0.01],
  ];
  for (let index = 0; index < 21; index++) {
    const date = new Date(Date.UTC(2026, 11, 1 + index));
    const day = date.toISOString().slice(0, 10);
    const weekend = date.getUTCDay() === 0 || date.getUTCDay() === 6;
    const wave = 60 + 22 * Math.sin(index / 2.4) + index * 2.5;
    const views = Math.round((weekend ? 0.62 : 1) * wave * (index === 9 ? 2.1 : 1));
    for (const [page, share] of pages) add('page_view', page, day, Math.round(views * share));
    const visits = Math.round(views * 0.44);
    for (const [page, source, share] of sources) {
      add('visit', `${page}:${source}`, day, Math.round(visits * share));
    }
  }
  const clicks: [string, number][] = [
    ['hero_cta', 148],
    ['schritt_cta', 96],
    ['hero_mehr', 74],
    ['header_cta', 61],
    ['pakete_cta', 43],
    ['checkliste_drucken', 38],
    ['menu_cta', 27],
    ['erwischt_code', 19],
    ['footer_umfrage', 12],
    ['erwischt_kontakt', 6],
  ];
  for (const [target, count] of clicks) add('cta_click', target, '2026-12-21', count);
  // Von Frage zu Frage bleiben etwas weniger; Frage 5 und 9 sehen nur manche (Sprunglogik).
  let reached = Math.round(n * 1.55);
  for (let question = 1; question <= 16; question++) {
    const seen = question === 5 || question === 9 ? Math.round(reached * 0.6) : reached;
    add('survey_step', `q${question}`, '2026-12-21', seen);
    reached = Math.max(n, Math.round(reached * (question < 4 ? 0.93 : 0.975)));
  }
  add('contact_sent', '', '2026-12-21', 7);
  return rows;
}
