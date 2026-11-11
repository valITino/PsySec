/**
 * Easter Eggs (Auftrag, Abschnitt 5.16):
 * (a) ein Gruss in der Konsole für alle, die in den Quellcode schauen,
 * (b) der Konami-Code öffnet ein kleines Terminal.
 * Das Terminal ist ein eigener Chunk und lädt erst, wenn jemand den Code eingibt.
 */
import type { ScrollLock } from './header.ts';

/** ↑ ↑ ↓ ↓ ← → ← → B A */
const KONAMI = [
  'ArrowUp',
  'ArrowUp',
  'ArrowDown',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'ArrowLeft',
  'ArrowRight',
  'b',
  'a',
] as const;

const BADGE =
  'font: 800 20px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; color: #ad9bf6; background: #140a29; padding: 8px 14px; border-radius: 8px;';
const TEXT = 'font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;';
const HINT = `${TEXT} color: #7c68c0;`;

export function initEggs(lock: () => ScrollLock | null = () => null): void {
  // --- (a) Konsole ---
  const hello = document.body.dataset.hello ?? '';
  // eslint-disable-next-line no-console -- Easter Egg: diese Nachricht ist der Zweck
  console.log(
    `%cΨ PSYber%c\nDu liest Quellcode? Layer 8 ist bei dir offensichtlich gepatcht.\nSag hallo: ${hello}%c\n// Noch nicht genug? ↑ ↑ ↓ ↓ ← → ← → B A`,
    BADGE,
    TEXT,
    HINT,
  );

  // --- (b) Konami-Code ---
  let position = 0;
  let loading = false;
  document.addEventListener('keydown', (event) => {
    if (event.ctrlKey || event.metaKey || event.altKey) return;
    // Wer gerade etwas eingibt (Formular, Schieberegler, Terminal), tippt keinen Code.
    const target = event.target instanceof Element ? event.target : null;
    if (target?.closest('input, textarea, select, [contenteditable], dialog')) {
      position = 0;
      return;
    }
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key;
    if (key === KONAMI[position]) {
      position++;
    } else if (key === 'ArrowUp' && position === 2) {
      // Ein drittes ↑ nach ↑ ↑: die letzten beiden zählen weiter.
      return;
    } else {
      position = key === KONAMI[0] ? 1 : 0;
    }
    if (position < KONAMI.length) return;
    position = 0;
    if (loading) return;
    loading = true;
    void import('./terminal.ts')
      .then((module) => module.openTerminal(lock))
      .finally(() => {
        loading = false;
      });
  });
}
