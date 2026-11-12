/**
 * «Erwischt!»: Übergang überspringen, anonyme Zähler senden, «Adressen lesen» umschalten,
 * Rabattcode kopieren. Die Seite fragt nichts ab und setzt keine Cookies.
 * Teaser und Übergang laufen als reine CSS-Zeitleiste (Teaser.astro); dieses Skript ist dafür
 * nicht nötig, es spult sie beim Überspringen nur vor.
 */
import { sendEvent } from '@psyber/ui/lib/api';
import { initTracking } from '@psyber/ui/lib/track';

// ---------------------------------------------------------------- Übergang überspringen
/** So viel bleibt vor dem Schnitt stehen: der Schluss der Spur, dann rastet die Auflösung ein. */
const SKIP_LEAD = 300;

/** Zeitangabe aus dem CSS in ms. Beim Bauen wird aus «2800ms» ein «2.8s»: beides lesen. */
function cssTime(value: string): number {
  const text = value.trim();
  const amount = Number.parseFloat(text);
  return text.endsWith('ms') ? amount : amount * 1000;
}

// Klick oder Taste: alle Animationen der Zeitleiste springen kurz vor den Schnitt (--sp-cut).
const skip = () => {
  window.removeEventListener('pointerdown', skip);
  window.removeEventListener('keydown', skip);
  if (typeof document.getAnimations !== 'function') return;
  const cut = cssTime(getComputedStyle(document.documentElement).getPropertyValue('--sp-cut'));
  if (!Number.isFinite(cut)) return;
  const target = cut - SKIP_LEAD;
  for (const animation of document.getAnimations()) {
    if (Number(animation.currentTime ?? 0) < target) animation.currentTime = target;
  }
};
window.addEventListener('pointerdown', skip);
window.addEventListener('keydown', skip);

// ---------------------------------------------------------------- Zähler bait_click
// Nur mit ?ref=umfrage, genau einmal: danach verschwinden die Parameter aus der Adresse,
// damit ein Neuladen nicht doppelt zählt. Gezählt wird nur eine anonyme Tagessumme.
const page = document.querySelector<HTMLElement>('[data-surprise]');
const params = new URLSearchParams(window.location.search);
if (page && params.get('ref') === 'umfrage') {
  const s = Number(params.get('s'));
  sendEvent(page.dataset.api ?? '', 'bait_click', {
    s: Number.isInteger(s) && s >= 1 && s <= 5 ? s : undefined,
  });
}

// Seitenaufruf und Klicks auf die beiden Knöpfe: ebenfalls nur anonyme Tagessummen. Muss vor dem
// Aufräumen der Adresse laufen, damit `?ref=` noch als Hinweis «kommt von uns» gelesen wird.
initTracking();

if (page && params.get('ref') === 'umfrage') {
  window.history.replaceState(null, '', window.location.pathname);
}

// ---------------------------------------------------------------- «Adressen lesen»
// Der Umschalter setzt data-show am Baustein; das CSS zeigt das passende Beispiel.
const reader = document.querySelector<HTMLElement>('[data-reader]');
if (reader) {
  const buttons = [...reader.querySelectorAll<HTMLButtonElement>('[data-reader-show]')];
  for (const button of buttons) {
    button.addEventListener('click', () => {
      const name = button.dataset.readerShow ?? 'echt';
      reader.dataset.show = name;
      for (const other of buttons) {
        other.setAttribute('aria-pressed', String(other === button));
      }
    });
  }
}

// ---------------------------------------------------------------- Code kopieren
const copyButton = document.querySelector<HTMLButtonElement>('[data-copy]');
const copyStatus = document.querySelector<HTMLElement>('[data-copy-status]');
const copyAction = copyButton?.querySelector<HTMLElement>('[data-copy-action]');
const copyCode = copyButton?.querySelector<HTMLElement>('[data-copy-code]');

/** Rückfall ohne Clipboard API: Text markieren und kopieren (ganz ohne Eingabefeld). */
function copyBySelection(element: HTMLElement): boolean {
  const selection = window.getSelection();
  if (!selection) return false;
  const range = document.createRange();
  range.selectNodeContents(element);
  selection.removeAllRanges();
  selection.addRange(range);
  try {
    // Veraltet, aber der einzige Weg ohne Clipboard API (ältere Browser, kein HTTPS).
    const legacy = document as unknown as { execCommand(command: string): boolean };
    return legacy.execCommand('copy');
  } catch {
    return false;
  } finally {
    selection.removeAllRanges();
  }
}

async function copyText(text: string, fallback: HTMLElement): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return copyBySelection(fallback);
  }
}

if (copyButton && copyStatus && copyAction && copyCode) {
  const code = copyButton.dataset.copy ?? '';
  let timer = 0;
  copyButton.addEventListener('click', () => {
    void copyText(code, copyCode).then((ok) => {
      copyStatus.textContent = ok ? 'Kopiert' : `Bitte von Hand kopieren: ${code}`;
      copyAction.textContent = ok ? 'Kopiert' : 'kopieren';
      copyButton.classList.toggle('is-copied', ok);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => {
        copyAction.textContent = 'kopieren';
        copyButton.classList.remove('is-copied');
        copyStatus.textContent = '';
      }, 3000);
    });
  });
}

// Für Tests: das Skript ist gelaufen.
if (page) page.dataset.ready = '';
