import type { ComponentType } from "react";
import { DOMAINS, type Category } from "@/content/domainMeta";

/**
 * Disciplines have no colour of their own. They are told apart by this glyph
 * and by their name, so the shell keeps a single accent hue and stays
 * legible in greyscale.
 */
export function DisciplineIcon({
  category,
  size = 16,
  className,
}: {
  category: Category;
  size?: number;
  className?: string;
}) {
  const d = DOMAINS.find((x) => x.id === category);
  const Icon: ComponentType<{ size?: number; className?: string }> | undefined = d?.icon;
  if (!Icon) return null;
  return <Icon size={size} className={className} aria-hidden />;
}
