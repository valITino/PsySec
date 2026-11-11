/** Kleine Helfer rund um IntersectionObserver. */

/**
 * Ruft `callback` einmal auf, sobald das Element weit genug im Bild ist.
 *
 * `threshold` meint den sichtbaren Anteil des Elements. Ist das Element höher als das Fenster
 * (Handy im Querformat, starker Zoom), erreicht dieser Anteil die Schwelle nie. Dann genügt es,
 * dass das Element denselben Anteil des Fensters füllt. Dafür beobachtet der Helfer in feinen
 * Stufen und entscheidet selbst.
 */
export function onceInView(
  element: Element,
  callback: () => void,
  options: IntersectionObserverInit = { threshold: 0.35 },
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => undefined;
  }
  const wanted = typeof options.threshold === 'number' ? options.threshold : 0;
  const steps = [0];
  for (let step = 0.02; step < wanted; step += 0.02) steps.push(Number(step.toFixed(2)));
  if (wanted > 0) steps.push(wanted);

  const reached = (entry: IntersectionObserverEntry): boolean => {
    if (!entry.isIntersecting) return false;
    if (entry.intersectionRatio >= wanted - 0.001) return true;
    const frame = entry.rootBounds?.height ?? window.innerHeight;
    return entry.intersectionRect.height >= frame * wanted;
  };
  const observer = new IntersectionObserver(
    (entries) => {
      if (entries.some(reached)) {
        observer.disconnect();
        callback();
      }
    },
    { ...options, threshold: steps },
  );
  observer.observe(element);
  return () => observer.disconnect();
}

export function whileInView(
  element: Element,
  callback: (inView: boolean) => void,
  options: IntersectionObserverInit = { threshold: 0 },
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback(true);
    return () => undefined;
  }
  const observer = new IntersectionObserver((entries) => {
    const entry = entries[entries.length - 1];
    if (entry) callback(entry.isIntersecting);
  }, options);
  observer.observe(element);
  return () => observer.disconnect();
}
