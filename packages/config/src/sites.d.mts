export type SiteName = 'web' | 'forms' | 'surprise';

export declare const PROD_URLS: Readonly<Record<SiteName | 'api', string>>;
export declare const DEV_URLS: Readonly<Record<SiteName | 'api', string>>;
export declare const TURNSTILE_TEST_KEYS: Readonly<{ visible: string; invisible: string }>;

export interface Sites {
  web: string;
  forms: string;
  surprise: string;
  /** Basis-URL der API ohne Slash am Ende; leer, wenn die API im Browser simuliert wird */
  api: string;
  /** `true`: keine Netzwerk-Requests, Formulare antworten simuliert */
  apiMock: boolean;
  /** Origin der API für connect-src; leer bei simulierter API */
  apiOrigin: string;
  phase: 'survey' | 'launch';
  preview: boolean;
  turnstileSiteKey: string;
  /** HSTS-Header mit `preload` ausliefern */
  hstsPreload: boolean;
}

export declare function resolveSites(
  env: Record<string, string | boolean | undefined>,
  options?: { dev?: boolean },
): Sites;

export declare function splitSiteUrl(url: string): { site: string; base: string };

export declare function joinPath(base: string, path?: string): string;
