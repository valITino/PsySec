/**
 * Cloudflare Turnstile (Spam-Schutz), explizit gerendert und erst bei Bedarf geladen.
 * Das ist der einzige Request an Dritte, und nur auf Seiten mit Formular.
 */

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  execute(container: HTMLElement | string): void;
  reset(widgetId?: string): void;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

let loading: Promise<TurnstileApi> | null = null;

export function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (window.turnstile) resolve(window.turnstile);
      else reject(new Error('turnstile_unavailable'));
    };
    script.onerror = () => {
      loading = null;
      reject(new Error('turnstile_blocked'));
    };
    document.head.append(script);
  });
  return loading;
}

export interface TurnstileHandle {
  /** Liefert ein frisches Token; führt die Prüfung dafür bei Bedarf aus. */
  getToken(): Promise<string>;
  /** Nach dem Absenden: Token ist verbraucht. */
  reset(): void;
}

export interface TurnstileOptions {
  siteKey: string;
  /** Unsichtbar: nur sichtbar, wenn Cloudflare eine Interaktion verlangt */
  invisible?: boolean;
  theme?: 'dark' | 'light' | 'auto';
}

/** Ohne Site Key (z. B. Vorschau mit simulierter API) gibt es ein Platzhalter-Token. */
export function noTurnstile(): TurnstileHandle {
  return { getToken: () => Promise.resolve('no-turnstile'), reset: () => undefined };
}

export async function createTurnstile(
  container: HTMLElement,
  options: TurnstileOptions,
): Promise<TurnstileHandle> {
  const api = await loadTurnstile();
  let token: string | null = null;
  let pending: { resolve: (token: string) => void; reject: (error: Error) => void } | null = null;

  const widgetId = api.render(container, {
    sitekey: options.siteKey,
    theme: options.theme ?? 'dark',
    language: 'de',
    size: 'flexible',
    appearance: options.invisible ? 'interaction-only' : 'always',
    execution: 'execute',
    callback: (value: string) => {
      token = value;
      pending?.resolve(value);
      pending = null;
    },
    'expired-callback': () => {
      token = null;
    },
    'error-callback': () => {
      token = null;
      pending?.reject(new Error('turnstile_error'));
      pending = null;
      return true;
    },
  });

  return {
    getToken() {
      if (token) return Promise.resolve(token);
      return new Promise<string>((resolve, reject) => {
        pending = { resolve, reject };
        const timer = setTimeout(() => {
          if (pending) {
            pending = null;
            reject(new Error('turnstile_timeout'));
          }
        }, 30_000);
        const settle = pending;
        pending = {
          resolve: (value) => {
            clearTimeout(timer);
            settle.resolve(value);
          },
          reject: (error) => {
            clearTimeout(timer);
            settle.reject(error);
          },
        };
        api.execute(container);
      });
    },
    reset() {
      token = null;
      api.reset(widgetId);
    },
  };
}
