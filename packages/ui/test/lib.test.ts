import { describe, expect, it } from 'vitest';
import {
  breadcrumbs,
  graph,
  organization,
  serializeJsonLd,
  webPage,
  website,
} from '../src/lib/structured-data.ts';
import { SEARCH_CRAWLERS, humansTxt, robotsTxt, securityTxt } from '../src/lib/well-known.ts';
import { formatNumber } from '../src/motion/count-up.ts';

describe('formatNumber', () => {
  it('nutzt Dezimalkomma und das Schweizer Tausendertrennzeichen', () => {
    expect(formatNumber(15.9, 1)).toBe('15,9');
    expect(formatNumber(64733)).toBe('64’733');
    expect(formatNumber(3485)).toBe('3’485');
    expect(formatNumber(4.8, 1)).toBe('4,8');
    expect(formatNumber(26)).toBe('26');
    expect(formatNumber(0, 1)).toBe('0,0');
  });
});

describe('security.txt', () => {
  it('entspricht RFC 9116 und läuft in einem Jahr ab', () => {
    const txt = securityTxt('https://psyber.tech', new Date('2026-11-11T10:20:30Z'));
    expect(txt).toContain('Contact: mailto:security@psyber.tech\n');
    expect(txt).toContain('Expires: 2027-11-11T00:00:00Z\n');
    expect(txt).toContain('Preferred-Languages: de, en\n');
    expect(txt).toContain('Canonical: https://psyber.tech/.well-known/security.txt\n');
  });

  it('nennt in humans.txt die Site', () => {
    expect(humansTxt('https://forms.psyber.tech')).toContain('Site: https://forms.psyber.tech');
  });
});

/** Kleiner Leser nach RFC 9309: Welche Regeln gelten für einen Crawler? */
function rulesFor(txt: string, agent: string): string[] {
  const groups: { agents: string[]; rules: string[] }[] = [];
  let current: { agents: string[]; rules: string[] } | null = null;
  for (const raw of txt.split('\n')) {
    const line = raw.replace(/#.*$/, '').trim();
    const match = /^([A-Za-z-]+):\s*(.*)$/.exec(line);
    if (!match) continue;
    const [, key = '', value = ''] = match;
    if (key.toLowerCase() === 'user-agent') {
      if (!current || current.rules.length > 0) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
    } else if (current && /^(allow|disallow)$/i.test(key)) {
      current.rules.push(`${key.toLowerCase()}: ${value}`);
    }
  }
  const specific = groups.filter((group) => group.agents.includes(agent.toLowerCase()));
  const matching = specific.length > 0 ? specific : groups.filter((g) => g.agents.includes('*'));
  return matching.flatMap((group) => group.rules);
}

describe('robots.txt', () => {
  it('offen: alles erlaubt, nichts unter Disallow, Sitemap genannt', () => {
    const txt = robotsTxt({
      host: 'psyber.tech',
      mode: 'open',
      sitemap: 'https://psyber.tech/sitemap-index.xml',
    });
    expect(rulesFor(txt, 'Googlebot')).toEqual(['allow: /']);
    expect(rulesFor(txt, 'GPTBot')).toEqual(['allow: /']);
    // Seiten mit «noindex» dürfen nie gesperrt sein: Ihr «noindex» sähe sonst kein Crawler.
    expect(txt).not.toMatch(/^Disallow:/m);
    expect(txt).toMatch(/^Sitemap: https:\/\/psyber\.tech\/sitemap-index\.xml$/m);
    expect(txt.endsWith('\n')).toBe(true);
  });

  it('offen ohne Sitemap: keine leere Sitemap-Zeile', () => {
    expect(robotsTxt({ host: 'forms.psyber.tech', mode: 'open' })).not.toContain('Sitemap');
  });

  it('nur Suche: Suchmaschinen dürfen abrufen (und sehen das noindex), alle anderen nicht', () => {
    const txt = robotsTxt({ host: 'surprise.psyber.tech', mode: 'search-only' });
    for (const crawler of SEARCH_CRAWLERS) expect(rulesFor(txt, crawler)).toEqual(['allow: /']);
    for (const other of ['GPTBot', 'ClaudeBot', 'CCBot', 'Bytespider', 'IrgendeinBot']) {
      expect(rulesFor(txt, other), other).toEqual(['disallow: /']);
    }
    expect(txt).not.toContain('Sitemap');
  });

  it('geschlossen (Vorschau): niemand', () => {
    const txt = robotsTxt({ host: 'psyber.tech', mode: 'closed', sitemap: 'https://x.test/s.xml' });
    expect(rulesFor(txt, 'Googlebot')).toEqual(['disallow: /']);
    expect(txt).not.toContain('Sitemap');
  });
});

describe('strukturierte Daten', () => {
  const home = 'https://psyber.tech/';
  const brand = {
    home,
    name: 'PSYber',
    alternateName: ['psyber.tech'],
    slogan: 'Betrüger hassen diesen Blick.',
    description: 'Beschreibung',
    logo: { url: 'https://psyber.tech/icon-512.png', size: 512 },
    areaServed: { name: 'Schweiz', code: 'CH' },
    knowsAbout: ['Phishing'],
  };

  it('Organisation: nur belegte Angaben, offene Felder fehlen ganz', () => {
    const node = organization({ ...brand, email: undefined, telephone: '' });
    expect(node).toMatchObject({
      '@type': 'Organization',
      '@id': 'https://psyber.tech/#organization',
      name: 'PSYber',
      url: home,
      logo: { '@type': 'ImageObject', url: 'https://psyber.tech/icon-512.png', width: 512 },
      areaServed: { '@type': 'Country', name: 'Schweiz', identifier: 'CH' },
    });
    for (const key of ['email', 'telephone', 'sameAs', 'address'])
      expect(node).not.toHaveProperty(key);
    // Sobald die Angaben da sind, erscheinen sie.
    expect(organization({ ...brand, email: 'hallo@psyber.tech' })).toHaveProperty(
      'email',
      'hallo@psyber.tech',
    );
  });

  it('Website und Seite verweisen aufeinander und auf die Organisation', () => {
    const site = website({
      url: home,
      name: 'PSYber',
      alternateName: ['psyber.tech'],
      language: 'de-CH',
      publisherHome: home,
    });
    expect(site).toMatchObject({
      '@type': 'WebSite',
      '@id': 'https://psyber.tech/#website',
      name: 'PSYber',
      url: home,
      publisher: { '@id': 'https://psyber.tech/#organization' },
    });
    const page = webPage({
      url: 'https://psyber.tech/checkliste',
      name: 'Checkliste',
      description: 'Text',
      language: 'de-CH',
      siteUrl: home,
      publisherHome: home,
      image: 'https://psyber.tech/og/checkliste.png',
      breadcrumb: true,
    });
    expect(page).toMatchObject({
      '@id': 'https://psyber.tech/checkliste#webpage',
      isPartOf: { '@id': 'https://psyber.tech/#website' },
      breadcrumb: { '@id': 'https://psyber.tech/checkliste#breadcrumb' },
      primaryImageOfPage: { width: 1200, height: 630 },
    });
    expect(page).not.toHaveProperty('about');
  });

  it('Pfad: nummeriert ab 1, der letzte Eintrag ist die Seite selbst', () => {
    const list = breadcrumbs('https://psyber.tech/checkliste', [
      { name: 'Startseite', url: home },
      { name: 'Checkliste', url: 'https://psyber.tech/checkliste' },
    ]);
    expect(list.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Startseite', item: home },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Checkliste',
        item: 'https://psyber.tech/checkliste',
      },
    ]);
  });

  it('graph lässt leere Knoten weg; die Ausgabe kann das Skript-Element nicht schliessen', () => {
    const data = graph(false, null, undefined, { '@type': 'Thing', name: '</script><b>&' });
    expect(data['@graph']).toHaveLength(1);
    const json = serializeJsonLd(data);
    expect(json).not.toMatch(/[<>&]/);
    expect(JSON.parse(json)).toEqual(data);
  });
});
