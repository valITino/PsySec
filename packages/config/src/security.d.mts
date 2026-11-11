import type { AstroIntegration, AstroUserConfig } from 'astro';

type CspConfig = Exclude<NonNullable<NonNullable<AstroUserConfig['security']>['csp']>, boolean>;

/** Direktiven in der Form, die Astros `security.csp.directives` erwartet */
export type CspDirectives = NonNullable<CspConfig['directives']>;

export declare const TURNSTILE_ORIGIN: string;

export declare function cspDirectives(options?: { apiOrigin?: string }): CspDirectives;

export interface HeadersOptions {
  apiOrigin?: string;
  referrerPolicy?: string;
  noindex?: boolean;
  noindexPaths?: string[];
}

export declare function headersFile(options?: HeadersOptions): string;

export declare function cloudflareFiles(
  options?: HeadersOptions & { redirects?: string[] },
): AstroIntegration;
