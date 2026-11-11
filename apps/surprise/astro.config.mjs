// @ts-check
import { loadSites } from '@psyber/config/astro-env';
import { cloudflareFiles, cspConfig } from '@psyber/config/security';
import { splitSiteUrl } from '@psyber/config/sites';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const { sites } = loadSites();
const { site, base } = splitSiteUrl(sites.surprise);

export default defineConfig({
  site,
  base: base || '/',
  output: 'static',
  trailingSlash: 'ignore',
  compressHTML: true,
  build: { format: 'file' },
  devToolbar: { enabled: false },
  markdown: { syntaxHighlight: false },
  server: { port: 4323 },
  security: { csp: cspConfig({ apiOrigin: sites.apiOrigin }) },
  integrations: [
    cloudflareFiles({
      apiOrigin: sites.apiOrigin,
      referrerPolicy: 'no-referrer',
      noindex: true,
      redirects: ['/ /gewinn 302', '/security.txt /.well-known/security.txt 301'],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: { assetsInlineLimit: 0 },
  },
});
