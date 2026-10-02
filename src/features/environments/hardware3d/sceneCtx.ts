import { createContext, useContext } from "react";
import type { CompId } from "../benchHotspot";

export interface SceneInteract {
  selected: CompId | null;
  hovered: CompId | null;
  onSelect: (id: CompId | null) => void;
  onHover: (id: CompId | null, x?: number, y?: number) => void;
  /** Guided-step target id while the guide is open (null otherwise). */
  guideTargetId: string | null;
}

export const InteractCtx = createContext<SceneInteract>({
  selected: null,
  hovered: null,
  onSelect: () => {},
  onHover: () => {},
  guideTargetId: null,
});

export const MotionCtx = createContext(false);

/** Armed / selected / hovered — the one accent hue of the shell. */
export const AC = "#e2560f";

/**
 * Material palette for the hardware bench.
 * Every value is light enough to read on a graphite stage: chassis, PSU and
 * board separate in greyscale before any colour is applied.
 */
export const C = {
  mat: "#2a313c",
  tray: "#5a6270",
  trayDark: "#3a424e",
  wall: "#333b47",
  trim: "#20262f",
  pcb: "#1f2630",
  silver: "#a7b1be",
  alu: "#c4cbd4",
  slot: "#232933",
  latch: "#d3dae2",
  psu: "#2b3440",
  grille: "#1b2028",
  gpu: "#2a313b",
  gpuTrim: "#3a434f",
  ram: "#3a4453",
  ramTop: "#7d8898",
  cable: "#2b313b",
  sataData: "#a51c1c",
  led: "#4ade80",
  amber: "#fbbf24",
  off: "#37414f",
  ssd: "#2b323c",
  ssdLabel: "#c3ccd6",
  strip: "#242a34",
  io: "#99a1ac",
};

/**
 * Hover state only — selection is the bracket mark around the part, so the
 * two signals never look alike.
 */
export function useHot(id: CompId): boolean {
  const it = useContext(InteractCtx);
  return it.hovered === id;
}
