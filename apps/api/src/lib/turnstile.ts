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
    const result = (await response.json()) as { success?: boolean; 'error-codes'?: unknown };
    if (result.success === true) return 'ok';
    // Ein falsches oder fehlendes Secret ist ein Fehler der Einrichtung, nicht der Besucherin.
    // Er soll auffallen statt als «Token ungültig» jede Einsendung still abzuweisen.
    const codes = Array.isArray(result['error-codes']) ? result['error-codes'].map(String) : [];
    if (codes.some((code) => code === 'invalid-input-secret' || code === 'missing-input-secret')) {
      console.error('turnstile_misconfigured');
      return 'unavailable';
    }
    return 'failed';
  } catch {
    return 'unavailable';
  }
}
