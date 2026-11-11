/**
 * «Erwischt!»: Teaser überspringen, anonymen Zähler senden, «Adressen lesen» umschalten,
 * Rabattcode kopieren. Die Seite fragt nichts ab und setzt keine Cookies.
 * Teaser und Glitch laufen als reine CSS-Zeitleiste (Teaser.astro); dieses Skript ist dafür
 * nicht nötig, es spult sie beim Überspringen nur vor.
 */
import { sendEvent } from '@psyber/ui/lib/api';

// ---------------------------------------------------------------- Teaser überspringen
/** Ab hier beginnt der Glitch (entspricht --sp-hold in global.css). */
const GLITCH_START = 1000;

// Klick oder Taste: alle Animationen der Zeitleiste springen an den Beginn des Glitchs.
const skip = () => {
  window.removeEventListener('pointerdown', skip);
  window.removeEventListener('keydown', skip);
  if (typeof document.getAnimations !== 'function') return;
  for (const animation of document.getAnimations()) {
    if (Number(animation.currentTime ?? 0) < GLITCH_START) animation.currentTime = GLITCH_START;
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
  sendEvent(
    page.dataset.api ?? '',
    'bait_click',
    Number.isInteger(s) && s >= 1 && s <= 5 ? s : undefined,
  );
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
    return document.execCommand('copy');
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
