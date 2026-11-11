import { describe, expect, it } from 'vitest';
import {
  SCHEMA_VERSION,
  answersSchema,
  buildSubmission,
  cleanAnswers,
  contactSchema,
  emptyDraft,
  eventSchema,
  firstInvalid,
  getQuestion,
  isAnswered,
  isSkipped,
  normalizeContact,
  normalizeFokus,
  normalizeQuelle,
  parseChf,
  pickSchwerpunkte,
  questions,
  surveySubmissionSchema,
  tips,
  validateContact,
  validateQuestion,
  validationMessages,
  visibleQuestions,
  type Answers,
  type Draft,
} from '../src/index.ts';

const completeAnswers = (): Answers => ({
  q1: 'stadt_zh',
  q2: ['kinder_10_15', 'erwachsene'],
  q4: 3,
  q6: { phishing: 5, anlagebetrug: 2, romance: 1, cybermobbing: 4, heimnetz: 4, privatsphaere: 3 },
  q7: ['session_zuhause'],
});

const draftWith = (answers: Answers, patch: Partial<Draft> = {}): Draft => ({
  ...emptyDraft(),
  ...patch,
  answers,
});

describe('Fragen', () => {
  it('bildet alle 16 Fragen in der richtigen Reihenfolge ab', () => {
    expect(questions.map((question) => question.id)).toEqual(
      Array.from({ length: 16 }, (_, index) => `q${index + 1}`),
    );
  });

  it('markiert genau q1, q2, q4, q6 und q7 als Pflicht', () => {
    expect(
      questions.filter((question) => question.required).map((question) => question.id),
    ).toEqual(['q1', 'q2', 'q4', 'q6', 'q7']);
  });

  it('hat für jedes Thema aus Frage 6 einen Tipp', () => {
    const question = getQuestion('q6');
    if (question.type !== 'matrix_scale') throw new Error('q6 muss eine Matrix sein');
    expect(Object.keys(tips).sort()).toEqual(Object.keys(question.rows).sort());
  });
});

describe('Pflichtfelder', () => {
  it('lässt Pflichtfragen ohne Antwort nicht durch', () => {
    const draft = emptyDraft();
    expect(validateQuestion(getQuestion('q1'), draft)).toMatchObject({
      ok: false,
      code: 'required',
    });
    expect(validateQuestion(getQuestion('q2'), draft)).toMatchObject({
      ok: false,
      code: 'required_multi',
    });
    expect(validateQuestion(getQuestion('q4'), draft)).toMatchObject({
      ok: false,
      code: 'required',
    });
    expect(validateQuestion(getQuestion('q7'), draft)).toMatchObject({
      ok: false,
      code: 'required_multi',
    });
  });

  it('lässt optionale Fragen ohne Antwort durch', () => {
    const draft = emptyDraft();
    for (const id of [
      'q3',
      'q5',
      'q8',
      'q9',
      'q10',
      'q11',
      'q12',
      'q13',
      'q14',
      'q15',
      'q16',
    ] as const) {
      expect(validateQuestion(getQuestion(id), draft)).toEqual({ ok: true });
      expect(isAnswered(getQuestion(id), draft)).toBe(false);
    }
  });

  it('verlangt bei Frage 6 jede Zeile', () => {
    const partial = draftWith({ q6: { phishing: 4, anlagebetrug: 3 } });
    expect(validateQuestion(getQuestion('q6'), partial)).toMatchObject({
      ok: false,
      code: 'matrix_incomplete',
    });
    expect(validateQuestion(getQuestion('q6'), draftWith(completeAnswers()))).toEqual({ ok: true });
  });

  it('meldet die erste Frage, bei der es nicht weitergeht', () => {
    expect(firstInvalid(emptyDraft())).toBe('q1');
    expect(firstInvalid(draftWith({ ...completeAnswers(), q4: undefined }))).toBe('q4');
    expect(firstInvalid(draftWith(completeAnswers()))).toBeNull();
  });

  it('lehnt im Schema fehlende Pflichtantworten ab', () => {
    expect(answersSchema.safeParse(completeAnswers()).success).toBe(true);
    for (const key of ['q1', 'q2', 'q4', 'q6', 'q7'] as const) {
      const answers = { ...completeAnswers(), [key]: undefined };
      expect(answersSchema.safeParse(answers).success, key).toBe(false);
    }
  });

  it('lehnt unbekannte Felder und Werte ab', () => {
    expect(answersSchema.safeParse({ ...completeAnswers(), q99: 'x' }).success).toBe(false);
    expect(answersSchema.safeParse({ ...completeAnswers(), q1: 'mars' }).success).toBe(false);
    expect(answersSchema.safeParse({ ...completeAnswers(), q4: 6 }).success).toBe(false);
    expect(answersSchema.safeParse({ ...completeAnswers(), q4: 2.5 }).success).toBe(false);
    expect(
      answersSchema.safeParse({ ...completeAnswers(), q2: ['erwachsene', 'erwachsene'] }).success,
    ).toBe(false);
  });
});

describe('Sprunglogik bei Frage 13', () => {
  it('überspringt q13, wenn q12 «Würde ich nicht buchen» ist', () => {
    const q13 = getQuestion('q13');
    expect(isSkipped(q13, { q12: 'nicht_buchen' })).toBe(true);
    expect(isSkipped(q13, { q12: 'chf_15_24' })).toBe(false);
    expect(isSkipped(q13, {})).toBe(false);
  });

  it('zählt dann 15 statt 16 Fragen', () => {
    expect(visibleQuestions({})).toHaveLength(16);
    expect(visibleQuestions({ q12: 'nicht_buchen' })).toHaveLength(15);
    expect(visibleQuestions({ q12: 'nicht_buchen' }).map((question) => question.id)).not.toContain(
      'q13',
    );
  });

  it('entfernt eine frühere Antwort auf q13 beim Absenden', () => {
    const draft = draftWith({ ...completeAnswers(), q12: 'nicht_buchen', q13: 'chf_50_69' });
    expect(cleanAnswers(draft).q13).toBeUndefined();
  });

  it('lehnt im Schema eine Antwort auf die übersprungene Frage ab', () => {
    const invalid = { ...completeAnswers(), q12: 'nicht_buchen', q13: 'chf_50_69' };
    const result = answersSchema.safeParse(invalid);
    expect(result.success).toBe(false);
    expect(
      answersSchema.safeParse({ ...completeAnswers(), q12: 'bis_14', q13: 'bis_49' }).success,
    ).toBe(true);
  });
});

describe('Van-Westendorp-Regel (Frage 11)', () => {
  const q11 = getQuestion('q11');
  const withAmounts = (a: string, b: string, c: string, d: string) =>
    draftWith(completeAnswers(), { q11: { a, b, c, d } });

  it('akzeptiert vier leere Felder (Überspringen)', () => {
    expect(validateQuestion(q11, withAmounts('', '', '', ''))).toEqual({ ok: true });
    expect(cleanAnswers(withAmounts('', '', '', '')).q11).toBeUndefined();
  });

  it('verlangt alle vier Felder oder keines', () => {
    expect(validateQuestion(q11, withAmounts('200', '', '', ''))).toMatchObject({
      ok: false,
      code: 'vw_partial',
    });
  });

  it('akzeptiert nur ganze Zahlen von 0 bis 20000', () => {
    expect(parseChf('490')).toBe(490);
    expect(parseChf(' 1’200 ')).toBe(1200);
    expect(parseChf('0')).toBe(0);
    expect(parseChf('20000')).toBe(20000);
    expect(parseChf('20001')).toBeNull();
    expect(parseChf('-5')).toBeNull();
    expect(parseChf('99.50')).toBeNull();
    expect(parseChf('viel')).toBeNull();
    expect(validateQuestion(q11, withAmounts('200', '400', '600', 'viel'))).toMatchObject({
      ok: false,
      code: 'vw_invalid',
    });
  });

  it('verlangt a ≤ b ≤ c ≤ d und zeigt sonst den Hinweis aus dem Auftrag', () => {
    expect(validateQuestion(q11, withAmounts('200', '400', '600', '900'))).toEqual({ ok: true });
    expect(validateQuestion(q11, withAmounts('300', '300', '300', '300'))).toEqual({ ok: true });
    const wrong = validateQuestion(q11, withAmounts('500', '400', '600', '900'));
    expect(wrong).toMatchObject({ ok: false, code: 'vw_order' });
    expect(validationMessages.vw_order).toBe('Die Beträge sollten von oben nach unten steigen.');
  });

  it('prüft dieselbe Regel im Schema', () => {
    const ok = { ...completeAnswers(), q11: { a: 200, b: 400, c: 600, d: 900 } };
    expect(answersSchema.safeParse(ok).success).toBe(true);
    expect(
      answersSchema.safeParse({ ...ok, q11: { a: 500, b: 400, c: 600, d: 900 } }).success,
    ).toBe(false);
    expect(answersSchema.safeParse({ ...ok, q11: { a: 200, b: 400, c: 600 } }).success).toBe(false);
    expect(
      answersSchema.safeParse({ ...ok, q11: { a: 200, b: 400, c: 600, d: 20001 } }).success,
    ).toBe(false);
  });
});

describe('Frage 14: höchstens zwei Antworten', () => {
  it('lässt null bis zwei Antworten zu', () => {
    const q14 = getQuestion('q14');
    expect(validateQuestion(q14, draftWith({ q14: ['preis'] }))).toEqual({ ok: true });
    expect(validateQuestion(q14, draftWith({ q14: ['preis', 'vertrauen'] }))).toEqual({ ok: true });
    expect(
      validateQuestion(q14, draftWith({ q14: ['preis', 'vertrauen', 'datenschutz'] })),
    ).toMatchObject({
      ok: false,
      code: 'too_many',
    });
  });

  it('lehnt im Schema drei Antworten ab', () => {
    expect(
      answersSchema.safeParse({ ...completeAnswers(), q14: ['preis', 'vertrauen'] }).success,
    ).toBe(true);
    expect(
      answersSchema.safeParse({ ...completeAnswers(), q14: ['preis', 'vertrauen', 'datenschutz'] })
        .success,
    ).toBe(false);
  });
});

describe('Whitelist für quelle und fokus', () => {
  it('behält erlaubte Quellen', () => {
    for (const quelle of [
      'instagram',
      'tiktok',
      'facebook',
      'linkedin',
      'whatsapp',
      'flyer',
      'vortrag',
      'website',
      'empfehlung',
    ]) {
      expect(normalizeQuelle(quelle)).toBe(quelle);
    }
    expect(normalizeQuelle(' Instagram ')).toBe('instagram');
  });

  it('macht aus Unbekanntem «andere» und aus Fehlendem «direkt»', () => {
    expect(normalizeQuelle('newsletter')).toBe('andere');
    expect(normalizeQuelle('<script>')).toBe('andere');
    expect(normalizeQuelle('')).toBe('direkt');
    expect(normalizeQuelle(null)).toBe('direkt');
    expect(normalizeQuelle(undefined)).toBe('direkt');
  });

  it('kennt nur die drei Fokus-Werte', () => {
    expect(normalizeFokus('vor')).toBe('vor');
    expect(normalizeFokus('nach')).toBe('nach');
    expect(normalizeFokus('unklar')).toBe('unklar');
    expect(normalizeFokus('alles')).toBeUndefined();
    expect(normalizeFokus(null)).toBeUndefined();
  });
});

describe('Auswahl der Schwerpunkte', () => {
  it('nimmt nur Themen mit 4 oder 5, höchster Wert zuerst', () => {
    const picked = pickSchwerpunkte({
      phishing: 4,
      anlagebetrug: 3,
      romance: 5,
      cybermobbing: 2,
      heimnetz: 1,
      privatsphaere: 4,
    });
    expect(picked.map((entry) => entry.topic)).toEqual(['romance', 'phishing', 'privatsphaere']);
    expect(picked[0]?.tip).toBe(tips.romance);
  });

  it('begrenzt auf drei und hält bei Gleichstand die Reihenfolge der Umfrage', () => {
    const picked = pickSchwerpunkte({
      phishing: 5,
      anlagebetrug: 5,
      romance: 5,
      cybermobbing: 5,
      heimnetz: 5,
      privatsphaere: 5,
    });
    expect(picked.map((entry) => entry.topic)).toEqual(['phishing', 'anlagebetrug', 'romance']);
  });

  it('liefert nichts, wenn kein Thema 4 oder 5 hat', () => {
    expect(
      pickSchwerpunkte({
        phishing: 3,
        anlagebetrug: 1,
        romance: 2,
        cybermobbing: 3,
        heimnetz: 3,
        privatsphaere: 1,
      }),
    ).toEqual([]);
    expect(pickSchwerpunkte(undefined)).toEqual([]);
  });
});

describe('Absenden', () => {
  it('baut eine gültige Einsendung', () => {
    const draft = draftWith(
      { ...completeAnswers(), q15: '  Mein Kind chattet mit Fremden.  ', q14: [] },
      { waitlist: { email: ' familie@example.ch ', foundingFamily: true } },
    );
    const submission = buildSubmission({
      draft,
      quelle: 'website',
      fokus: 'vor',
      turnstileToken: 'token',
    });
    expect(submission.schemaVersion).toBe(SCHEMA_VERSION);
    expect(submission.answers.q15).toBe('Mein Kind chattet mit Fremden.');
    expect(submission.answers.q14).toBeUndefined();
    expect(submission.waitlist).toEqual({ email: 'familie@example.ch', foundingFamily: true });
    expect(surveySubmissionSchema.safeParse(submission).success).toBe(true);
  });

  it('lässt die Warteliste weg, wenn keine E-Mail eingetragen ist', () => {
    const submission = buildSubmission({
      draft: draftWith(completeAnswers(), { waitlist: { email: '', foundingFamily: true } }),
      quelle: 'direkt',
      turnstileToken: 'token',
    });
    expect(submission.waitlist).toBeUndefined();
    expect('fokus' in submission).toBe(false);
  });

  it('prüft die E-Mail der Warteliste', () => {
    const q16 = getQuestion('q16');
    const withMail = (email: string) =>
      draftWith(completeAnswers(), { waitlist: { email, foundingFamily: false } });
    expect(validateQuestion(q16, withMail(''))).toEqual({ ok: true });
    expect(validateQuestion(q16, withMail('familie@example.ch'))).toEqual({ ok: true });
    expect(validateQuestion(q16, withMail('keine-adresse'))).toMatchObject({
      ok: false,
      code: 'email_invalid',
    });
  });

  it('lehnt unbekannte Felder in der Einsendung ab', () => {
    const submission = buildSubmission({
      draft: draftWith(completeAnswers()),
      quelle: 'direkt',
      turnstileToken: 'token',
    });
    expect(surveySubmissionSchema.safeParse({ ...submission, ip: '1.2.3.4' }).success).toBe(false);
    expect(surveySubmissionSchema.safeParse({ ...submission, quelle: 'newsletter' }).success).toBe(
      false,
    );
    expect(surveySubmissionSchema.safeParse({ ...submission, schemaVersion: 99 }).success).toBe(
      false,
    );
  });
});

describe('Zähler', () => {
  it('kennt genau drei Ereignisse und s von 1 bis 5', () => {
    expect(eventSchema.safeParse({ event: 'survey_started' }).success).toBe(true);
    expect(eventSchema.safeParse({ event: 'bait_click', s: 5 }).success).toBe(true);
    expect(eventSchema.safeParse({ event: 'checklist_click' }).success).toBe(true);
    expect(eventSchema.safeParse({ event: 'survey_completed' }).success).toBe(false);
    expect(eventSchema.safeParse({ event: 'bait_click', s: 0 }).success).toBe(false);
    expect(eventSchema.safeParse({ event: 'bait_click', s: 6 }).success).toBe(false);
    expect(eventSchema.safeParse({ event: 'bait_click', user: 'x' }).success).toBe(false);
  });
});

describe('Kontaktformular', () => {
  const valid = {
    name: 'Muster Familie',
    email: 'familie@example.ch',
    phone: '',
    plzOrt: '8000 Zürich',
    interesse: 'familien_session',
    nachricht: '',
    datenschutz: true,
  };

  it('akzeptiert gültige Eingaben und lässt leere optionale Felder weg', () => {
    expect(validateContact(valid)).toEqual({});
    const normalized = normalizeContact({ ...valid, ref: 'surprise' });
    expect(normalized).not.toHaveProperty('phone');
    expect(normalized).not.toHaveProperty('nachricht');
    expect(normalized.ref).toBe('surprise');
    expect(contactSchema.safeParse({ ...normalized, turnstileToken: 't' }).success).toBe(true);
  });

  it('meldet jedes fehlerhafte Feld verständlich', () => {
    const errors = validateContact({
      name: ' ',
      email: 'keine-adresse',
      phone: 'abc',
      plzOrt: '',
      interesse: '',
      nachricht: 'x'.repeat(2001),
      datenschutz: false,
    });
    expect(Object.keys(errors).sort()).toEqual(
      ['datenschutz', 'email', 'interesse', 'nachricht', 'name', 'phone', 'plzOrt'].sort(),
    );
    expect(errors.email).toBe('Bitte geben Sie eine gültige E-Mail-Adresse ein.');
  });

  it('verwirft unbekannte ref-Werte', () => {
    expect(normalizeContact({ ...valid, ref: 'newsletter' })).not.toHaveProperty('ref');
  });

  it('akzeptiert übliche Telefonnummern', () => {
    for (const phone of ['+41 79 123 45 67', '079 123 45 67', '044/123 45 67', '(044) 123-45-67']) {
      expect(validateContact({ ...valid, phone }), phone).toEqual({});
    }
  });
});
