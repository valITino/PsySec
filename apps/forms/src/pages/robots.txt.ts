import { robotsTxt } from '@psyber/ui/lib/well-known';
import type { APIRoute } from 'astro';
import { sites } from '../lib/site.ts';

/** Die Umfrage darf gefunden werden; in der Vorschau wird nichts indexiert. */
export const GET: APIRoute = () =>
  new Response(robotsTxt({ host: 'forms.psyber.tech', mode: sites.preview ? 'closed' : 'open' }), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
