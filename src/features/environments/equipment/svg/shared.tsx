import type { IndicatorTone } from "@/features/env";
import type { ReactNode } from "react";
import { toneFill } from "./palette";

export function Led({
  cx,
  cy,
  tone,
  r = 3,
}: {
  cx: number;
  cy: number;
  tone: IndicatorTone;
  r?: number;
}) {
  return (
    <circle
      cx={cx}
      cy={cy}
      r={r}
      fill={toneFill(tone)}
      stroke="#0f172a"
      strokeWidth="0.5"
    />
  );
}

/** Accessible clickable SVG group (matches the bench hotspot pattern). */
export function HotspotG({
  id,
  label,
  selected,
  onSelect,
  children,
}: {
  id: string;
  label: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  children: ReactNode;
}) {
  return (
    <g
      className="hotspot"
      role="button"
      tabIndex={0}
      aria-label={label}
      data-hotspot-id={id}
      data-selected={selected === id ? "true" : undefined}
      onClick={() => onSelect(id)}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect(id);
      }}
    >
      {children}
    </g>
  );
}
