/**
 * Reichweite ohne Personenbezug: Seitenaufrufe, Einstiege nach Herkunft und Klicks auf die
 * wichtigsten Knöpfe, gezählt als Tagessummen über die eigene API.
 *
 * Keine Cookies, kein Speicher im Browser, keine Kennung, kein Dritter. Wer «Global Privacy
 * Control» oder «Do Not Track» eingeschaltet hat, wird gar nicht gezählt; ferngesteuerte Browser
 * (Tests, Prüfwerkzeuge, viele Crawler) ebenfalls nicht.
 *
 * Eine Seite meldet sich über Attribute am <html>-Element an (`trackAttrs`); Knöpfe und Links
 * tragen `data-track` mit einem Schlüssel aus CTAS (packages/survey).
 */
import { sendEvent } from './api.ts';
import { sourceOf } from './source.ts';

interface TrackSites {
  /** Basis der API; leer, wenn sie simuliert wird (Vorschau): Dann wird nichts gezählt. */
  api: string;
  web: string;
  forms: string;
  surprise: string;
}

/**
 * Attribute für das <html>-Element einer Seite, deren Aufrufe gezählt werden.
 * @param page  Schlüssel aus PAGES (packages/survey); ohne ihn zählt die Seite nicht
 */
export function trackAttrs(sites: TrackSites, page: string | undefined): Record<string, string> {
  if (!sites.api || !page) return {};
  const hosts = [sites.web, sites.forms, sites.surprise].map((url) => new URL(url).hostname);
  return {
    'data-api': sites.api,
    'data-page': page,
    'data-sites': [...new Set(hosts)].join(' '),
  };
}

/** `true`, wenn der Browser signalisiert, dass die Person nicht gezählt werden will. */
export function optedOut(): boolean {
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return nav.globalPrivacyControl === true || nav.doNotTrack === '1';
}

/**
 * `true` bei ferngesteuerten Browsern. Sie sind keine Besucher; so gehen auch die eigenen
 * Browser-Tests nie ins Netz (ein Test stellt das sicher).
 */
export function automated(): boolean {
  return navigator.webdriver === true;
}

export function initTracking(root: HTMLElement = document.documentElement): void {
  const api = root.dataset.api ?? '';
  const page = root.dataset.page ?? '';
  if (!api || !page || automated() || optedOut()) return;

  const countView = () => {
    const [entry] = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    // Neuladen und «Zurück» sind kein neuer Einstieg.
    const arrived = !entry || entry.type === 'navigate';
    // Unsere eigenen Websites, dazu immer der Host, unter dem die Seite gerade läuft.
    const own = [window.location.hostname, ...(root.dataset.sites ?? '').split(' ')];
    const source = arrived ? sourceOf(window.location.search, document.referrer, own) : undefined;
    sendEvent(api, 'page_view', { page, source });
  };
  // Eine Seite, die der Browser nur auf Vorrat lädt, zählt erst, wenn sie wirklich gezeigt wird.
  if ((document as Document & { prerendering?: boolean }).prerendering) {
    document.addEventListener('prerenderingchange', countView, { once: true });
  } else {
    countView();
  }

  document.addEventListener(
    'click',
    (event) => {
      const target =
        event.target instanceof Element
          ? event.target.closest<HTMLElement>('[data-track]')?.dataset.track
          : undefined;
      if (target) sendEvent(api, 'cta_click', { target });
    },
    { capture: true },
  );
}
