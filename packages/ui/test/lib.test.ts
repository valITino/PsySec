import { describe, expect, it } from 'vitest';
import {
  amberEnds,
  arcPath,
  crossLinks,
  shell,
  stemNodes,
  whiteNodes,
} from '../src/lib/psi-net-data.ts';
import { humansTxt, securityTxt } from '../src/lib/well-known.ts';
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

describe('Psi-Netz', () => {
  it('hat 11 Schalenpunkte, 7 Stielknoten und 12 Querverbindungen', () => {
    expect(shell).toHaveLength(11);
    expect(stemNodes).toHaveLength(7);
    expect(crossLinks).toHaveLength(12);
  });

  it('zeichnet den gemeinsamen Punkt (60, 92) nur einmal', () => {
    expect(whiteNodes).toHaveLength(9 + 7 - 1);
    expect(whiteNodes.filter(([x, y]) => x === 60 && y === 92)).toHaveLength(1);
  });

  it('hat drei amberfarbene Enden', () => {
    expect(amberEnds).toEqual([
      [12, 22],
      [108, 22],
      [60, 8],
    ]);
  });

  it('berechnet die Signalbögen von −128° bis −52°', () => {
    expect(arcPath(7)).toBe('M55.69 2.48A7 7 0 0 1 64.31 2.48');
    expect(arcPath(16)).toBe('M50.15 -4.61A16 16 0 0 1 69.85 -4.61');
  });
});
