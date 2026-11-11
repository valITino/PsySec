// Erzeugt src/icons/data.ts aus lucide-static (ISC-Lizenz).
// Nur die hier gelisteten Icons landen im Bundle. Aufruf: pnpm --filter @psyber/ui icons
import { readFileSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const nodes = JSON.parse(readFileSync(require.resolve('lucide-static/icon-nodes.json'), 'utf8'));
const pkg = JSON.parse(readFileSync(require.resolve('lucide-static/package.json'), 'utf8'));

/** Name im Projekt → Name bei Lucide */
const ICONS = {
  'arrow-right': 'arrow-right',
  'arrow-left': 'arrow-left',
  'arrow-down': 'arrow-down',
  'arrow-up-right': 'arrow-up-right',
  'corner-down-left': 'corner-down-left',
  check: 'check',
  x: 'x',
  plus: 'plus',
  minus: 'minus',
  menu: 'menu',
  clock: 'clock',
  gift: 'gift',
  link: 'link',
  'link-2': 'link-2',
  coins: 'coins',
  shield: 'shield',
  'shield-check': 'shield-check',
  'shield-alert': 'shield-exclamation-point',
  'shield-x': 'shield-x',
  'circle-check': 'circle-check',
  'circle-alert': 'circle-exclamation-point',
  'circle-x': 'circle-x',
  'circle-help': 'circle-question-mark',
  'triangle-alert': 'triangle-exclamation-point',
  'octagon-x': 'octagon-x',
  info: 'info',
  mail: 'mail',
  phone: 'phone',
  'map-pin': 'map-pin',
  'message-circle': 'message-circle',
  users: 'users',
  brain: 'brain',
  router: 'router',
  wifi: 'wifi',
  'wifi-off': 'wifi-off',
  globe: 'globe',
  lock: 'lock',
  'key-round': 'key-round',
  eye: 'eye',
  'eye-off': 'eye-off',
  search: 'search',
  'scan-line': 'scan-line',
  'scan-face': 'scan-face',
  printer: 'printer',
  download: 'download',
  copy: 'copy',
  share: 'share-2',
  pause: 'pause',
  play: 'play',
  'chevron-down': 'chevron-down',
  'chevron-right': 'chevron-right',
  terminal: 'terminal',
  home: 'house',
  'hand-heart': 'hand-heart',
  heart: 'heart',
  pointer: 'pointer',
  'file-text': 'file-text',
  megaphone: 'megaphone',
  presentation: 'presentation',
  'party-popper': 'party-popper',
  sparkles: 'sparkles',
  user: 'user',
  image: 'image',
  smartphone: 'smartphone',
  'life-buoy': 'life-buoy',
  ban: 'ban',
  'rotate-ccw': 'rotate-ccw',
  send: 'send',
  'external-link': 'external-link',
  signal: 'signal',
  'battery-medium': 'battery-medium',
  'more-horizontal': 'ellipsis',
};

const esc = (v) => String(v).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
const out = {};
const missing = [];
for (const [name, lucide] of Object.entries(ICONS)) {
  const node = nodes[lucide];
  if (!node) {
    missing.push(`${name} (${lucide})`);
    continue;
  }
  out[name] = node
    .map(([tag, attrs]) => {
      const a = Object.entries(attrs)
        .map(([k, v]) => `${k}="${esc(v)}"`)
        .join(' ');
      return `<${tag} ${a}/>`;
    })
    .join('');
}
if (missing.length) {
  console.error('Nicht gefunden bei Lucide:', missing.join(', '));
  process.exit(1);
}

const names = Object.keys(out).sort();
const body = names.map((n) => `  ${JSON.stringify(n)}: ${JSON.stringify(out[n])},`).join('\n');
const file = `// GENERIERT von scripts/gen-icons.mjs – nicht von Hand ändern.
// Quelle: lucide-static v${pkg.version} (ISC-Lizenz, https://lucide.dev)

export const iconData = {
${body}
} as const;

export type IconName = keyof typeof iconData;
`;
const target = resolve(dirname(fileURLToPath(import.meta.url)), '../src/icons/data.ts');
writeFileSync(target, file);
console.log(`${names.length} Icons → ${target}`);
