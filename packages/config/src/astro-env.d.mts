import type { Sites } from './sites.mjs';

export declare const isDevCommand: () => boolean;
export declare function loadSites(cwd?: string): { dev: boolean; sites: Sites };

/** Bricht den Build bei Cloudflare (Workers Builds) ab, wenn der Turnstile Site Key fehlt. */
export declare function requireTurnstile(sites: Sites, app: string): void;
