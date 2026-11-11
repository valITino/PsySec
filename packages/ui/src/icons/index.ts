import { iconData, type IconName } from './data.ts';

export { iconData, type IconName };

export interface IconOptions {
  /** Kantenlänge in Pixeln (Standard: 20) */
  size?: number;
  /** Strichstärke im 24er-Raster. 1.8 ergibt bei 20 px die im Designsystem vorgesehenen 1.5 px. */
  strokeWidth?: number;
  class?: string;
  /** Zugänglicher Name. Ohne Angabe gilt das Icon als Dekoration. */
  label?: string;
}

const escapeAttr = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Attribute für das umschliessende <svg>, passend zu Lucide. */
export function iconAttrs(options: IconOptions = {}) {
  const { size = 20, strokeWidth = 1.8, label } = options;
  return {
    xmlns: 'http://www.w3.org/2000/svg',
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': strokeWidth,
    'stroke-linecap': 'round' as const,
    'stroke-linejoin': 'round' as const,
    class: ['icon', options.class].filter(Boolean).join(' '),
    ...(label ? { role: 'img' as const, 'aria-label': label } : { 'aria-hidden': 'true' as const }),
    focusable: 'false' as const,
  };
}

/** Komplettes SVG als String, für Stellen ohne Komponenten (z. B. per Skript erzeugtes Markup). */
export function iconSvg(name: IconName, options: IconOptions = {}): string {
  const attrs = Object.entries(iconAttrs(options))
    .map(([key, value]) => `${key}="${escapeAttr(String(value))}"`)
    .join(' ');
  return `<svg ${attrs}>${iconData[name]}</svg>`;
}
