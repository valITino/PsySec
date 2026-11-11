// Kleiner statischer Server für gebaute Sites (Screenshots, E2E-Tests, lokale Kontrolle).
// Verhält sich bei Adressen wie Cloudflare-Assets und GitHub Pages:
//   /checkliste → checkliste.html, /ordner/ → ordner/index.html, sonst 404.html.
//
// Aufruf: node scripts/serve.mjs <verzeichnis> [--port 4321] [--base /PsySec]
import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

/**
 * @param {{ dir: string, port?: number, base?: string, quiet?: boolean }} options
 * @returns {Promise<import('node:http').Server>}
 */
export function serve({ dir, port = 4321, base = '', quiet = false }) {
  const root = resolve(dir);
  const prefix = base.replace(/\/+$/, '');

  const find = (pathname) => {
    const safe = normalize(decodeURIComponent(pathname)).replace(/^(\.\.[/\\])+/, '');
    const full = join(root, safe);
    if (full !== root && !full.startsWith(root + sep)) return null;
    const candidates = safe.endsWith('/')
      ? [join(full, 'index.html')]
      : [full, `${full}.html`, join(full, 'index.html')];
    return candidates.find((file) => existsSync(file) && statSync(file).isFile()) ?? null;
  };

  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://localhost');
    let pathname = url.pathname;
    if (prefix) {
      if (pathname === prefix) {
        res.writeHead(301, { Location: `${prefix}/${url.search}` }).end();
        return;
      }
      if (!pathname.startsWith(`${prefix}/`)) {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' }).end('404');
        return;
      }
      pathname = pathname.slice(prefix.length);
    }
    const file = find(pathname);
    if (!file) {
      const notFound = join(root, '404.html');
      res.writeHead(404, { 'Content-Type': TYPES['.html'] });
      if (existsSync(notFound)) createReadStream(notFound).pipe(res);
      else res.end('404');
      return;
    }
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] ?? 'application/octet-stream',
      'Cache-Control': 'no-store',
    });
    createReadStream(file).pipe(res);
  });

  return new Promise((done) => {
    server.listen(port, '127.0.0.1', () => {
      if (!quiet) console.log(`${root} → http://localhost:${port}${prefix}/`);
      done(server);
    });
  });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const args = process.argv.slice(2);
  const flag = (name, fallback) => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : fallback;
  };
  const dir = args.find(
    (arg) => !arg.startsWith('--') && arg !== flag('--port') && arg !== flag('--base'),
  );
  if (!dir) {
    console.error('Aufruf: node scripts/serve.mjs <verzeichnis> [--port 4321] [--base /PsySec]');
    process.exit(1);
  }
  await serve({ dir, port: Number(flag('--port', '4321')), base: flag('--base', '') });
}
