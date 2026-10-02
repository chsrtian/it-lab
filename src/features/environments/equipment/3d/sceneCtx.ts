import { createContext, useContext } from "react";

/** Equipment-scoped selection/hover contract shared by every stage part. */
export interface StageInteract {
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null, x?: number, y?: number) => void;
  /** Guided-step target id while the guide is open (null otherwise). */
  guideTargetId: string | null;
}

export const InteractCtx = createContext<StageInteract>({
  selected: null,
  hovered: null,
  onSelect: () => {},
  onHover: () => {},
  guideTargetId: null,
});

export const MotionCtx = createContext(false);

/** Hover state only — selection is the bracket mark around the device. */
export function useHot(id: string): boolean {
  const it = useContext(InteractCtx);
  return it.hovered === id;
}

/** Palette shared by the six equipment stages (mirrors the SVG palette). */
export const EC = {
  table: "#2a313c",
  tableTop: "#333c4b",
  body: "#2d3542",
  bodyAlt: "#39424f",
  face: "#1b212b",
  metal: "#a3acb8",
  dark: "#151a21",
  port: "#10141a",
  plug: "#333b46",
  cable: "#2c333d",
  cableJacket: "#3b4553",
  label: "#c3ccd6",
  ledOk: "#4ade80",
  ledWarn: "#fbbf24",
  ledCrit: "#f87171",
  ledOff: "#39434f",
  /** Armed / selected / hovered — the shell's one accent hue. */
  accent: "#e2560f",
  paper: "#e8e3d7",
  wall: "#333b47",
  screen: "#131b2c",
  screenGlow: "#0ea5e9",
};

export function ledColor(tone: string | undefined): string {
  if (tone === "ok") return EC.ledOk;
  if (tone === "warn") return EC.ledWarn;
  if (tone === "crit") return EC.ledCrit;
  return EC.ledOff;
}
