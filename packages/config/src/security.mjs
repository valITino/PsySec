// CSP-Direktiven für Astros `security.csp` (Meta-Tag mit Hashes) und die Datei `_headers`
// für Cloudflare (Direktiven, die per Meta nicht gehen, plus die übrigen Security-Header).
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const TURNSTILE_ORIGIN = 'https://challenges.cloudflare.com';

/**
 * Direktiven für das Meta-Tag. `script-src` und `style-src` ergänzt Astro selbst (mit Hashes).
 * @param {{ apiOrigin?: string }} options
 * @returns {string[]}
 */
export function cspDirectives({ apiOrigin = '' } = {}) {
  const connect = ["'self'", apiOrigin].filter(Boolean).join(' ');
  return [
    "default-src 'none'",
    "img-src 'self'",
    "font-src 'self'",
    `connect-src ${connect}`,
    "manifest-src 'self'",
    "form-action 'self'",
    "base-uri 'none'",
    "object-src 'none'",
  ];
}

/** Alles aus, was die Sites nicht brauchen. */
const PERMISSIONS_POLICY = [
  'accelerometer=()',
  'autoplay=()',
  'browsing-topics=()',
  'camera=()',
  'display-capture=()',
  'encrypted-media=()',
  'fullscreen=()',
  'geolocation=()',
  'gyroscope=()',
  'hid=()',
  'idle-detection=()',
  'magnetometer=()',
  'microphone=()',
  'midi=()',
  'payment=()',
  'picture-in-picture=()',
  'publickey-credentials-get=()',
  'screen-wake-lock=()',
  'serial=()',
  'usb=()',
  'xr-spatial-tracking=()',
].join(', ');

/**
 * Inhalt der Datei `_headers`.
 * @param {{
 *   apiOrigin?: string,
 *   referrerPolicy?: string,
 *   noindex?: boolean,
 *   noindexPaths?: string[],
 * }} options
 */
export function headersFile({
  apiOrigin = '',
  referrerPolicy = 'strict-origin-when-cross-origin',
  noindex = false,
  noindexPaths = [],
} = {}) {
  const connect = ["'self'", apiOrigin].filter(Boolean).join(' ');
  const csp = [
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'self'",
    `connect-src ${connect}`,
    'upgrade-insecure-requests',
  ].join('; ');

  const lines = [
    '# Generiert beim Build von @psyber/config/security. Nicht von Hand ändern.',
    '# Skript- und Style-Hashes stehen im CSP-Meta-Tag jeder Seite (Astro security.csp).',
    '',
    '/*',
    `  Content-Security-Policy: ${csp}`,
    '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    `  Referrer-Policy: ${referrerPolicy}`,
    `  Permissions-Policy: ${PERMISSIONS_POLICY}`,
    '  Cross-Origin-Opener-Policy: same-origin',
    '  Cross-Origin-Resource-Policy: same-origin',
    '  Cache-Control: public, max-age=300, must-revalidate',
    ...(noindex ? ['  X-Robots-Tag: noindex, nofollow'] : []),
    '',
    '# Gehashte Assets: ein Jahr, unveränderlich',
    '/_astro/*',
    '  ! Cache-Control',
    '  Cache-Control: public, max-age=31536000, immutable',
    '',
    ...noindexPaths.flatMap((path) => [path, '  X-Robots-Tag: noindex, nofollow', '']),
  ];
  return lines.join('\n');
}

/**
 * Astro-Integration: schreibt `_headers` (und optional `_redirects`) ins Build-Verzeichnis.
 * @param {Parameters<typeof headersFile>[0] & { redirects?: string[] }} options
 * @returns {import('astro').AstroIntegration}
 */
export function cloudflareFiles(options = {}) {
  const { redirects = [], ...headerOptions } = options;
  return {
    name: '@psyber/config/cloudflare-files',
    hooks: {
      'astro:build:done': async ({ dir, logger }) => {
        const outDir = fileURLToPath(dir);
        await writeFile(`${outDir}_headers`, headersFile(headerOptions));
        if (redirects.length > 0) {
          await writeFile(`${outDir}_redirects`, `${redirects.join('\n')}\n`);
        }
        logger.info(`_headers${redirects.length > 0 ? ' und _redirects' : ''} geschrieben`);
      },
    },
  };
}
