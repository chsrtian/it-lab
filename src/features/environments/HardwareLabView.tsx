import { Component, lazy, Suspense, useRef, useState, type ReactNode } from "react";
import { RotateCcw } from "lucide-react";
import type { CompId } from "./benchHotspot";
import { HOTSPOT_META, buildBenchHotspot, hardwareFocusComponent } from "./benchHotspot";
import { HardwareLab, type HardwareLabProps } from "./HardwareLab";
import type { CameraPresetId } from "./hardware3d/presets";
import { CAMERA_PRESETS, PRESET_COMPONENT, hardwareFocusPreset } from "./hardware3d/presets";
import {
  prefersReducedMotion,
  readStoredView,
  resolveInitialView,
  storeView,
  supportsWebGL,
  type ViewMode,
} from "./hardware3d/capabilities";

const HardwareScene = lazy(() =>
  import("./hardware3d/HardwareScene").then((m) => ({ default: m.HardwareScene })),
);

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
 * Hardware environment entry: capability-gated 2D/3D workbench.
 * 3D scene is a lazy chunk; SVG fallback stays the safety net for
 * missing WebGL, reduced motion, load failure, or explicit choice.
 */
export function HardwareLabView({
  scenario,
  run,
  onInspect,
  onOpenKb,
  onContextPanel,
  guideFocus,
}: HardwareLabProps) {
  const [webgl] = useState(() => supportsWebGL());
  const [reduced] = useState(() => prefersReducedMotion());
  const [view, setView] = useState<ViewMode>(() =>
    resolveInitialView({
      webgl: supportsWebGL(),
      reducedMotion: prefersReducedMotion(),
      stored: readStoredView(),
    }),
  );
  // Declarative per-scenario focus: selection + camera come from the data.
  const [selected, setSelected] = useState<CompId | null>(() =>
    hardwareFocusComponent(scenario.environment),
  );
  const [hover, setHover] = useState<{ id: CompId; x: number; y: number } | null>(null);
  const [preset, setPreset] = useState<CameraPresetId>(
    () => hardwareFocusPreset(scenario.environment) ?? "full",
  );
  const [resetToken, setResetToken] = useState(0);
  const stageRef = useRef<HTMLDivElement>(null);

  // Guided-step focus: select the target part and, when the step declares a
  // preset, move the camera — on step change only, never re-snapping while
  // the user keeps the same step (so manual camera moves survive).
  const guideComponentId = guideFocus?.componentId;
  const guideCameraPreset = guideFocus?.cameraPreset;
  const guideKey = guideComponentId ? `${guideComponentId}|${guideCameraPreset ?? ""}` : null;
  const [appliedGuideKey, setAppliedGuideKey] = useState<string | null>(null);
  if (appliedGuideKey !== guideKey) {
    setAppliedGuideKey(guideKey);
    if (guideComponentId) {
      const component = hardwareFocusComponent({
        focusTarget: { componentId: guideComponentId },
      });
      if (component) setSelected(component);
      if (guideCameraPreset) {
        const nextPreset = hardwareFocusPreset({
          focusTarget: { cameraPreset: guideCameraPreset },
        });
        if (nextPreset) setPreset(nextPreset);
      }
    }
  }

  // While the guide is open the SELECTION is derived from the step target —
  // inspector, selection mark, chain and legend can never drift away from the
  // reticle. Manual clicks are still stored underneath and resume on exit.
  const activeSelected = selected;

  const world = run.world;
  const bench = (world.bench ?? {}) as Record<string, unknown>;
  const components = scenario.environment.components as string[];
  const compVisible = (id: string): boolean => components.length === 0 || components.includes(id);

  const setMode = (v: ViewMode): void => {
    setView(v);
    storeView(v);
    setHover(null);
  };
  const activateComponent = (id: CompId | null): void => {
    if (id === null) {
      setSelected(null);
      return;
    }
    if (guideFocus?.componentId === id && guideFocus.actionId) {
      const hotspot = buildBenchHotspot(scenario, run, id);
      const action = hotspot?.actions?.find((candidate) => candidate.id === guideFocus.actionId);
      if (action && !action.applied && !action.disabled) {
        onInspect(action.id);
        return;
      }
    }
    setSelected(id);
  };

  const onHoverScene = (id: CompId | null, x?: number, y?: number): void => {
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
    view === "3d" ? (
      <div
        className={`hw3d-stage${hover ? " is-hot" : ""}`}
        ref={stageRef}
        data-guide-3d-target={guideComponentId ?? undefined}
      >
        <SceneBoundary onError={() => setMode("2d")}>
          <Suspense fallback={<div className="hw3d-fallback">Loading 3D workbench…</div>}>
            <HardwareScene
              bench={bench}
              visible={compVisible}
              reduced={reduced}
              selected={activeSelected}
              hovered={hover?.id ?? null}
              onSelect={activateComponent}
              onHover={onHoverScene}
              preset={preset}
              resetToken={resetToken}
              guideTargetId={guideComponentId ?? null}
            />
          </Suspense>
        </SceneBoundary>

        <div className="hw3d-toolbar" role="group" aria-label="Camera views">
          {CAMERA_PRESETS.filter((p) => {
            const bound = PRESET_COMPONENT[p.id];
            return bound === undefined || compVisible(bound);
          }).map((p) => (
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
            {HOTSPOT_META[hover.id].label}
          </div>
        )}
      </div>
    ) : undefined;

  return (
    <HardwareLab
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
