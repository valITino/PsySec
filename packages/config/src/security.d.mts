import type { AstroIntegration, AstroUserConfig } from 'astro';

type CspConfig = Exclude<NonNullable<NonNullable<AstroUserConfig['security']>['csp']>, boolean>;

/** Direktiven in der Form, die Astros `security.csp.directives` erwartet */
export type CspDirectives = NonNullable<CspConfig['directives']>;

export declare const TURNSTILE_ORIGIN: string;

export declare function cspDirectives(options?: { apiOrigin?: string }): CspDirectives;

/** Vollständige Einstellung für `security.csp` (mit `'self'` für Skripte und Styles) */
export declare function cspConfig(options?: { apiOrigin?: string }): CspConfig;

export interface HeadersOptions {
  apiOrigin?: string;
  referrerPolicy?: string;
  noindex?: boolean;
  noindexPaths?: string[];
  /** HSTS mit `preload` (erst nach stabilem Betrieb) */
  hstsPreload?: boolean;
}

export declare function headersFile(options?: HeadersOptions): string;

export declare function cloudflareFiles(
  options?: HeadersOptions & { redirects?: string[] },
): AstroIntegration;
