import type { Env } from '../env.ts';

const VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

export type TurnstileResult = 'ok' | 'failed' | 'unavailable';

/**
 * Prüft ein Turnstile-Token serverseitig.
 * Die IP-Adresse geben wir bewusst nicht mit (Datensparsamkeit; sie ist optional).
 */
export async function verifyTurnstile(env: Env, token: string): Promise<TurnstileResult> {
  if (!env.TURNSTILE_SECRET) return 'unavailable';
  try {
    const response = await fetch(VERIFY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ secret: env.TURNSTILE_SECRET, response: token }),
    });
    if (!response.ok) return 'unavailable';
    const result = (await response.json()) as { success?: boolean };
    return result.success === true ? 'ok' : 'failed';
  } catch {
    return 'unavailable';
  }
}
