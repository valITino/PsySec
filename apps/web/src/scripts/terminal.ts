/**
 * Konami-Terminal: ein kleines Overlay mit fünf Befehlen und trockenen Antworten.
 * Natives <dialog>: Fokus bleibt im Fenster, Esc schliesst, der Rest der Seite ruht.
 * Bei reduzierter Bewegung erscheinen alle Ausgaben sofort.
 */
import { motionAllowed } from '@psyber/ui/motion';
import '../styles/terminal.css';
import type { ScrollLock } from './header.ts';

const PROMPT = 'gast@psyber:~$';

type Tone = 'out' | 'dim' | 'cmd' | 'ok';

interface Io {
  print(text: string, tone?: Tone): void;
  /** Zeilen nacheinander ausgeben (bei reduzierter Bewegung sofort) */
  type(lines: [string, Tone?][], delay?: number): Promise<void>;
  /** Letzte Zeile ersetzen (für den Fortschrittsbalken) */
  replace(text: string): void;
  clear(): void;
  close(): void;
}

const HELP: [string, string][] = [
  ['help', 'diese Liste'],
  ['whoami', 'wer hier tippt'],
  ['ping familie.local', 'ist jemand zu Hause?'],
  ['sudo patch layer8', 'das Update für den Menschen'],
  ['clear', 'Bildschirm leeren'],
  ['exit', 'zurück zur Website (oder Esc)'],
];

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const COMMANDS: Record<string, (io: Io) => void | Promise<void>> = {
  help(io) {
    io.print('Verfügbare Befehle:', 'dim');
    for (const [name, text] of HELP) io.print(`  ${name.padEnd(20)}${text}`);
  },

  whoami(io) {
    io.print('gast');
    io.print(
      'Neugierig, liest Quellcode, kennt den Konami-Code. Layer 8: in gutem Zustand.',
      'dim',
    );
  },

  async 'ping familie.local'(io) {
    await io.type(
      [
        ['PING familie.local: 4 Geräte antworten', 'dim'],
        ['router         zeit=1 ms     Firmware von 2019. Wir müssen reden.'],
        ['tablet-kind    zeit=12 ms    noch 3 Minuten Bildschirmzeit'],
        ['handy-grosi    zeit=48 ms    liest gerade den Familienchat'],
        ['drucker        zeit=∞        wie immer'],
        ['--- 4 Geräte, 1 Familie, 0 Grund zur Panik ---', 'ok'],
      ],
      420,
    );
  },

  async 'sudo patch layer8'(io) {
    await io.type(
      [
        ['[sudo] Passwort für gast: hunter2', 'dim'],
        ['Scherz. Passwörter gehören in den Passwort-Manager, nicht ins Terminal.', 'dim'],
        ['Lade Patch «Erst denken, dann klicken» …'],
      ],
      520,
    );
    if (motionAllowed()) {
      io.print('[          ]   0 %');
      for (let step = 1; step <= 10; step++) {
        await wait(110);
        io.replace(
          `[${'#'.repeat(step)}${' '.repeat(10 - step)}] ${String(step * 10).padStart(3)} %`,
        );
      }
    } else {
      io.print('[##########] 100 %');
    }
    io.print('Layer 8 gepatcht. Nebenwirkung: gesunde Skepsis.', 'ok');
    io.print('Das Update für die ganze Familie gibt es auf psyber.tech.', 'dim');
  },

  clear(io) {
    io.clear();
  },

  exit(io) {
    io.close();
  },
};

let dialog: HTMLDialogElement | null = null;

function build(lock: () => ScrollLock | null): HTMLDialogElement {
  const element = document.createElement('dialog');
  element.className = 'term';
  element.setAttribute('aria-labelledby', 'term-title');
  // Statisches Gerüst; alles, was Menschen eintippen, kommt später nur als Text hinein.
  element.innerHTML = `
    <div class="term-window">
      <div class="term-bar">
        <p class="term-title" id="term-title">PSYber-Terminal</p>
        <button type="button" class="term-close" data-term-close>
          <span>Schliessen</span><kbd aria-hidden="true">Esc</kbd>
        </button>
      </div>
      <div class="term-body" data-term-body>
        <div class="term-log" role="log" aria-live="polite" data-term-log></div>
        <div class="term-line">
          <span class="term-prompt" aria-hidden="true">${PROMPT}</span>
          <input class="term-input" type="text" data-term-input aria-label="Befehl eingeben"
            aria-describedby="term-hint" autocomplete="off" autocapitalize="off" autocorrect="off"
            spellcheck="false" enterkeyhint="go" maxlength="60" />
        </div>
      </div>
      <p class="term-hint" id="term-hint">«help» zeigt alle Befehle. Esc schliesst.</p>
    </div>`;

  const body = element.querySelector<HTMLElement>('[data-term-body]')!;
  const log = element.querySelector<HTMLElement>('[data-term-log]')!;
  const input = element.querySelector<HTMLInputElement>('[data-term-input]')!;
  const history: string[] = [];
  let cursor = 0;
  let busy = false;

  const line = (text: string, tone: Tone = 'out') => {
    const row = document.createElement('p');
    row.className = `is-${tone}`;
    row.textContent = text;
    log.append(row);
    body.scrollTop = body.scrollHeight;
  };
  const io: Io = {
    print: line,
    async type(lines, delay = 300) {
      for (const [text, tone] of lines) {
        line(text, tone);
        if (motionAllowed() && element.open) await wait(delay);
      }
    },
    replace(text) {
      const last = log.lastElementChild;
      if (last) last.textContent = text;
    },
    clear() {
      log.replaceChildren();
    },
    close() {
      element.close();
    },
  };

  const run = async (raw: string) => {
    const command = raw.trim().replace(/\s+/g, ' ').toLowerCase();
    line(`${PROMPT} ${raw.trim()}`, 'cmd');
    if (command === '') return;
    history.push(raw.trim());
    cursor = history.length;
    const handler = COMMANDS[command];
    if (!handler) {
      line(`Befehl nicht gefunden: ${raw.trim()}`);
      line('«help» zeigt, was geht.', 'dim');
      return;
    }
    busy = true;
    element.setAttribute('aria-busy', 'true');
    try {
      await handler(io);
    } finally {
      busy = false;
      element.removeAttribute('aria-busy');
    }
  };

  input.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      if (busy) return;
      const value = input.value;
      input.value = '';
      void run(value);
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
      // Verlauf: frühere Befehle zurückholen
      if (history.length === 0) return;
      event.preventDefault();
      cursor = Math.max(0, Math.min(history.length, cursor + (event.key === 'ArrowUp' ? -1 : 1)));
      input.value = history[cursor] ?? '';
    }
  });

  element.querySelector('[data-term-close]')?.addEventListener('click', () => element.close());
  // Klick neben das Fenster schliesst ebenfalls.
  element.addEventListener('click', (event) => {
    if (event.target === element) element.close();
  });
  // Klick ins Fenster setzt den Cursor wieder in die Eingabezeile (wie in einem Terminal).
  body.addEventListener('click', () => {
    if (!window.getSelection()?.toString()) input.focus();
  });
  element.addEventListener('close', () => {
    document.documentElement.classList.remove('scroll-locked');
    lock()?.start();
  });

  element.addEventListener('term:open', () => {
    io.clear();
    input.value = '';
    line('Konami-Code erkannt. Willkommen auf Layer 8.', 'ok');
    line('«help» zeigt alle Befehle.', 'dim');
  });

  document.body.append(element);
  return element;
}

export function openTerminal(lock: () => ScrollLock | null = () => null): void {
  dialog ??= build(lock);
  if (dialog.open) return;
  lock()?.stop();
  document.documentElement.classList.add('scroll-locked');
  dialog.dispatchEvent(new Event('term:open'));
  dialog.showModal();
  dialog.querySelector<HTMLInputElement>('[data-term-input]')?.focus();
}
