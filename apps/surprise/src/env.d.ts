/// <reference types="astro/client" />

interface ImportMetaEnv {
  /** Basis-URL der API. Dev: http://localhost:8787, Prod: https://api.psyber.tech, `mock` simuliert. */
  readonly PUBLIC_API_BASE?: string;
  readonly PUBLIC_TURNSTILE_SITE_KEY?: string;
  /** `survey` (Standard, keine Preise) oder `launch` */
  readonly PUBLIC_SITE_PHASE?: string;
  readonly PUBLIC_WEB_URL?: string;
  readonly PUBLIC_FORMS_URL?: string;
  readonly PUBLIC_SURPRISE_URL?: string;
  /** `true`: Vorschau (z. B. GitHub Pages) mit noindex und Hinweis */
  readonly PUBLIC_PREVIEW?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
