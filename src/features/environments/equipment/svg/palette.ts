import type { IndicatorTone } from "@/features/env";

/**
 * Shared equipment palette — flat, muted, workbench-consistent.
 * Mirrors the 3D `EC` palette: bodies read as mid-graphite on the stage, so
 * 2D and 3D show the same device with the same values.
 */
export const C = {
  bg: "#131619",
  wall: "#1c2229",
  body: "#262e39",
  plate: "#333c4b",
  dark: "#1b212b",
  edge: "#5b6673",
  accent: "#e2560f",
  info: "#7dd3fc",
  ok: "#22c55e",
  crit: "#f87171",
  warn: "#fbbf24",
  muted: "#9aa2ad",
  text: "#cbd2d9",
} as const;

export function toneFill(t: IndicatorTone): string {
  if (t === "ok") return C.ok;
  if (t === "warn") return C.warn;
  if (t === "crit") return C.crit;
  if (t === "info") return C.info;
  return "#4b5563";
}

export function selStroke(selected: boolean): string {
  return selected ? C.accent : C.edge;
}

export function selWidth(selected: boolean): number {
  return selected ? 2 : 1.5;
}
