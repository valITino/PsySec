import type { Sites } from './sites.mjs';

export declare const isDevCommand: () => boolean;
export declare function loadSites(cwd?: string): { dev: boolean; sites: Sites };
