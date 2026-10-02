export type CameraPresetId =
  | "full"
  | "front"
  | "motherboard"
  | "power-supply"
  | "cables"
  | "front-panel"
  | "ram"
  | "cpu-cooler"
  | "storage";

export interface CameraPreset {
  id: CameraPresetId;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

export const CAMERA_PRESETS: CameraPreset[] = [
  {
    id: "full",
    label: "Full PC",
    pos: [0.62, 0.46, 0.78],
    target: [0.0, 0.05, 0.0],
  },
  {
    id: "front",
    label: "Front",
    pos: [0.0, 0.24, 0.92],
    target: [0.0, 0.08, 0.1],
  },
  {
    id: "motherboard",
    label: "Motherboard",
    pos: [-0.07, 0.5, 0.16],
    target: [-0.07, 0.03, -0.01],
  },
  {
    id: "power-supply",
    label: "Power supply",
    pos: [0.5, 0.26, -0.5],
    target: [0.2, 0.06, -0.2],
  },
  {
    id: "cables",
    label: "Cables",
    pos: [0.44, 0.3, 0.44],
    target: [0.1, 0.06, -0.02],
  },
  {
    id: "front-panel",
    label: "Front panel",
    pos: [-0.04, 0.2, 0.66],
    target: [-0.1, 0.1, 0.24],
  },
  {
    id: "ram",
    label: "RAM",
    pos: [0.2, 0.3, 0.16],
    target: [-0.03, 0.05, -0.045],
  },
  {
    id: "cpu-cooler",
    label: "CPU cooler",
    pos: [0.16, 0.32, 0.2],
    target: [-0.07, 0.08, -0.045],
  },
  {
    id: "storage",
    label: "Storage",
    pos: [0.52, 0.2, 0.5],
    target: [0.28, 0.03, 0.16],
  },
];

/**
 * Component a preset frames. Presets without an entry are scene-wide views
 * (full/front/cables) that are always reachable; component-bound presets are
 * only offered when that component is part of the scenario's bench.
 */
export const PRESET_COMPONENT: Partial<Record<CameraPresetId, string>> = {
  motherboard: "motherboard",
  "power-supply": "power-supply",
  "front-panel": "front-panel",
  ram: "ram",
  "cpu-cooler": "cpu-cooler",
  storage: "storage",
};

export function presetById(id: CameraPresetId): CameraPreset {
  return CAMERA_PRESETS.find((p) => p.id === id) ?? CAMERA_PRESETS[0];
}

/**
 * Narrow the shared `focusTarget.cameraPreset` enum (which also carries
 * equipment presets since Phase 11) to a hardware preset id. Equipment
 * scenarios never reach the hardware bench, so foreign ids resolve to null.
 */
export function hardwareFocusPreset(
  environment: { focusTarget?: { cameraPreset?: string } },
): CameraPresetId | null {
  const id = environment.focusTarget?.cameraPreset;
  return id && CAMERA_PRESETS.some((p) => p.id === id)
    ? (id as CameraPresetId)
    : null;
}
