/**
 * Chat-Mockup: Nachrichten erscheinen einmal nacheinander, die Antwort nach einem Tipp-Indikator.
 */
import { motionAllowed, onceInView } from '@psyber/ui/motion';

export function initChat(root: HTMLElement): void {
  if (!motionAllowed()) return;
  const messages = [...root.querySelectorAll<HTMLElement>('[data-chat-msg]')];
  const typing = root.querySelector<HTMLElement>('[data-chat-typing]');
  if (messages.length < 3 || !typing) return;
  const [question, answer, thanks] = messages as [HTMLElement, HTMLElement, HTMLElement];

  root.dataset.animated = '';
  const wait = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));

  onceInView(
    root,
    () => {
      void (async () => {
        await wait(250);
        question.classList.add('is-in');
        await wait(1100);
        typing.classList.add('is-in');
        await wait(1900);
        typing.classList.remove('is-in');
        answer.classList.add('is-in');
        await wait(1500);
        thanks.classList.add('is-in');
      })();
    },
    { threshold: 0.5 },
  );
}
