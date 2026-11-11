/** Kleine Helfer rund um IntersectionObserver. */

export function onceInView(
  element: Element,
  callback: () => void,
  options: IntersectionObserverInit = { threshold: 0.35 },
): () => void {
  if (typeof IntersectionObserver === 'undefined') {
    callback();
    return () => undefined;
  }
  const observer = new IntersectionObserver((entries) => {
    if (entries.some((entry) => entry.isIntersecting)) {
      observer.disconnect();
      callback();
    }
  }, options);
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
