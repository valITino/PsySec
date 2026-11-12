/**
 * Strukturierte Daten für Suchmaschinen (schema.org als JSON-LD).
 *
 * Grundsätze:
 * - Nur Angaben, die stimmen und zur sichtbaren Seite passen. Was noch offen ist (Adresse,
 *   Telefon, Name der Person), fehlt, bis es eingetragen ist: lieber weniger als erfunden.
 * - Organisation und Website stehen einmal, auf der Startseite. Unterseiten verweisen darauf.
 * - Kein FAQ-Markup: Google zeigt dazu seit Mai 2026 keine Rich Results mehr.
 */

export type JsonLdNode = Record<string, unknown>;

export interface BrandInput {
  /** Startseite der Hauptwebsite mit Slash am Ende, z. B. https://psyber.tech/ */
  home: string;
  name: string;
  alternateName?: readonly string[] | undefined;
  slogan?: string | undefined;
  description: string;
  /** Quadratisches Logo (Google: mindestens 112 px, abrufbar, PNG oder ähnlich) */
  logo: { url: string; size: number };
  /** Land, in dem das Angebot gilt: Name und ISO-Code */
  areaServed?: { name: string; code: string } | undefined;
  /** Themen, die die Website tatsächlich behandelt */
  knowsAbout?: readonly string[] | undefined;
  email?: string | undefined;
  telephone?: string | undefined;
  /** Profile auf anderen Plattformen */
  sameAs?: readonly string[] | undefined;
}

export const organizationId = (home: string) => `${home}#organization`;
export const websiteId = (home: string) => `${home}#website`;

/** Lässt leere Einträge weg, damit nie ein halbes Feld im Markup steht. */
function compact(node: JsonLdNode): JsonLdNode {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null || value === '') return false;
      return !(Array.isArray(value) && value.length === 0);
    }),
  );
}

export function organization(brand: BrandInput): JsonLdNode {
  return compact({
    '@type': 'Organization',
    '@id': organizationId(brand.home),
    name: brand.name,
    alternateName: brand.alternateName ? [...brand.alternateName] : undefined,
    url: brand.home,
    logo: {
      '@type': 'ImageObject',
      url: brand.logo.url,
      width: brand.logo.size,
      height: brand.logo.size,
    },
    slogan: brand.slogan,
    description: brand.description,
    areaServed: brand.areaServed
      ? { '@type': 'Country', name: brand.areaServed.name, identifier: brand.areaServed.code }
      : undefined,
    knowsAbout: brand.knowsAbout ? [...brand.knowsAbout] : undefined,
    email: brand.email,
    telephone: brand.telephone,
    sameAs: brand.sameAs ? [...brand.sameAs] : undefined,
  });
}

/**
 * Die Website. `name` ist der Name, den Google in Treffern über dem Titel zeigt; er gilt je
 * Host und gehört nur auf dessen Startseite.
 */
export function website(input: {
  /** Startseite dieses Hosts mit Slash am Ende */
  url: string;
  name: string;
  alternateName?: readonly string[] | undefined;
  description?: string | undefined;
  language: string;
  /** `home` der Organisation, die die Website herausgibt */
  publisherHome: string;
}): JsonLdNode {
  return compact({
    '@type': 'WebSite',
    '@id': websiteId(input.url),
    url: input.url,
    name: input.name,
    alternateName: input.alternateName ? [...input.alternateName] : undefined,
    description: input.description,
    inLanguage: input.language,
    publisher: { '@id': organizationId(input.publisherHome) },
  });
}

export function webPage(input: {
  /** Kanonische Adresse der Seite */
  url: string;
  name: string;
  description: string;
  language: string;
  /** Startseite des Hosts, zu dem die Seite gehört */
  siteUrl: string;
  /** `home` der Organisation */
  publisherHome: string;
  /** Vorschaubild der Seite (absolut), 1200×630 */
  image?: string | undefined;
  /** Die Seite beschreibt die Organisation selbst (Startseite) */
  aboutOrganization?: boolean | undefined;
  breadcrumb?: boolean | undefined;
}): JsonLdNode {
  return compact({
    '@type': 'WebPage',
    '@id': `${input.url}#webpage`,
    url: input.url,
    name: input.name,
    description: input.description,
    inLanguage: input.language,
    isPartOf: { '@id': websiteId(input.siteUrl) },
    about: input.aboutOrganization ? { '@id': organizationId(input.publisherHome) } : undefined,
    publisher: { '@id': organizationId(input.publisherHome) },
    primaryImageOfPage: input.image
      ? { '@type': 'ImageObject', url: input.image, width: 1200, height: 630 }
      : undefined,
    breadcrumb: input.breadcrumb ? { '@id': `${input.url}#breadcrumb` } : undefined,
  });
}

/** Pfad von der Startseite bis zur Seite; der letzte Eintrag ist die Seite selbst. */
export function breadcrumbs(
  pageUrl: string,
  items: readonly { name: string; url: string }[],
): JsonLdNode {
  return {
    '@type': 'BreadcrumbList',
    '@id': `${pageUrl}#breadcrumb`,
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}

export function graph(...nodes: (JsonLdNode | null | undefined | false)[]): JsonLdNode {
  return {
    '@context': 'https://schema.org',
    '@graph': nodes.filter((node): node is JsonLdNode => Boolean(node)),
  };
}

/**
 * JSON für ein <script type="application/ld+json">. Die Zeichen <, > und & werden maskiert:
 * So kann kein Inhalt das Skript-Element vorzeitig schliessen.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026');
}
