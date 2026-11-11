// @ts-check
import sitemap from '@astrojs/sitemap';
import { loadSites } from '@psyber/config/astro-env';
import { cloudflareFiles, cspDirectives } from '@psyber/config/security';
import { splitSiteUrl } from '@psyber/config/sites';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'astro/config';

const { sites } = loadSites();
const { site, base } = splitSiteUrl(sites.web);

// https://docs.astro.build/en/reference/configuration-reference/
export default defineConfig({
  site,
  base: base || '/',
  output: 'static',
  trailingSlash: 'ignore',
  // Astro 7 entfernt sonst Leerzeichen zwischen Inline-Elementen nach JSX-Regeln.
  compressHTML: true,
  build: {
    // /checkliste statt /checkliste/: passt zu den Links im Auftrag und zu Cloudflare-Assets.
    format: 'file',
  },
  devToolbar: { enabled: false },
  // Kein Syntax-Highlighting nötig; Shiki würde Inline-Styles erzeugen (CSP).
  markdown: { syntaxHighlight: false },
  server: { port: 4321 },
  security: {
    csp: {
      algorithm: 'SHA-256',
      directives: cspDirectives({ apiOrigin: sites.apiOrigin }),
    },
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/(styleguide|404)(\.html)?\/?$/.test(page),
    }),
    cloudflareFiles({
      apiOrigin: sites.apiOrigin,
      noindexPaths: ['/styleguide'],
      redirects: [
        '# Kurzadressen',
        `/umfrage ${sites.forms}/?quelle=website 302`,
        '/security.txt /.well-known/security.txt 301',
      ],
    }),
  ],
  vite: {
    plugins: [tailwindcss()],
    build: {
      // Keine data:-URIs: so bleibt die CSP bei img-src und font-src auf 'self'.
      assetsInlineLimit: 0,
    },
  },
});
