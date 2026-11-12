import { describe, expect, it } from 'vitest';
import { QUELLEN, SOURCES } from '../packages/survey/src/index.ts';
import { SOURCE_TAGS, kindOf, sourceOf } from '../packages/ui/src/lib/source.ts';

const OWN = ['psyber.tech', 'forms.psyber.tech', 'surprise.psyber.tech'];

describe('Herkunft eines Einstiegs', () => {
  it('kennt im Browser dieselben Werte von ?quelle= wie die Umfrage', () => {
    expect([...SOURCE_TAGS]).toEqual([...QUELLEN]);
  });

  it('?quelle= gewinnt: bekannte Werte bleiben, unbekannte werden «andere»', () => {
    expect(sourceOf('?quelle=flyer', '', OWN)).toBe('flyer');
    expect(sourceOf('?quelle=FLYER ', 'https://www.google.ch/', OWN)).toBe('flyer');
    expect(sourceOf('?quelle=website', 'https://psyber.tech/', OWN)).toBe('website');
    expect(sourceOf('?quelle=max.muster@example.org', '', OWN)).toBe('andere');
    // Ein leerer Wert zählt wie ein fehlender.
    expect(sourceOf('?quelle=', '', OWN)).toBe('direkt');
  });

  it('ohne verweisende Seite: «direkt»', () => {
    expect(sourceOf('', '', OWN)).toBe('direkt');
    expect(sourceOf('?utm_source=x', '', OWN)).toBe('direkt');
    expect(sourceOf('', 'keine adresse', OWN)).toBe('direkt');
  });

  it('von unseren eigenen Seiten: kein Einstieg', () => {
    expect(sourceOf('', 'https://psyber.tech/', OWN)).toBeUndefined();
    expect(sourceOf('', 'https://forms.psyber.tech/', OWN)).toBeUndefined();
    // «Erwischt!» schickt keinen Referrer mit, hängt aber ?ref= an.
    expect(sourceOf('?ref=surprise', '', OWN)).toBeUndefined();
    expect(sourceOf('?ref=umfrage', '', OWN)).toBeUndefined();
  });

  it('erkennt Suche und soziale Netze am Hostnamen', () => {
    for (const host of [
      'www.google.ch',
      'google.co.uk',
      'www.bing.com',
      'duckduckgo.com',
      'www.ecosia.org',
      'search.brave.com',
      'com.google.android.googlequicksearchbox',
    ]) {
      expect(kindOf(host), host).toBe('suche');
    }
    for (const host of [
      'l.instagram.com',
      'm.facebook.com',
      'www.linkedin.com',
      'lnkd.in',
      't.co',
      'x.com',
      'youtu.be',
      'www.tiktok.com',
      'com.linkedin.android',
    ]) {
      expect(kindOf(host), host).toBe('social');
    }
    for (const host of ['example.org', 'www.srf.ch', 'news.ycombinator.com', '127.0.0.1']) {
      expect(kindOf(host), host).toBe('verweis');
    }
    expect(sourceOf('', 'https://www.google.ch/search?q=psyber', OWN)).toBe('suche');
    expect(sourceOf('', 'android-app://com.google.android.googlequicksearchbox/', OWN)).toBe(
      'suche',
    );
  });

  it('liefert nur Werte, die die API annimmt, und nie die Adresse selbst', () => {
    const cases: [string, string][] = [
      ['', ''],
      ['?quelle=instagram', ''],
      ['?quelle=irgendwas', ''],
      ['', 'https://www.google.ch/search?q=familie+muster'],
      ['', 'https://l.facebook.com/l.php?u=geheim'],
      ['', 'https://blog.example.org/artikel?leser=42'],
    ];
    for (const [search, referrer] of cases) {
      const source = sourceOf(search, referrer, OWN);
      expect(SOURCES as readonly string[]).toContain(source);
    }
  });
});
