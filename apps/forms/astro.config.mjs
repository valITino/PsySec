// @ts-check
import preact from '@astrojs/preact';
import { loadSites, requireTurnstile } from '@psyber/config/astro-env';
import { cloudflareFiles, cspConfig } from '@psyber/config/security';
import { splitSiteUrl } from '@psyber/config/sites';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const { sites } = loadSites();
requireTurnstile(sites, 'forms');
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
  security: { csp: cspConfig({ apiOrigin: sites.apiOrigin }) },
  integrations: [
    preact(),
    cloudflareFiles({
      apiOrigin: sites.apiOrigin,
      hstsPreload: sites.hstsPreload,
      redirects: ['/security.txt /.well-known/security.txt 301'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
