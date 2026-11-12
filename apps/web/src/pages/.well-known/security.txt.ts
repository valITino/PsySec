import { securityTxt } from '@psyber/ui/lib/well-known';
import type { APIRoute } from 'astro';
import { sites } from '../../config/site.ts';

/** RFC 9116. `Expires` = Build-Datum + 1 Jahr: mindestens einmal pro Jahr neu bauen. */
export const GET: APIRoute = () =>
  new Response(securityTxt(sites.web), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
