import { useState } from "react";
import {
  BOOT_COPY,
  BOOT_STAGES,
  bootStageIndex,
  type BootPresentation,
  type BootStageDef,
  type BootStageId,
} from "./bootSequence";

function stageDef(id: BootStageId): BootStageDef {
  const def = BOOT_STAGES.find((s) => s.id === id);
  if (!def) throw new Error(`unknown boot stage: ${id}`);
  return def;
}

interface StepState {
  state: "done" | "current" | "pending";
  stateText: string;
}

function stepStateFor(
  presentation: BootPresentation,
  index: number,
): StepState {
  // Restored snapshots: no boot history was witnessed — never mark stages.
  if (presentation.kind === "restored") {
    return { state: "pending", stateText: "boot history unavailable" };
  }
  let current = -1;
  if (presentation.kind === "ready") {
    current = bootStageIndex("ready");
  } else if (
    (presentation.kind === "booting" || presentation.kind === "paused") &&
    presentation.stage !== null
  ) {
    current = bootStageIndex(presentation.stage);
  }
  if (index < current) return { state: "done", stateText: "observed" };
  if (index === current) return { state: "current", stateText: "current stage" };
  return { state: "pending", stateText: "not observed yet" };
}

interface Explanation {
  title: string;
  what: string;
  why?: string;
  note?: string;
}

function explain(presentation: BootPresentation): Explanation {
  switch (presentation.kind) {
    case "stopped":
      return { title: "Machine off", what: BOOT_COPY.stopped };
    case "restored":
      return { title: "State restored", what: BOOT_COPY.restored };
    case "ready": {
      const def = stageDef("ready");
      return { title: def.label, what: def.what, why: def.why };
    }
    case "booting":
      if (presentation.stage === null) {
        return { title: "Booting", what: BOOT_COPY.observing };
      }
      return withStage(presentation.stage, {});
    case "paused":
      if (presentation.stage === null) {
        return { title: "Paused", what: BOOT_COPY.paused, note: BOOT_COPY.observing };
      }
      return {
        ...withStage(presentation.stage, { note: BOOT_COPY.paused }),
        title: `${stageDef(presentation.stage).label} — paused`,
      };
  }
}

function withStage(id: BootStageId, extra: { note?: string }): Explanation {
  const def = stageDef(id);
  return { title: def.label, what: def.what, why: def.why, ...extra };
}

/**
 * Boot Sequence Explorer (phase 14B-3) — an educational layer wrapped around
 * the REAL boot: every stage shown is one actually observed in the guest's
 * screen output. Explore Boot shows the timeline and explanations; Free Boot
 * keeps only this slim header so the machine display stays dominant.
 * Presentation only — pausing, resetting, and the emulator itself are
 * untouched by this component.
 */
export function BootSequenceExplorer({
  presentation,
}: {
  presentation: BootPresentation;
}) {
  const [freeMode, setFreeMode] = useState(false);
  const explained = explain(presentation);

  return (
    <section className="vm-boot">
      <div className="vm-boot__head">
        <h2 className="vm-boot__title">Boot sequence</h2>
        <span className="vm-boot__mode-label t-mono">
          Mode: <strong>{freeMode ? "Free boot" : "Explore boot"}</strong>
        </span>
        <button
          type="button"
          className="btn-secondary vm-boot__mode"
          aria-pressed={freeMode}
          onClick={() => setFreeMode((free) => !free)}
        >
          Free boot
        </button>
      </div>

      {!freeMode && (
        <>
          <ol className="vm-boot__path" aria-label="Boot stages">
            {BOOT_STAGES.map((def, i) => {
              const { state, stateText } = stepStateFor(presentation, i);
              return (
                <li
                  key={def.id}
                  className="vm-boot__step"
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="vm-boot__dot" aria-hidden="true" />
                  <span className="vm-boot__label">{def.label}</span>
                  <span className="sr-only">{stateText}</span>
                </li>
              );
            })}
          </ol>

          <div className="vm-boot__explain" aria-live="polite" aria-atomic="true">
            <p className="vm-boot__stage-label t-mono">{explained.title}</p>
            <p className="vm-boot__what">{explained.what}</p>
            {explained.why && (
              <p className="vm-boot__why">
                <strong>Why it matters:</strong> {explained.why}
              </p>
            )}
            {explained.note && <p className="vm-boot__note">{explained.note}</p>}
          </div>

          <p className="vm-boot__clue">{BOOT_COPY.clue}</p>
        </>
      )}
    </section>
  );
}
