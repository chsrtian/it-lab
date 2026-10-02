import type { DeviceFamilyId } from "@/content/schema";
import type { IndicatorTone } from "@/features/env";
import type { StatusTone } from "@/components/ui";

export type State = Record<string, unknown>;

/**
 * Evidence row source for the inspector:
 * - plain string: path under the family namespace (hidden while undefined,
 *   progressive disclosure — R5)
 * - { path, when }: revealed only after the `when` world path is truthy
 * - { label, value }: computed row — aggregates the family state in one
 *   place so the 2D/3D projections and the inspector never diverge
 */
export type EvidenceEntry =
  | string
  | {
      path: string;
      /** World path that must be truthy before the row shows a real value. */
      when?: string;
    }
  | {
      label: string;
      value: (state: State) => string;
      tone?: (state: State) => StatusTone;
      /** Reveal only after the `when` world path is truthy. */
      when?: string;
    };

export interface ComponentMeta {
  id: string;
  label: string;
  identity: string;
  description: string;
  evidence: EvidenceEntry[];
  learnKb?: string;
}

export interface CameraView {
  id: string;
  label: string;
  pos: [number, number, number];
  target: [number, number, number];
}

export interface ChainStepView {
  id: string;
  label: string;
  component: string;
  state: string;
  tone: IndicatorTone;
}

export interface FamilyStatus {
  tone: StatusTone;
  label: string;
}

export interface ComponentStateView {
  label: string;
  tone: StatusTone;
}

/**
 * One equipment family: reusable device model shared by every scenario in the
 * family. Scenario differences come from world state only — never from
 * scenario-id branches in renderers.
 */
export interface FamilyDef {
  id: DeviceFamilyId;
  /** World-state namespace (e.g. `printer`). */
  worldKey: string;
  /** Display name, e.g. "Printer". */
  label: string;
  /** Causal chain strip label, e.g. "Print path". */
  chainLabel: string;
  components: ComponentMeta[];
  /** Evidence path → readable label (never raw key dumps). */
  labels: Record<string, string>;
  cameraPresets: CameraView[];
  status(state: State): FamilyStatus;
  chain(state: State): ChainStepView[];
  componentState(id: string, state: State): ComponentStateView;
}

/** Read helpers shared by family state modules (explicit, conservative). */
export function flag(state: State, key: string): boolean {
  return state[key] === true;
}

export function num(state: State, key: string): number | undefined {
  const v = state[key];
  return typeof v === "number" ? v : undefined;
}

export function str(state: State, key: string): string | undefined {
  const v = state[key];
  return typeof v === "string" ? v : undefined;
}

/** Props shared by the six family SVG projections (2D fallback stage). */
export interface SvgProps {
  state: State;
  /** Family status line (used on device panels that have a display). */
  statusLabel: string;
  selected: string | null;
  onSelect: (id: string | null) => void;
  /** Scenario `environment.components` filter (hotspot visibility). */
  visible: (id: string) => boolean;
}
