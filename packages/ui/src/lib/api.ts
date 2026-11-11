/**
 * Kleiner Client für api.psyber.tech.
 * Ist `base` leer, wird nichts gesendet: Die Antwort ist simuliert (Vorschau, Phase 1, Tests).
 */

export interface ApiResult {
  ok: boolean;
  /** HTTP-Status; 0 bei Netzwerkfehler oder Zeitüberschreitung */
  status: number;
  /** Fehlercode der API, z. B. `invalid_payload` oder `rate_limited` */
  error?: string;
  /** `true`, wenn die Antwort simuliert wurde */
  mock?: boolean;
}

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

export async function postJson(
  base: string,
  path: string,
  body: unknown,
  options: { timeout?: number } = {},
): Promise<ApiResult> {
  if (!base) {
    await wait(700);
    return { ok: true, status: 200, mock: true };
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), options.timeout ?? 12_000);
  try {
    const response = await fetch(`${base}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    let error: string | undefined;
    if (!response.ok) {
      try {
        const data = (await response.json()) as { error?: unknown };
        if (typeof data.error === 'string') error = data.error;
      } catch {
        // Antwort ohne JSON: der Status genügt.
      }
    }
    return { ok: response.ok, status: response.status, ...(error ? { error } : {}) };
  } catch {
    return { ok: false, status: 0, error: 'network' };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Anonymer Zähler (survey_started, bait_click, checklist_click).
 * Läuft im Hintergrund weiter, auch wenn die Seite verlassen wird; Fehler sind egal.
 */
export function sendEvent(base: string, event: string, s?: number): void {
  if (!base) return;
  const body = JSON.stringify(s ? { event, s } : { event });
  try {
    void fetch(`${base}/v1/event`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: true,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    }).catch(() => undefined);
  } catch {
    // Zählen ist nie wichtiger als die Seite.
  }
}
