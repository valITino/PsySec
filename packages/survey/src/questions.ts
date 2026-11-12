/**
 * Die Umfrage als typisierte Daten (Abschnitt 6.3 des Auftrags, verbindlich).
 * Texte wörtlich aus dem Auftrag. Reihenfolge der Optionen = Reihenfolge der Anzeige.
 */

export const blocks = {
  A: 'Screening',
  B: 'Erfahrung',
  C: 'Interesse',
  D: 'Formate',
  E: 'Abo und Monitoring',
  F: 'Preise',
  G: 'Was zählt',
  H: 'Warteliste',
} as const;

export type BlockId = keyof typeof blocks;

/** Skala 1–5 */
export type Scale = 1 | 2 | 3 | 4 | 5;
export const SCALE_VALUES = [1, 2, 3, 4, 5] as const;

// ---------------------------------------------------------------- Optionen

export const q1Options = {
  stadt_zh: 'Stadt Zürich',
  kanton_zh: 'Kanton Zürich (ohne Stadt)',
  deutschschweiz: 'Andere Deutschschweiz',
  romandie_tessin: 'Romandie oder Tessin',
  ausland: 'Ausland',
} as const;

export const q2Options = {
  kinder_0_9: 'Kinder bis 9',
  kinder_10_15: 'Kinder 10–15',
  jugendliche_16_18: 'Jugendliche 16–18',
  erwachsene: 'Erwachsene',
  ab_65: 'Personen ab 65',
} as const;

export const q3Options = {
  regelmaessig: 'Ja, regelmässig',
  ab_und_zu: 'Ab und zu',
  nein: 'Nein',
} as const;

export const q5Options = {
  ja_schaden: 'Ja, mit Schaden',
  ja_erkannt: 'Ja, aber rechtzeitig erkannt',
  nein: 'Nein',
  keine_angabe: 'Möchte ich nicht sagen',
} as const;

export const q6Rows = {
  phishing: 'Phishing und Fake-SMS',
  anlagebetrug: 'Online-Anlagebetrug',
  romance: 'Romance Scam',
  cybermobbing: 'Cybermobbing',
  heimnetz: 'Sicheres Heimnetz und Kinderschutz',
  privatsphaere: 'Privatsphäre auf Social Media',
} as const;

export const q7Options = {
  vortrag: 'Vortrag an der Schule oder in der Gemeinde',
  webinar: 'Online-Webinar',
  session_zuhause: 'Session bei uns zu Hause',
  lan_party: 'Session mit befreundeten Familien bei jemandem zu Hause',
  videos: 'Kurze Videos auf Social Media',
} as const;

export const q10Options = {
  bis_99: 'bis CHF 99',
  chf_100_149: 'CHF 100–149',
  chf_150_199: 'CHF 150–199',
  chf_200_249: 'CHF 200–249',
  chf_250_299: 'CHF 250–299',
  ab_300: 'ab CHF 300',
  nicht_buchen: 'Würde ich nicht buchen',
} as const;

export const q11Fields = {
  a: 'Ab welchem Preis wäre es so günstig, dass Sie an der Qualität zweifeln?',
  b: 'Ab welchem Preis wäre es ein gutes Angebot?',
  c: 'Ab welchem Preis wird es teuer, Sie würden aber noch darüber nachdenken?',
  d: 'Ab welchem Preis wäre es zu teuer?',
} as const;

export const q12Options = {
  bis_14: 'bis CHF 14',
  chf_15_24: 'CHF 15–24',
  chf_25_34: 'CHF 25–34',
  chf_35_44: 'CHF 35–44',
  ab_45: 'ab CHF 45',
  nicht_buchen: 'Würde ich nicht buchen',
} as const;

export const q13Options = {
  bis_49: 'bis CHF 49',
  chf_50_69: 'CHF 50–69',
  chf_70_89: 'CHF 70–89',
  chf_90_109: 'CHF 90–109',
  ab_110: 'ab CHF 110',
  nicht_buchen: 'Würde ich nicht buchen',
} as const;

export const q14Options = {
  vertrauen: 'Vertrauen und Seriosität',
  preis: 'Preis',
  erklaerungen: 'Verständliche Erklärungen',
  datenschutz: 'Datenschutz',
  erreichbarkeit: 'Schnelle Erreichbarkeit',
} as const;

export type Q1 = keyof typeof q1Options;
export type Q2 = keyof typeof q2Options;
export type Q3 = keyof typeof q3Options;
export type Q5 = keyof typeof q5Options;
export type Q6Row = keyof typeof q6Rows;
export type Q7 = keyof typeof q7Options;
export type Q10 = keyof typeof q10Options;
export type Q11Field = keyof typeof q11Fields;
export type Q12 = keyof typeof q12Options;
export type Q13 = keyof typeof q13Options;
export type Q14 = keyof typeof q14Options;

/** Van Westendorp: Grenzen der Beträge in CHF */
export const VW_MIN = 0;
export const VW_MAX = 20000;
export const Q14_MAX = 2;
export const Q15_MAX_LENGTH = 1000;

// ---------------------------------------------------------------- Fragen

export type QuestionId =
  | 'q1'
  | 'q2'
  | 'q3'
  | 'q4'
  | 'q5'
  | 'q6'
  | 'q7'
  | 'q8'
  | 'q9'
  | 'q10'
  | 'q11'
  | 'q12'
  | 'q13'
  | 'q14'
  | 'q15'
  | 'q16';

interface BaseQuestion {
  id: QuestionId;
  block: BlockId;
  required: boolean;
  text: string;
  hint?: string;
  /** Frage wird übersprungen, wenn die genannte Frage diese Antwort hat */
  skipIf?: { question: QuestionId; equals: string };
}

export interface SingleQuestion extends BaseQuestion {
  type: 'single';
  options: Readonly<Record<string, string>>;
}

export interface MultiQuestion extends BaseQuestion {
  type: 'multi';
  options: Readonly<Record<string, string>>;
  /** Höchstzahl der Antworten */
  max?: number;
}

export interface ScaleQuestion extends BaseQuestion {
  type: 'scale';
  min: 1;
  max: 5;
  labels: { min: string; max: string };
}

export interface MatrixScaleQuestion extends BaseQuestion {
  type: 'matrix_scale';
  min: 1;
  max: 5;
  labels: { min: string; max: string };
  rows: Readonly<Record<string, string>>;
}

export interface VanWestendorpQuestion extends BaseQuestion {
  type: 'van_westendorp';
  fields: Readonly<Record<Q11Field, string>>;
}

export interface TextQuestion extends BaseQuestion {
  type: 'text';
  maxLength: number;
  placeholder?: string;
}

export interface WaitlistQuestion extends BaseQuestion {
  type: 'waitlist';
  fields: { email: string; founding_family: string };
  note: string;
}

export type Question =
  | SingleQuestion
  | MultiQuestion
  | ScaleQuestion
  | MatrixScaleQuestion
  | VanWestendorpQuestion
  | TextQuestion
  | WaitlistQuestion;

export const questions: readonly Question[] = [
  {
    id: 'q1',
    block: 'A',
    required: true,
    type: 'single',
    text: 'Wo wohnen Sie?',
    options: q1Options,
  },
  {
    id: 'q2',
    block: 'A',
    required: true,
    type: 'multi',
    text: 'Wer lebt in Ihrem Haushalt?',
    hint: 'Mehrfachauswahl möglich',
    options: q2Options,
  },
  {
    id: 'q3',
    block: 'A',
    required: false,
    type: 'single',
    text: 'Kümmern Sie sich auch um die digitale Sicherheit Ihrer Eltern oder Grosseltern?',
    options: q3Options,
  },
  {
    id: 'q4',
    block: 'B',
    required: true,
    type: 'scale',
    min: 1,
    max: 5,
    text: 'Wie sicher fühlen Sie sich, Online-Betrug zu erkennen?',
    labels: { min: 'gar nicht', max: 'sehr sicher' },
  },
  {
    id: 'q5',
    block: 'B',
    required: false,
    type: 'single',
    text: 'Haben Sie oder jemand in Ihrer Familie schon Erfahrungen mit Online-Betrug, Phishing oder Cybermobbing gemacht?',
    options: q5Options,
  },
  {
    id: 'q6',
    block: 'C',
    required: true, // jede Zeile muss beantwortet sein
    type: 'matrix_scale',
    min: 1,
    max: 5,
    text: 'Wie interessant sind diese Themen für Ihre Familie?',
    labels: { min: 'gar nicht', max: 'sehr' },
    rows: q6Rows,
  },
  {
    id: 'q7',
    block: 'D',
    required: true,
    type: 'multi',
    text: 'Welche Formate würden Sie nutzen?',
    hint: 'Mehrfachauswahl möglich',
    options: q7Options,
  },
  {
    id: 'q8',
    block: 'E',
    required: false,
    type: 'scale',
    min: 1,
    max: 5,
    text: 'Wie nützlich fänden Sie einen «Ist das echt?»-Check per WhatsApp?',
    hint: 'Sie schicken eine verdächtige Nachricht und bekommen eine Einschätzung.',
    labels: { min: 'gar nicht', max: 'sehr' },
  },
  {
    id: 'q9',
    block: 'E',
    required: false,
    type: 'scale',
    min: 1,
    max: 5,
    text: 'Wie wohl wäre Ihnen, wenn eine Fachperson Ihre Computer auf Angriffe überwacht?',
    labels: { min: 'gar nicht wohl', max: 'sehr wohl' },
  },
  {
    id: 'q10',
    block: 'F',
    required: false,
    type: 'single',
    text: 'Session bei Ihnen zu Hause, 90 Minuten, mit Quick-Check und Notfallkarte. Was wäre Ihnen das wert?',
    options: q10Options,
  },
  {
    id: 'q11',
    block: 'F',
    required: false,
    type: 'van_westendorp',
    text: 'Session plus komplettes Setup von Router, Kindergeräten, Passwort-Manager und Backup, rund 4 Stunden. Bitte je einen Betrag in CHF eintragen.',
    fields: q11Fields,
  },
  {
    id: 'q12',
    block: 'F',
    required: false,
    type: 'single',
    text: 'Abo mit «Ist das echt?»-Check per WhatsApp, Fernwartung und jährlichem Check-up. Was wäre Ihnen das pro Monat wert?',
    options: q12Options,
  },
  {
    id: 'q13',
    block: 'F',
    required: false,
    type: 'single',
    skipIf: { question: 'q12', equals: 'nicht_buchen' },
    text: 'Das gleiche Abo, zusätzlich mit Frühwarnsystem für Computer und Router, Haushalt der Grosseltern inklusive. Was wäre Ihnen das pro Monat wert?',
    options: q13Options,
  },
  {
    id: 'q14',
    block: 'G',
    required: false,
    type: 'multi',
    max: Q14_MAX,
    text: 'Was ist Ihnen bei so einem Angebot am wichtigsten?',
    hint: 'Höchstens zwei Antworten',
    options: q14Options,
  },
  {
    id: 'q15',
    block: 'G',
    required: false,
    type: 'text',
    maxLength: Q15_MAX_LENGTH,
    text: 'Was ist Ihre grösste Sorge im digitalen Familienalltag?',
    placeholder: 'Zum Beispiel: Ich weiss nicht, mit wem mein Kind online chattet.',
  },
  {
    id: 'q16',
    block: 'H',
    required: false,
    type: 'waitlist',
    text: 'Möchten Sie informiert werden, wenn PSYber startet?',
    fields: {
      email: 'E-Mail (freiwillig)',
      founding_family: 'Ich interessiere mich für einen vergünstigten Platz als Founding Family.',
    },
    note: 'Ihre E-Mail-Adresse wird getrennt von Ihren Antworten gespeichert und nur für diese Information verwendet.',
  },
];

export function getQuestion(id: QuestionId): Question {
  const question = questions.find((entry) => entry.id === id);
  if (!question) throw new Error(`Unbekannte Frage: ${id}`);
  return question;
}

// ---------------------------------------------------------------- Antworten

export interface VanWestendorp {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Antworten, wie sie gespeichert werden (q16 läuft getrennt über `Waitlist`). */
export interface Answers {
  q1?: Q1;
  q2?: Q2[];
  q3?: Q3;
  q4?: Scale;
  q5?: Q5;
  q6?: Partial<Record<Q6Row, Scale>>;
  q7?: Q7[];
  q8?: Scale;
  q9?: Scale;
  q10?: Q10;
  q11?: VanWestendorp;
  q12?: Q12;
  q13?: Q13;
  q14?: Q14[];
  q15?: string;
}

export interface Waitlist {
  email: string;
  foundingFamily: boolean;
}

// ---------------------------------------------------------------- Versteckte Felder

/** Erlaubte Werte für `?quelle=` */
export const QUELLEN = [
  'instagram',
  'tiktok',
  'facebook',
  'linkedin',
  'whatsapp',
  'flyer',
  'vortrag',
  'website',
  'empfehlung',
] as const;

/** Gespeicherte Werte: unbekannt → `andere`, fehlt → `direkt` */
export const QUELLEN_STORED = [...QUELLEN, 'andere', 'direkt'] as const;

export type Quelle = (typeof QUELLEN_STORED)[number];

export const FOKUS = ['vor', 'nach', 'unklar'] as const;
export type Fokus = (typeof FOKUS)[number];

// ---------------------------------------------------------------- Kontaktformular (psyber.tech)

export const interessen = {
  familien_session: 'Familien-Session',
  lan_party: 'LAN-Party',
  vortrag: 'Vortrag oder Talk',
  firma: 'Firma oder Benefit',
  anderes: 'Anderes',
} as const;

export type Interesse = keyof typeof interessen;

/** Erlaubte Werte für `?ref=` im Kontaktformular */
export const CONTACT_REFS = ['surprise'] as const;
export type ContactRef = (typeof CONTACT_REFS)[number];

// ---------------------------------------------------------------- Anonyme Zähler

export const EVENTS = ['survey_started', 'bait_click', 'checklist_click'] as const;
export type EventName = (typeof EVENTS)[number];

// ---------------------------------------------------------------- Reichweite (anonyme Tagessummen)
//
// Geschlossene Listen: Der Browser schickt nie freien Text, die API nimmt nur diese Werte an.

/** Seiten, deren Aufrufe gezählt werden (der Styleguide zählt nicht) */
export const PAGES = [
  'home',
  'checkliste',
  'impressum',
  'datenschutz',
  'notfound',
  'umfrage',
  'erwischt',
] as const;
export type PageKey = (typeof PAGES)[number];

/** Art der Seite, von der jemand kommt. Ihre Adresse verlässt den Browser nie. */
export const REFERRER_KINDS = ['suche', 'social', 'verweis'] as const;

/** Herkunft eines Einstiegs: der Wert von `?quelle=`, sonst die Art der verweisenden Seite */
export const SOURCES = [...QUELLEN_STORED, ...REFERRER_KINDS] as const;
export type Source = (typeof SOURCES)[number];

/** Knöpfe und Links, deren Klicks gezählt werden: nach ihrem Platz benannt, nicht nach dem Ziel */
export const CTAS = [
  'header_cta',
  'menu_cta',
  'hero_cta',
  'hero_mehr',
  'pakete_cta',
  'schritt_cta',
  'footer_umfrage',
  'checkliste_drucken',
  'erwischt_kontakt',
  'erwischt_code',
] as const;
export type CtaKey = (typeof CTAS)[number];

/** Fragen der Umfrage: gezählt wird, bis zu welcher jemand gekommen ist */
export const STEPS: readonly QuestionId[] = questions.map((question) => question.id);
