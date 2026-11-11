// @ts-check
import preact from '@astrojs/preact';
import { loadSites } from '@psyber/config/astro-env';
import { cloudflareFiles, cspDirectives } from '@psyber/config/security';
import { splitSiteUrl } from '@psyber/config/sites';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const { sites } = loadSites();
const { site, base } = splitSiteUrl(sites.forms);

export default defineConfig({
  site,
  base: base || '/',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: { format: 'file' },
  devToolbar: { enabled: false },
  markdown: { syntaxHighlight: false },
  server: { port: 4322 },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: cspDirectives({ apiOrigin: sites.apiOrigin }),
    },
  },
  integrations: [
    preact(),
    cloudflareFiles({
      apiOrigin: sites.apiOrigin,
      redirects: ['/security.txt /.well-known/security.txt 301'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
