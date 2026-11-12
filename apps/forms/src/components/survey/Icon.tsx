import { iconAttrs, iconData, type IconName } from '@psyber/ui/icons';

interface Props {
  name: IconName;
  size?: number;
  strokeWidth?: number;
  class?: string;
  label?: string;
}

/** Line-Icon (Lucide) für Preact; dieselben Daten wie die Astro-Komponente. */
export function Icon({ name, size = 20, strokeWidth, class: className, label }: Props) {
  const attrs = iconAttrs({
    size,
    ...(strokeWidth !== undefined ? { strokeWidth } : {}),
    ...(className ? { class: className } : {}),
    ...(label ? { label } : {}),
  });
  return <svg {...attrs} dangerouslySetInnerHTML={{ __html: iconData[name] }} />;
}
