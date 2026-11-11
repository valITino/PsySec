/** Adressen und Links von forms.psyber.tech. */
import { joinPath, resolveSites, splitSiteUrl } from '@psyber/config/sites';

export const sites = resolveSites(import.meta.env, { dev: import.meta.env.DEV });

const { site: origin, base } = splitSiteUrl(sites.forms);

export const basePath = base;
export const href = (path = '/') => joinPath(base, path);
export const absoluteUrl = (path = '/') => new URL(href(path), origin).href;

/** Links auf psyber.tech */
export const web = {
  home: `${sites.web}/`,
  impressum: `${sites.web}/impressum`,
  datenschutz: `${sites.web}/datenschutz`,
  checkliste: `${sites.web}/checkliste?ref=umfrage`,
} as const;
