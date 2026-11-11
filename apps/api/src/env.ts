/** Bindings und Variablen des Workers (siehe wrangler.jsonc). */
export interface Env {
  DB: D1Database;
  /** Rate Limit für /v1/survey und /v1/contact: 5 pro Minute und IP */
  RL_FORMS?: RateLimit;
  /** Rate Limit für /v1/event: 30 pro Minute und IP */
  RL_EVENTS?: RateLimit;
  /** send_email-Binding für die Benachrichtigung bei Kontaktanfragen */
  NOTIFY?: SendEmail;

  /** Secret: wrangler secret put TURNSTILE_SECRET */
  TURNSTILE_SECRET?: string;
  /** Verifizierte Zieladresse der Benachrichtigung */
  NOTIFY_TO?: string;
  /** Absender der Benachrichtigung (Adresse der eigenen Domain) */
  NOTIFY_FROM?: string;
  /** Zusätzliche erlaubte Origins, kommagetrennt */
  ALLOWED_ORIGINS?: string;
  /** `development` erlaubt localhost als Origin */
  ENVIRONMENT?: string;
  /** `true`: HSTS-Header mit `preload` (erst nach stabilem Betrieb) */
  HSTS_PRELOAD?: string;
}

export type AppEnv = { Bindings: Env };
