/**
 * Kontaktformular: Inline-Validierung mit dem gemeinsamen Schema, Turnstile, POST an die API.
 * Eingaben bleiben bei Fehlern erhalten. Wird erst geladen, wenn das Formular in Sicht kommt.
 */
import {
  normalizeContact,
  validateContact,
  type ContactField,
  type ContactInput,
} from '@psyber/survey';
import { iconSvg } from '@psyber/ui/icons';
import { postJson } from '@psyber/ui/lib/api';
import { createTurnstile, noTurnstile, type TurnstileHandle } from '@psyber/ui/lib/turnstile';

const FIELDS: readonly ContactField[] = [
  'name',
  'email',
  'phone',
  'plzOrt',
  'interesse',
  'nachricht',
  'datenschutz',
];

export function initContact(form: HTMLFormElement): void {
  const panel = form.parentElement;
  const success = panel?.querySelector<HTMLElement>('[data-form-success]');
  const failure = form.querySelector<HTMLElement>('[data-form-error]');
  const submit = form.querySelector<HTMLButtonElement>('[data-submit]');
  const submitLabel = form.querySelector<HTMLElement>('[data-submit-label]');
  const counter = form.querySelector<HTMLElement>('[data-count-current]');
  if (!success || !failure || !submit || !submitLabel) return;

  const api = form.dataset.api ?? '';
  const siteKey = form.dataset.turnstileKey ?? '';
  const idleLabel = submitLabel.textContent ?? '';

  const input = (name: string) => form.elements.namedItem(name);
  const text = (name: string) => (input(name) as HTMLInputElement | HTMLTextAreaElement).value;
  const radios = [...form.querySelectorAll<HTMLInputElement>('input[name="interesse"]')];
  const chips = form.querySelector<HTMLElement>('.chips');
  const message = input('nachricht') as HTMLTextAreaElement;
  const privacy = input('datenschutz') as HTMLInputElement;

  // --- ?ref=surprise: Feld mitsenden und «Familien-Session» vorauswählen ---
  const ref = new URLSearchParams(window.location.search).get('ref');
  if (ref === 'surprise' && !radios.some((radio) => radio.checked)) {
    const preset = radios.find((radio) => radio.value === 'familien_session');
    if (preset) preset.checked = true;
  }

  const read = (): ContactInput => ({
    name: text('name'),
    email: text('email'),
    phone: text('phone'),
    plzOrt: text('plzOrt'),
    interesse: radios.find((radio) => radio.checked)?.value ?? '',
    nachricht: message.value,
    datenschutz: privacy.checked,
    ref,
  });

  // --- Fehlermeldungen an den Feldern ---
  const controlsOf = (field: ContactField): HTMLElement[] => {
    if (field === 'interesse') return radios;
    const control = input(field);
    return control instanceof HTMLElement ? [control] : [];
  };

  const describe = (control: HTMLElement, id: string, add: boolean) => {
    const ids = new Set(
      (control.getAttribute('aria-describedby') ?? '').split(/\s+/).filter(Boolean),
    );
    if (add) ids.add(id);
    else ids.delete(id);
    if (ids.size > 0) control.setAttribute('aria-describedby', [...ids].join(' '));
    else control.removeAttribute('aria-describedby');
  };

  const shown = new Set<ContactField>();

  const setError = (field: ContactField, text: string | undefined) => {
    const box = form.querySelector<HTMLElement>(`[data-error-for="${field}"]`);
    if (!box) return;
    const controls = controlsOf(field);
    if (text) {
      shown.add(field);
      box.innerHTML = iconSvg('circle-alert', { size: 18 });
      const span = document.createElement('span');
      span.textContent = text;
      box.append(span);
      box.hidden = false;
      for (const control of controls) {
        control.setAttribute('aria-invalid', 'true');
        if (field !== 'interesse') describe(control, box.id, true);
      }
      if (field === 'interesse') chips?.setAttribute('data-invalid', '');
    } else {
      shown.delete(field);
      box.hidden = true;
      box.replaceChildren();
      for (const control of controls) {
        control.removeAttribute('aria-invalid');
        if (field !== 'interesse') describe(control, box.id, false);
      }
      if (field === 'interesse') chips?.removeAttribute('data-invalid');
    }
  };

  const validateField = (field: ContactField) => setError(field, validateContact(read())[field]);

  // Beim Verlassen eines Felds prüfen; bereits gemeldete Fehler beim Tippen laufend aktualisieren.
  form.addEventListener('focusout', (event) => {
    const name = (event.target as HTMLInputElement).name as ContactField | undefined;
    if (!name || !FIELDS.includes(name) || name === 'interesse' || name === 'datenschutz') return;
    const value = text(name).trim();
    const required = name === 'name' || name === 'email' || name === 'plzOrt';
    if (value || (required && shown.has(name))) validateField(name);
  });
  form.addEventListener('input', (event) => {
    const name = (event.target as HTMLInputElement).name as ContactField | undefined;
    if (name && shown.has(name)) validateField(name);
    if (name === 'nachricht' && counter) counter.textContent = String(message.value.length);
  });
  form.addEventListener('change', (event) => {
    const name = (event.target as HTMLInputElement).name as ContactField | undefined;
    if (name && shown.has(name)) validateField(name);
  });
  if (counter) counter.textContent = String(message.value.length);

  // --- Turnstile erst laden, wenn jemand das Formular wirklich benutzt ---
  let turnstile: Promise<TurnstileHandle> | null = null;
  const ensureTurnstile = () => {
    if (!siteKey) return Promise.resolve(noTurnstile());
    const container = form.querySelector<HTMLElement>('[data-turnstile]');
    if (!container) return Promise.resolve(noTurnstile());
    turnstile ??= createTurnstile(container, { siteKey });
    turnstile.catch(() => {
      turnstile = null;
    });
    return turnstile;
  };
  form.addEventListener('focusin', () => void ensureTurnstile().catch(() => undefined), {
    once: true,
  });

  // --- Absenden ---
  const setBusy = (busy: boolean) => {
    submit.disabled = busy;
    form.setAttribute('aria-busy', String(busy));
    submitLabel.textContent = busy ? 'Wird gesendet …' : idleLabel;
  };

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    failure.hidden = true;

    const data = read();
    const errors = validateContact(data);
    for (const field of FIELDS) setError(field, errors[field]);
    const firstInvalid = FIELDS.find((field) => errors[field]);
    if (firstInvalid) {
      controlsOf(firstInvalid)[0]?.focus();
      return;
    }

    setBusy(true);
    void (async () => {
      let handle: TurnstileHandle | null = null;
      try {
        handle = await ensureTurnstile();
        const turnstileToken = await handle.getToken();
        const website = text('website');
        const result = await postJson(api, '/v1/contact', {
          ...normalizeContact(data),
          turnstileToken,
          ...(website ? { website } : {}),
        });
        if (!result.ok) throw new Error(result.error ?? 'request_failed');
        form.hidden = true;
        success.hidden = false;
        success.focus();
      } catch {
        failure.hidden = false;
        handle?.reset();
      } finally {
        setBusy(false);
      }
    })();
  });
}
