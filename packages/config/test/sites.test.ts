import { afterEach, describe, expect, it, vi } from 'vitest';
import { requireTurnstile } from '../src/astro-env.mjs';
import { cspConfig, cspDirectives, headersFile } from '../src/security.mjs';
import { joinPath, resolveSites, splitSiteUrl } from '../src/sites.mjs';

describe('resolveSites', () => {
  it('nutzt in Produktion die echten Domains', () => {
    const sites = resolveSites({});
    expect(sites.web).toBe('https://psyber.tech');
    expect(sites.forms).toBe('https://forms.psyber.tech');
    expect(sites.surprise).toBe('https://surprise.psyber.tech');
    expect(sites.api).toBe('https://api.psyber.tech');
    expect(sites.apiOrigin).toBe('https://api.psyber.tech');
    expect(sites.apiMock).toBe(false);
    expect(sites.phase).toBe('survey');
    expect(sites.preview).toBe(false);
  });

  it('nutzt im Dev-Modus localhost', () => {
    const sites = resolveSites({}, { dev: true });
    expect(sites.web).toBe('http://localhost:4321');
    expect(sites.api).toBe('http://localhost:8787');
  });

  it('kennt nur die Phasen survey und launch', () => {
    expect(resolveSites({ PUBLIC_SITE_PHASE: 'launch' }).phase).toBe('launch');
    expect(resolveSites({ PUBLIC_SITE_PHASE: 'irgendwas' }).phase).toBe('survey');
  });

  it('simuliert die API bei PUBLIC_API_BASE=mock', () => {
    const sites = resolveSites({ PUBLIC_API_BASE: 'mock' });
    expect(sites.apiMock).toBe(true);
    expect(sites.api).toBe('');
    expect(sites.apiOrigin).toBe('');
  });

  it('entfernt Slashes am Ende', () => {
    const sites = resolveSites({ PUBLIC_WEB_URL: 'https://example.github.io/Repo/' });
    expect(sites.web).toBe('https://example.github.io/Repo');
  });
});

describe('splitSiteUrl und joinPath', () => {
  it('trennt Origin und Basis-Pfad', () => {
    expect(splitSiteUrl('https://psyber.tech')).toEqual({ site: 'https://psyber.tech', base: '' });
    expect(splitSiteUrl('https://example.github.io/Repo/forms')).toEqual({
      site: 'https://example.github.io',
      base: '/Repo/forms',
    });
  });

  it('baut Links mit und ohne Basis-Pfad', () => {
    expect(joinPath('', '/')).toBe('/');
    expect(joinPath('', '/checkliste')).toBe('/checkliste');
    expect(joinPath('/Repo', '/')).toBe('/Repo/');
    expect(joinPath('/Repo', '/#kontakt')).toBe('/Repo/#kontakt');
    expect(joinPath('/Repo', 'checkliste')).toBe('/Repo/checkliste');
  });
});

describe('Security-Header', () => {
  it('erlaubt im Meta-Tag nur die eigene Herkunft und die API', () => {
    const directives = cspDirectives({ apiOrigin: 'https://api.psyber.tech' });
    expect(directives).toContain("default-src 'none'");
    expect(directives).toContain("connect-src 'self' https://api.psyber.tech");
    expect(directives.join(';')).not.toContain('unsafe-inline');
  });

  it('schreibt die Header, die per Meta nicht gehen', () => {
    const file = headersFile({ apiOrigin: 'https://api.psyber.tech' });
    expect(file).toContain("frame-ancestors 'none'");
    expect(file).toContain("base-uri 'none'");
    expect(file).toContain("object-src 'none'");
    expect(file).toContain('Strict-Transport-Security: max-age=31536000; includeSubDomains');
    expect(file).toContain('X-Content-Type-Options: nosniff');
    expect(file).toContain('Referrer-Policy: strict-origin-when-cross-origin');
    expect(file).toContain('Cross-Origin-Opener-Policy: same-origin');
    expect(file).toContain('max-age=31536000, immutable');
    expect(file).not.toContain('X-Robots-Tag');
  });

  it('setzt für surprise no-referrer und noindex', () => {
    const file = headersFile({ referrerPolicy: 'no-referrer', noindex: true });
    expect(file).toContain('Referrer-Policy: no-referrer');
    expect(file).toContain('X-Robots-Tag: noindex, nofollow');
    expect(file).toContain("connect-src 'self';");
  });

  it("behält 'self' für Skripte und Styles, auch wenn eine Seite Turnstile ergänzt", () => {
    const csp = cspConfig({ apiOrigin: 'https://api.psyber.tech' });
    expect(csp.algorithm).toBe('SHA-256');
    expect(csp.scriptDirective?.resources).toEqual(["'self'"]);
    expect(csp.styleDirective?.resources).toEqual(["'self'"]);
    expect(csp.directives).toContain("default-src 'none'");
  });

  it('hängt «preload» nur auf Wunsch an den HSTS-Header', () => {
    expect(headersFile()).toContain(
      'Strict-Transport-Security: max-age=31536000; includeSubDomains\n',
    );
    expect(headersFile({ hstsPreload: true })).toContain(
      'Strict-Transport-Security: max-age=31536000; includeSubDomains; preload\n',
    );
    expect(resolveSites({}).hstsPreload).toBe(false);
    expect(resolveSites({ PUBLIC_HSTS_PRELOAD: 'true' }).hstsPreload).toBe(true);
  });

  it('gibt nur die Vorschaubilder für andere Websites frei', () => {
    const file = headersFile();
    expect(file).toContain('Cross-Origin-Resource-Policy: same-origin');
    expect(file).toMatch(
      /\/og\/\*\n {2}! Cross-Origin-Resource-Policy\n {2}Cross-Origin-Resource-Policy: cross-origin/,
    );
  });
});

describe('requireTurnstile', () => {
  const live = resolveSites({});
  const withKey = resolveSites({ PUBLIC_TURNSTILE_SITE_KEY: '1x00000000000000000000AA' });
  const mock = resolveSites({ PUBLIC_API_BASE: 'mock' });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('bricht den Build bei Cloudflare ab, wenn der Site Key fehlt', () => {
    vi.stubEnv('WORKERS_CI', '1');
    expect(() => requireTurnstile(live, 'forms')).toThrow(/PUBLIC_TURNSTILE_SITE_KEY/);
    expect(() => requireTurnstile(withKey, 'forms')).not.toThrow();
    expect(() => requireTurnstile(mock, 'forms')).not.toThrow();
  });

  it('lässt lokale Builds und CI ohne Site Key durch', () => {
    vi.stubEnv('WORKERS_CI', '');
    expect(() => requireTurnstile(live, 'web')).not.toThrow();
  });
});
