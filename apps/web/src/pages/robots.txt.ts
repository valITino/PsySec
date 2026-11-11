import type { APIRoute } from 'astro';
import { absoluteUrl, sites } from '../config/site.ts';

/** In der Vorschau wird nichts indexiert; in Produktion alles ausser dem Styleguide. */
export const GET: APIRoute = () => {
  const lines = sites.preview
    ? ['User-agent: *', 'Disallow: /']
    : [
        'User-agent: *',
        'Allow: /',
        'Disallow: /styleguide',
        '',
        `Sitemap: ${absoluteUrl('/sitemap-index.xml')}`,
      ];
  return new Response(`${lines.join('\n')}\n`, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
