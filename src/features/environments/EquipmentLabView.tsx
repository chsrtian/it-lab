import {
  Component,
  lazy,
  Suspense,
  useRef,
  useState,
  type LazyExoticComponent,
  type ReactNode,
} from "react";
import { RotateCcw } from "lucide-react";
import type { DeviceFamilyId } from "@/content/schema";
import { EquipmentLab, type EquipmentLabProps } from "./EquipmentLab";
import { familyState, getFamily } from "./equipment/registry";
import {
  buildEquipmentHotspot,
  equipmentFocusComponent,
  equipmentFocusPreset,
} from "./equipment/hotspot";
import type { EquipmentStageProps } from "./equipment/3d/stageTypes";
import {
  prefersReducedMotion,
  readStoredView,
  resolveInitialView,
  storeView,
  supportsWebGL,
  type ViewMode,
} from "./hardware3d/capabilities";

/**
 * One lazy chunk per family — no device geometry is part of the initial
 * bundle, and each scenario renders exactly the stage its family declares.
 */
const STAGES: Record<DeviceFamilyId, LazyExoticComponent<(p: EquipmentStageProps) => ReactNode>> = {
  printer: lazy(() =>
    import("./equipment/3d/stages/PrinterStage").then((m) => ({ default: m.PrinterStage })),
  ),
  router: lazy(() =>
    import("./equipment/3d/stages/RouterStage").then((m) => ({ default: m.RouterStage })),
  ),
  switch: lazy(() =>
    import("./equipment/3d/stages/SwitchStage").then((m) => ({ default: m.SwitchStage })),
  ),
  "access-point": lazy(() =>
    import("./equipment/3d/stages/AccessPointStage").then((m) => ({ default: m.AccessPointStage })),
  ),
  ups: lazy(() => import("./equipment/3d/stages/UpsStage").then((m) => ({ default: m.UpsStage }))),
  "patch-panel": lazy(() =>
    import("./equipment/3d/stages/PatchPanelStage").then((m) => ({ default: m.PatchPanelStage })),
  ),
};

class SceneBoundary extends Component<
  { onError: () => void; children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch() {
    this.props.onError();
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function ViewToggle({ view, onChange }: { view: ViewMode; onChange: (v: ViewMode) => void }) {
  return (
    <span className="inline-flex items-center gap-1" role="group" aria-label="Workbench view">
      <button
        type="button"
        className={`chip ${
          view === "2d" ? "chip-on" : "bg-lab-panel text-lab-muted hover:text-lab-text"
        }`}
        aria-pressed={view === "2d"}
        onClick={() => onChange("2d")}
      >
        2D
      </button>
      <button
        type="button"
        className={`chip ${
          view === "3d" ? "chip-on" : "bg-lab-panel text-lab-muted hover:text-lab-text"
        }`}
        aria-pressed={view === "3d"}
        onClick={() => onChange("3d")}
      >
        3D
      </button>
    </span>
  );
}

/**
 * Equipment environment entry: capability-gated 2D/3D workbench. The 3D
 * stage is a per-family lazy chunk; the SVG projection stays the safety net
 * for missing WebGL, reduced motion, load failure, or explicit choice.
 */
export function EquipmentLabView({
  scenario,
  run,
  onInspect,
  onOpenKb,
  onContextPanel,
  guideFocus,
}: EquipmentLabProps) {
  const [webgl] = useState(() => supportsWebGL());
  const [reduced] = useState(() => prefersReducedMotion());
  const [view, setView] = useState<ViewMode>(() =>
    resolveInitialView({
      webgl: supportsWebGL(),
      reducedMotion: prefersReducedMotion(),
      stored: readStoredView(),
    }),
  );
  const [selected, setSelected] = useState<string | null>(() =>
    equipmentFocusComponent(scenario.environment),
  );
  const [hover, setHover] = useState<{ id: string; x: number; y: number } | null>(null);
  const [resetToken, setResetToken] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  const family = getFamily(scenario.environment.deviceFamily);
  const presets = family?.cameraPresets ?? [];
  const [preset, setPreset] = useState<string>(
    () => equipmentFocusPreset(scenario.environment) ?? presets[0]?.id ?? "",
  );

  // Guided-step focus: mirror the hardware bench — select the target part and
  // apply the step's camera preset on step change only (manual orbiting is
  // never pulled back while the same step stays active).
  const guideComponentId = guideFocus?.componentId;
  const guideCameraPreset = guideFocus?.cameraPreset;
  const guideKey = guideComponentId ? `${guideComponentId}|${guideCameraPreset ?? ""}` : null;
  const [appliedGuideKey, setAppliedGuideKey] = useState<string | null>(null);
  if (appliedGuideKey !== guideKey) {
    setAppliedGuideKey(guideKey);
    if (guideComponentId) {
      const component = equipmentFocusComponent({
        focusTarget: { componentId: guideComponentId },
        deviceFamily: scenario.environment.deviceFamily,
      });
      if (component) setSelected(component);
      if (guideCameraPreset) {
        const nextPreset = equipmentFocusPreset({
          focusTarget: { cameraPreset: guideCameraPreset },
          deviceFamily: scenario.environment.deviceFamily,
        });
        if (nextPreset) setPreset(nextPreset);
      }
    }
  }

  // Guide-open selection is derived from the step target (never free-floating),
  // so the inspector and the reticle always name the same object.
  const activeSelected = selected;

  const world = run.world;
  const components = scenario.environment.components as string[];
  const compVisible = (id: string): boolean => components.length === 0 || components.includes(id);

  const setMode = (v: ViewMode): void => {
    setView(v);
    storeView(v);
    setHover(null);
  };
  const activateComponent = (id: string | null): void => {
    if (id === null) {
      setSelected(null);
      return;
    }
    if (guideFocus?.componentId === id && guideFocus.actionId) {
      const hotspot = buildEquipmentHotspot(scenario, run, id);
      const action = hotspot?.actions?.find((candidate) => candidate.id === guideFocus.actionId);
      if (action && !action.applied && !action.disabled) {
        onInspect(action.id);
        return;
      }
    }
    setSelected(id);
  };

  const onHoverScene = (id: string | null, x?: number, y?: number): void => {
    if (id === null || x === undefined || y === undefined) {
      setHover(null);
      return;
    }
    const rect = stageRef.current?.getBoundingClientRect();
    setHover({
      id,
      x: rect ? x - rect.left : x,
      y: rect ? y - rect.top : y,
    });
  };

  const stage =
    view === "3d" && family ? (
      <div
        className={`hw3d-stage${hover ? " is-hot" : ""}`}
        ref={stageRef}
        data-testid="equipment-stage-3d"
        data-guide-3d-target={guideComponentId ?? undefined}
      >
        <SceneBoundary onError={() => setMode("2d")}>
          <Suspense fallback={<div className="hw3d-fallback">Loading 3D workbench…</div>}>
            {(() => {
              const Stage = STAGES[family.id];
              return (
                <Stage
                  state={familyState(world, family)}
                  visible={compVisible}
                  reduced={reduced}
                  selected={activeSelected}
                  hovered={hover?.id ?? null}
                  onSelect={activateComponent}
                  onHover={onHoverScene}
                  presets={presets}
                  preset={preset}
                  resetToken={resetToken}
                  guideTarget={guideComponentId ?? null}
                />
              );
            })()}
          </Suspense>
        </SceneBoundary>

        <div className="hw3d-toolbar" role="group" aria-label="Camera views">
          {presets.map((p) => (
            <button
              key={p.id}
              type="button"
              className={`chip ${
                preset === p.id ? "chip-on" : "bg-lab-panel/90 text-lab-muted hover:text-lab-text"
              }`}
              aria-pressed={preset === p.id}
              onClick={() => setPreset(p.id)}
            >
              {p.label}
            </button>
          ))}
          <button
            type="button"
            className="chip bg-lab-panel/90 text-lab-muted hover:text-lab-text"
            title="Reset camera to current view"
            onClick={() => setResetToken((t) => t + 1)}
          >
            <RotateCcw size={11} aria-hidden />
            Reset
          </button>
        </div>

        {hover && (
          <div className="hw3d-tip" style={{ left: hover.x + 14, top: hover.y + 14 }} aria-hidden>
            {family.components.find((c) => c.id === hover.id)?.label ?? hover.id}
          </div>
        )}
      </div>
    ) : undefined;

  return (
    <EquipmentLab
      scenario={scenario}
      run={run}
      onInspect={onInspect}
      onOpenKb={onOpenKb}
      selected={activeSelected}
      onSelect={setSelected}
      onContextPanel={onContextPanel}
      guideFocus={guideFocus}
      cameraPreset={preset}
      stage={stage}
      stageActions={webgl ? <ViewToggle view={view} onChange={setMode} /> : null}
    />
  );
}
