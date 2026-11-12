/**
 * «Der erste Schritt»: Die gewählte Antwortkarte wandert in den Link zur Umfrage (?fokus=…)
 * oder, in der Phase `launch`, als erste Zeile ins Nachrichtenfeld des Kontaktformulars.
 */
export function initFirstStep(form: HTMLFormElement): void {
  const cta = form.querySelector<HTMLAnchorElement>('[data-first-cta]');
  if (!cta) return;
  const selected = () => form.querySelector<HTMLInputElement>('input[name="fokus"]:checked');

  if (form.dataset.mode === 'launch') {
    cta.addEventListener('click', () => {
      const note = selected()?.dataset.note;
      const message = document.querySelector<HTMLTextAreaElement>('#kontakt-nachricht');
      if (!note || !message) return;
      // Frühere Auswahl ersetzen, eigenen Text behalten.
      const rest = message.value.replace(/^Schwerpunkt: [^\n]*\n?/, '');
      message.value = rest ? `${note}\n${rest}` : `${note}\n`;
      message.dispatchEvent(new Event('input', { bubbles: true }));
    });
    return;
  }

  const base = form.dataset.base ?? cta.href;
  const sync = () => {
    const fokus = selected()?.value;
    cta.href = fokus ? `${base}&fokus=${encodeURIComponent(fokus)}` : base;
  };
  form.addEventListener('change', sync);
  // Nach «Zurück» stellt der Browser die gewählte Karte wieder her, ohne «change» zu melden.
  window.addEventListener('pageshow', sync);
  sync();
}
