import { robotsTxt } from '@psyber/ui/lib/well-known';
import type { APIRoute } from 'astro';

/**
 * Diese Site soll in keiner Suchmaschine auftauchen. Dafür sorgt das «noindex» auf jeder Antwort
 * (Meta-Tag und X-Robots-Tag). Suchmaschinen dürfen die Seiten abrufen, damit sie es sehen;
 * alle anderen Crawler bleiben draussen.
 */
export const GET: APIRoute = () =>
  new Response(robotsTxt({ host: 'surprise.psyber.tech', mode: 'search-only' }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
