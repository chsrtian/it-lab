import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GuidedTarget, Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { LabSection, Chain, ChainStep, ChainArrow, InspectDock } from "@/features/env";
import {
  Printer,
  Router as RouterIcon,
  Wifi,
  Network,
  BatteryCharging,
  LayoutGrid,
  X,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { DeviceFamilyId } from "@/content/schema";
import { getFamily, familyState } from "./equipment/registry";
import { buildEquipmentHotspot, equipmentFocusComponent } from "./equipment/hotspot";
import type { SetLabContextPanel } from "./contextPanel";
import type { SvgProps } from "./equipment/types";
import { PrinterSvg } from "./equipment/svg/PrinterSvg";
import { RouterSvg } from "./equipment/svg/RouterSvg";
import { SwitchSvg } from "./equipment/svg/SwitchSvg";
import { AccessPointSvg } from "./equipment/svg/AccessPointSvg";
import { UpsSvg } from "./equipment/svg/UpsSvg";
import { PatchPanelSvg } from "./equipment/svg/PatchPanelSvg";

export interface EquipmentLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
  /** Replace the SVG stage with an alternate primary visual (3D stage). */
  stage?: ReactNode;
  /** Extra controls shown next to the stage title (view toggle). */
  stageActions?: ReactNode;
  /** Controlled selection (shared between 2D/3D stage and shared chrome). */
  selected?: string | null;
  onSelect?: (id: string | null) => void;
  onContextPanel?: SetLabContextPanel;
  /** Current guided-step target (present only while the guide is open). */
  guideFocus?: (GuidedTarget & { actionId?: string }) | null;
  /** Camera preset currently applied by the view (observability for tests). */
  cameraPreset?: string;
}

const FAMILY_ICON: Record<DeviceFamilyId, LucideIcon> = {
  printer: Printer,
  router: RouterIcon,
  switch: Network,
  "access-point": Wifi,
  ups: BatteryCharging,
  "patch-panel": LayoutGrid,
};

const SVG_BY_FAMILY: Record<DeviceFamilyId, (p: SvgProps) => ReactNode> = {
  printer: PrinterSvg,
  router: RouterSvg,
  switch: SwitchSvg,
  "access-point": AccessPointSvg,
  ups: UpsSvg,
  "patch-panel": PatchPanelSvg,
};

/**
 * Equipment lab chrome: family chain strip + dominant stage (SVG or 3D) +
 * inspector/legend. Scenario differences arrive as world state only —
 * there are no scenario-id branches here or in the family modules.
 */
export function EquipmentLab({
  scenario,
  run,
  onInspect,
  onOpenKb,
  stage,
  stageActions,
  selected: selectedProp,
  onSelect: onSelectProp,
  onContextPanel,
  guideFocus,
  cameraPreset,
}: EquipmentLabProps) {
  const family = getFamily(scenario.environment.deviceFamily);
  const [internalSelected, setInternalSelected] = useState<string | null>(() =>
    equipmentFocusComponent(scenario.environment),
  );
  const selected = selectedProp !== undefined ? selectedProp : internalSelected;
  const setSelected = useCallback((id: string | null): void => {
    if (onSelectProp) onSelectProp(id);
    else setInternalSelected(id);
  }, [onSelectProp]);
  const activateComponent = useCallback((id: string | null): void => {
    if (id && guideFocus?.componentId === id && guideFocus.actionId) {
      const hotspot = buildEquipmentHotspot(scenario, run, id);
      const action = hotspot?.actions?.find((candidate) => candidate.id === guideFocus.actionId);
      if (action && !action.applied && !action.disabled) {
        onInspect(action.id);
        return;
      }
    }
    setSelected(id);
  }, [guideFocus, onInspect, run, scenario, setSelected]);

  const components = scenario.environment.components as string[];
  const visible = (id: string): boolean => components.length === 0 || components.includes(id);
  const selectedHotspot = useMemo(
    () => (selected ? buildEquipmentHotspot(scenario, run, selected) : null),
    [scenario, run, selected],
  );
  const inspectorPanel = useMemo(
    () =>
      selectedHotspot
        ? {
            id: `equipment:${selectedHotspot.id}`,
            title: "Component inspector",
            componentId: selectedHotspot.id,
            onClose: () => setSelected(null),
            body: (
              <InspectDock selected={selectedHotspot} onAction={onInspect} onOpenKb={onOpenKb}>
                <button
                  type="button"
                  className="btn-ghost w-full justify-center text-xs mt-1"
                  onClick={() => setSelected(null)}
                >
                  <X size={12} aria-hidden /> Close
                </button>
              </InspectDock>
            ),
          }
        : null,
    [onInspect, onOpenKb, selectedHotspot, setSelected],
  );
  const inspectorKey = selectedHotspot
    ? JSON.stringify({
        id: selectedHotspot.id,
        state: selectedHotspot.stateSummary,
        evidence: selectedHotspot.evidence?.map((e) => [e.label, e.value, e.tone]),
        actions: selectedHotspot.actions?.map((a) => [a.id, a.applied, a.disabled]),
      })
    : "none";
  const lastContextKey = useRef<string | null>(null);
  useEffect(() => {
    if (!onContextPanel) return;
    if (lastContextKey.current === inspectorKey) return;
    lastContextKey.current = inspectorKey;
    onContextPanel?.(inspectorPanel);
  }, [inspectorKey, inspectorPanel, onContextPanel]);
  useEffect(() => () => onContextPanel?.(null), [onContextPanel]);

  if (!family) return null;

  const state = familyState(run.world, family);
  const status = family.status(state);
  const steps = family.chain(state);
  const Icon = FAMILY_ICON[family.id];
  const Svg = SVG_BY_FAMILY[family.id];

  /** Stages the learner has actually worked (their diagnostic action applied). */
  const verifiedStages = new Set(
    steps
      .filter(
        (s) => buildEquipmentHotspot(scenario, run, s.component)?.relatedAction?.applied === true,
      )
      .map((s) => s.component),
  );

  return (
    <>
      {/* Signal path — workspace band above the environment (Phase 12F) */}
      <Chain label={family.chainLabel} className="env-path">
        {steps
          .filter((s) => visible(s.component))
          .map((s, i, arr) => (
            <span key={s.id} className="contents">
              <ChainStep
                id={s.id}
                label={s.label}
                state={s.state}
                tone={s.tone}
                verified={verifiedStages.has(s.component)}
                active={selected !== null && selected === s.component}
                onClick={() => activateComponent(s.component)}
              />
              {i < arr.length - 1 && (
                <ChainArrow
                  healthy={
                    s.tone === "ok" && (arr[i + 1]?.tone === "ok" || arr[i + 1]?.tone === "unknown")
                  }
                />
              )}
            </span>
          ))}
      </Chain>

      <LabSection
        aria-label={`${family.label} lab`}
        data-testid="equipment-lab"
        title={
          <span className="inline-flex items-center gap-1.5">
            <Icon size={14} aria-hidden className="text-lab-warn" />
            {family.label} lab
          </span>
        }
        status={status}
        actions={
          <>
            {stageActions}
            <span className="hidden md:inline text-lab-muted">
              {scenario.environment.availableTools.join(" · ") || "bench"}
            </span>
          </>
        }
      >
        <div
          className="hw-body"
          data-guide-focus={guideFocus?.componentId ?? ""}
          data-camera-preset={cameraPreset ?? ""}
        >
          {/* Stage — the dominant surface (3D when available, SVG fallback) */}
          <div className="hw-stage-wrap">
            {stage ?? (
              <div className="hw-svg-wrap">
                <Svg
                  state={state}
                  statusLabel={status.label}
                  selected={selected}
                onSelect={activateComponent}
                  visible={visible}
                />
              </div>
            )}
            {selectedHotspot && !onContextPanel ? (
              <aside
                className="hw-inspector"
                aria-label="Component inspector"
                data-testid="eq-inspector"
              >
                <InspectDock selected={selectedHotspot} onAction={onInspect} onOpenKb={onOpenKb}>
                  <button
                    type="button"
                    className="btn-ghost w-full justify-center text-xs mt-1"
                    onClick={() => setSelected(null)}
                  >
                    <X size={12} aria-hidden /> Close
                  </button>
                </InspectDock>
              </aside>
            ) : !selectedHotspot ? (
              <div className="hw-legend" role="group" aria-label="Component quick select">
                {family.components.map((c) => {
                  if (!visible(c.id)) return null;
                  return (
                    <button
                      key={c.id}
                      type="button"
                      className="chip bg-lab-panel/90 text-lab-muted hover:text-lab-text"
                      onClick={() => activateComponent(c.id)}
                      aria-pressed={selected === c.id}
                    >
                      {c.label}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </LabSection>
    </>
  );
}
