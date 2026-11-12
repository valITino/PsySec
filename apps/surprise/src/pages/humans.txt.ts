import { humansTxt } from '@psyber/ui/lib/well-known';
import type { APIRoute } from 'astro';
import { sites } from '../lib/site.ts';

export const GET: APIRoute = () =>
  new Response(humansTxt(sites.surprise), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
