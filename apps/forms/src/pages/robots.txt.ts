import type { APIRoute } from 'astro';
import { sites } from '../lib/site.ts';

/** Die Umfrage darf gefunden werden; in der Vorschau wird nichts indexiert. */
export const GET: APIRoute = () =>
  new Response(sites.preview ? 'User-agent: *\nDisallow: /\n' : 'User-agent: *\nAllow: /\n', {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
