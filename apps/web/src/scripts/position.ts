/**
 * Position merken und wiederfinden: nach dem Neuladen, nach «Zurück» ohne Seiten-Cache und wenn
 * das Handy den Tab im Hintergrund entladen hat.
 *
 * Der Browser stellt in diesen Fällen die alte Scrollposition wieder her, kennt dafür aber nur
 * eine Zahl in Pixeln. Die Startseite bekommt ihre volle Länge erst nach und nach (zurückgestellte
 * Teile, angepinnte Strecke im Drehbuch): Dieselbe Zahl zeigt dann auf einen anderen Abschnitt.
 * Darum merkt sich die Seite selbst, welcher Abschnitt in der Bildmitte steht und wo, und
 * home.ts stellt genau das wieder her.
 *
 * Gemerkt wird im Verlaufseintrag des Browsers (history.state): kein Cookie, kein Web-Speicher,
 * nichts verlässt das Gerät.
 */

export interface View {
  /** Nummer des Abschnitts: die Kinder von <main>, danach der Footer */
  index: number;
  /** Abstand seiner Oberkante zum oberen Bildrand in px */
  top: number;
}

const blocks = (): HTMLElement[] => [
  ...document.querySelectorAll<HTMLElement>('main > *, body > footer'),
];

const isView = (value: unknown): value is View =>
  typeof value === 'object' &&
  value !== null &&
  Number.isInteger((value as View).index) &&
  Number.isFinite((value as View).top);

/** Der Abschnitt in der Bildmitte und seine Lage. Ganz oben gibt es nichts zu merken. */
function currentView(): View | null {
  if (window.scrollY < 1) return null;
  const middle = window.innerHeight / 2;
  const list = blocks();
  const index = list.findIndex((element) => element.getBoundingClientRect().bottom > middle);
  const block = list[index];
  return block ? { index, top: Math.round(block.getBoundingClientRect().top) } : null;
}

/** Wohin scrollen, damit die gemerkte Ansicht wieder stimmt? `null`, wenn es den Abschnitt nicht gibt. */
export function scrollTopFor(view: View): number | null {
  const block = blocks()[view.index];
  if (!block) return null;
  return Math.max(0, Math.round(window.scrollY + block.getBoundingClientRect().top - view.top));
}

/** Die gemerkte Ansicht, falls die Seite neu geladen oder über den Verlauf geöffnet wurde. */
export function storedView(): View | null {
  const [navigation] = performance.getEntriesByType('navigation');
  const type = (navigation as PerformanceNavigationTiming | undefined)?.type;
  if (type !== 'reload' && type !== 'back_forward') return null;
  const state: unknown = window.history.state;
  if (typeof state !== 'object' || state === null) return null;
  const view = (state as { view?: unknown }).view;
  return isView(view) ? { index: view.index, top: view.top } : null;
}

/** Merkt die Ansicht, sobald das Scrollen zur Ruhe kommt (höchstens zweimal pro Sekunde). */
export function rememberView(): void {
  let timer = 0;
  let last = 0;
  const save = () => {
    last = Date.now();
    const state: unknown = window.history.state;
    const rest = typeof state === 'object' && state !== null ? state : {};
    try {
      window.history.replaceState({ ...rest, view: currentView() }, '');
    } catch {
      // Manche Browser begrenzen die Zahl dieser Aufrufe: dann eben beim nächsten Halt.
    }
  };
  window.addEventListener(
    'scroll',
    () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(save, Math.max(250, 500 - (Date.now() - last)));
    },
    { passive: true },
  );
}
