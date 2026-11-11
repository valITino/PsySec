// Prüft Header, Weiterleitungen und 404 der drei Websites so, wie Cloudflare sie ausliefert:
// Startet nacheinander `wrangler dev` (Workers-Laufzeit lokal, mit _headers und _redirects)
// für apps/web, apps/forms und apps/surprise und fragt die wichtigsten Adressen ab.
//
// Aufruf: pnpm build && pnpm check:headers
// Es wird nichts deployt und kein Cloudflare-Konto gebraucht.
import { spawn } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { setTimeout as sleep } from 'node:timers/promises';

const API = 'https://api.psyber.tech';
const HSTS = 'max-age=31536000; includeSubDomains';
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Header, die jede HTML-Antwort tragen muss. */
const common = (referrer) => ({
  'strict-transport-security': HSTS,
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': referrer,
  'cross-origin-opener-policy': 'same-origin',
  'cross-origin-resource-policy': 'same-origin',
});

const CSP_PARTS = [
  "frame-ancestors 'none'",
  "base-uri 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `connect-src 'self' ${API}`,
  'upgrade-insecure-requests',
];

const SITES = [
  {
    app: 'web',
    port: 8801,
    referrer: 'strict-origin-when-cross-origin',
    pages: ['/', '/checkliste', '/impressum', '/datenschutz', '/styleguide'],
    noindex: ['/styleguide'],
    og: '/og/psyber.png',
    redirects: [
      ['/umfrage', 302, 'https://forms.psyber.tech/?quelle=website'],
      ['/security.txt', 301, '/.well-known/security.txt'],
      ['/checkliste/', 307, '/checkliste'],
      ['/checkliste.html', 307, '/checkliste'],
    ],
    notFound: ['/gibt-es-nicht', 'Layer 8 nicht gefunden'],
  },
  {
    app: 'forms',
    port: 8802,
    referrer: 'strict-origin-when-cross-origin',
    pages: ['/'],
    noindex: [],
    og: '/og/umfrage.png',
    redirects: [['/security.txt', 301, '/.well-known/security.txt']],
    notFound: ['/gibt-es-nicht', 'Layer 8 nicht gefunden'],
  },
  {
    app: 'surprise',
    port: 8803,
    referrer: 'no-referrer',
    pages: ['/gewinn'],
    noindex: ['/gewinn'],
    redirects: [
      ['/', 302, '/gewinn'],
      ['/security.txt', 301, '/.well-known/security.txt'],
    ],
    notFound: ['/gibt-es-nicht', 'Layer 8 nicht gefunden'],
  },
];

const problems = [];
let checks = 0;
const expect = (ok, message) => {
  checks++;
  if (!ok) problems.push(message);
};

async function waitFor(url, child) {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (child.exitCode !== null) throw new Error('wrangler dev hat sich beendet');
    try {
      await fetch(url, { redirect: 'manual' });
      return;
    } catch {
      await sleep(500);
    }
  }
  throw new Error(`${url} antwortet nicht`);
}

async function checkSite(site) {
  const base = `http://127.0.0.1:${site.port}`;
  const get = (path) => fetch(`${base}${path}`, { redirect: 'manual' });
  const label = (path) => `${site.app} ${path}`;

  for (const path of site.pages) {
    const response = await get(path);
    const html = await response.text();
    expect(response.status === 200, `${label(path)}: Status ${response.status} statt 200`);
    for (const [name, value] of Object.entries(common(site.referrer))) {
      expect(
        response.headers.get(name) === value,
        `${label(path)}: ${name} ist «${response.headers.get(name)}», erwartet «${value}»`,
      );
    }
    const csp = response.headers.get('content-security-policy') ?? '';
    for (const part of CSP_PARTS) {
      expect(csp.includes(part), `${label(path)}: Header-CSP ohne «${part}»`);
    }
    const permissions = response.headers.get('permissions-policy') ?? '';
    for (const feature of ['camera=()', 'microphone=()', 'geolocation=()', 'payment=()']) {
      expect(permissions.includes(feature), `${label(path)}: Permissions-Policy ohne ${feature}`);
    }
    expect(
      response.headers.get('cache-control') === 'public, max-age=300, must-revalidate',
      `${label(path)}: Cache-Control ist «${response.headers.get('cache-control')}»`,
    );
    expect(!response.headers.has('set-cookie'), `${label(path)}: setzt ein Cookie`);
    const robots = response.headers.get('x-robots-tag');
    expect(
      site.noindex.includes(path) ? robots === 'noindex, nofollow' : robots === null,
      `${label(path)}: X-Robots-Tag ist «${robots}»`,
    );

    // CSP im Meta-Tag: Standard «nichts», Skripte und Styles nur von uns bzw. per Hash.
    const meta = /<meta http-equiv="content-security-policy" content="([^"]*)"/i.exec(html)?.[1];
    expect(Boolean(meta), `${label(path)}: kein CSP-Meta-Tag`);
    if (meta) {
      expect(
        meta.includes("default-src 'none'"),
        `${label(path)}: Meta-CSP ohne default-src 'none'`,
      );
      expect(!/unsafe-inline|unsafe-eval/.test(meta), `${label(path)}: Meta-CSP mit unsafe-*`);
      expect(/script-src 'self'/.test(meta), `${label(path)}: Meta-CSP ohne script-src 'self'`);
    }
    // Keine Inline-Styles, keine Inline-Skripte, keine fremden Quellen im HTML.
    expect(!/<[a-z][^>]*\sstyle="/i.test(html), `${label(path)}: Inline-style-Attribut im HTML`);
    expect(
      !/<(script|link|img|iframe)\b[^>]*\s(src|href)="https?:\/\/(?!(www\.)?psyber\.tech|forms\.psyber\.tech|surprise\.psyber\.tech)/i.test(
        html,
      ),
      `${label(path)}: bindet eine fremde Quelle ein`,
    );
  }

  // Gehashte Assets: ein Jahr, unveränderlich (und nur dieser eine Wert)
  const asset = readdirSync(`apps/${site.app}/dist/_astro`).find((file) => file.endsWith('.css'));
  const assetResponse = await get(`/_astro/${asset}`);
  await assetResponse.arrayBuffer();
  expect(assetResponse.status === 200, `${site.app} Asset: Status ${assetResponse.status}`);
  expect(
    assetResponse.headers.get('cache-control') === IMMUTABLE,
    `${site.app} Asset: Cache-Control ist «${assetResponse.headers.get('cache-control')}»`,
  );
  expect(
    assetResponse.headers.get('x-content-type-options') === 'nosniff',
    `${site.app} Asset: ohne nosniff`,
  );

  // Vorschaubilder dürfen von anderen Websites eingebunden werden, alles andere nicht.
  if (site.og) {
    const response = await get(site.og);
    await response.arrayBuffer();
    expect(response.status === 200, `${label(site.og)}: Status ${response.status}`);
    expect(
      response.headers.get('cross-origin-resource-policy') === 'cross-origin',
      `${label(site.og)}: CORP ist «${response.headers.get('cross-origin-resource-policy')}»`,
    );
  }

  for (const [path, status, location] of site.redirects) {
    const response = await get(path);
    await response.arrayBuffer();
    const target = response.headers.get('location');
    expect(
      response.status === status && target === location,
      `${label(path)}: ${response.status} → «${target}», erwartet ${status} → «${location}»`,
    );
  }

  const [missing, text] = site.notFound;
  const notFound = await get(missing);
  const body = await notFound.text();
  expect(notFound.status === 404, `${label(missing)}: Status ${notFound.status} statt 404`);
  expect(body.includes(text), `${label(missing)}: 404-Seite ohne «${text}»`);

  const security = await get('/.well-known/security.txt');
  const securityText = await security.text();
  expect(security.status === 200, `${site.app} security.txt: Status ${security.status}`);
  expect(
    /^Contact: mailto:security@psyber\.tech$/m.test(securityText) &&
      /^Expires: \d{4}-\d{2}-\d{2}T/m.test(securityText),
    `${site.app} security.txt: Contact oder Expires fehlt`,
  );
  const humans = await get('/humans.txt');
  await humans.arrayBuffer();
  expect(humans.status === 200, `${site.app} humans.txt: Status ${humans.status}`);
  const robots = await get('/robots.txt');
  const robotsText = await robots.text();
  expect(robots.status === 200, `${site.app} robots.txt: Status ${robots.status}`);
  // Seiten mit «noindex» dürfen für Suchmaschinen nicht gesperrt sein: Ihr «noindex» sähe sonst
  // kein Crawler. surprise lässt darum Suchmaschinen herein und sperrt alle anderen aus.
  if (site.app === 'surprise') {
    expect(
      /User-agent: Googlebot[\s\S]*?\nAllow: \/\n[\s\S]*User-agent: \*\nDisallow: \/\n/.test(
        robotsText,
      ),
      'surprise robots.txt: Suchmaschinen müssen abrufen dürfen, alle anderen nicht',
    );
  } else {
    expect(!/^Disallow:/m.test(robotsText), `${site.app} robots.txt: enthält Disallow`);
  }
  if (site.app === 'web') {
    expect(
      robotsText.includes('Sitemap: https://psyber.tech/sitemap-index.xml'),
      'web robots.txt: Sitemap fehlt',
    );
  }

  // _headers und _redirects sind Konfiguration, keine Dateien zum Abrufen.
  for (const file of ['/_headers', '/_redirects']) {
    const response = await get(file);
    await response.arrayBuffer();
    expect(
      response.status === 404,
      `${label(file)}: wird ausgeliefert (Status ${response.status})`,
    );
  }
}

for (const site of SITES) {
  const before = checks;
  const child = spawn('pnpm', ['exec', 'wrangler', 'dev', '--port', String(site.port)], {
    cwd: `apps/${site.app}`,
    env: { ...process.env, WRANGLER_SEND_METRICS: 'false', CI: '1' },
    stdio: 'ignore',
    detached: true,
  });
  try {
    await waitFor(`http://127.0.0.1:${site.port}/robots.txt`, child);
    await checkSite(site);
    console.log(`✓ ${site.app.padEnd(9)} ${checks - before} Prüfungen`);
  } catch (error) {
    problems.push(`${site.app}: ${error instanceof Error ? error.message : String(error)}`);
  } finally {
    try {
      process.kill(-child.pid, 'SIGTERM'); // ganze Prozessgruppe (wrangler und workerd)
    } catch {
      // schon beendet
    }
    await sleep(800);
  }
}

if (problems.length > 0) {
  console.error(`\n${problems.length} Problem(e):`);
  for (const problem of problems) console.error(`  ✗ ${problem}`);
  process.exit(1);
}
console.log(`\nAlle ${checks} Prüfungen bestanden.`);
