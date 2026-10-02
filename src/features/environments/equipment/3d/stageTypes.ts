import type { CameraView } from "../types";

/**
 * Props every lazy family stage implements. Kept in a three-free module so
 * the view can type the stage map without pulling WebGL code into the
 * initial bundle.
 */
export interface EquipmentStageProps {
  /** Family namespace of `run.world`. */
  state: Record<string, unknown>;
  /** Scenario `environment.components` predicate (hotspot visibility). */
  visible: (id: string) => boolean;
  reduced: boolean;
  selected: string | null;
  hovered: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null, x?: number, y?: number) => void;
  presets: CameraView[];
  preset: string;
  resetToken: number;
  /** Guided-step target id while the guide is open (null otherwise). */
  guideTarget?: string | null;
}
