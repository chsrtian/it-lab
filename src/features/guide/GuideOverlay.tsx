import { useEffect, useRef, useState } from "react";
import { BookOpen, X } from "lucide-react";
import { getArticle } from "@/content";
import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { guideProgress, resolveGuideInteraction, guideStepCue, guideStepDoneWhen, type GuideCue } from "./logic";
import { resolveStepCommand } from "@/engine/commandRegistry";

export interface GuideOverlayProps {
  scenario: Scenario;
  run: RunState;
  onExit: () => void;
  onOpenKb: (articleId: string) => void;
  kbOpen?: boolean;
  /** True when the current step's target has no measurable anchor right now. */
  anchorMissing?: boolean;
  /** Interaction cue for the current step (also shown beside the reticle). */
  cue?: GuideCue | null;
}

/** Plain-language pairing for each cue — what the learner actually does. */
const CUE_HINTS: Record<GuideCue, string> = {
  CLICK: "Click this in the lab",
  TYPE: "Type this in the terminal",
  INSPECT: "Open its panel and inspect it",
  OBSERVE: "Observe this in the lab",
  TOGGLE: "Flip this control",
  CONNECT: "Seat this connection",
  VERIFY: "Verify this state",
};

/** Completion wording per cue — evidence steps read as OBSERVED, rest COMPLETED. */
const DONE_WORDS: Record<GuideCue, string> = {
  OBSERVE: "OBSERVED",
  INSPECT: "OBSERVED",
  CLICK: "COMPLETED",
  TOGGLE: "COMPLETED",
  CONNECT: "COMPLETED",
  TYPE: "COMPLETED",
  VERIFY: "OBSERVED",
};

/** How long the transient "step done" acknowledgment stays on screen. */
const DONE_ACK_MS = 1800;

export function GuideOverlay({
  scenario,
  run,
  onExit,
  onOpenKb,
  kbOpen = false,
  anchorMissing = false,
  cue = null,
}: GuideOverlayProps) {
  const progress = guideProgress(scenario, run);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    cardRef.current?.focus();
  }, []);

  // Transient completion acknowledgment: when the engine advances a step, the
  // just-finished step stays visible as a recorded state for a beat — the
  // progress is engine-driven, never a Next button.
  const walkthrough = scenario.guidedWalkthrough;
  const prevIndexRef = useRef<number | null>(null);
  const [justDone, setJustDone] = useState<{ title: string; cue: GuideCue } | null>(null);
  useEffect(() => {
    const prev = prevIndexRef.current;
    prevIndexRef.current = progress.index;
    if (prev === null || progress.index <= prev || !walkthrough) return;
    const finished = walkthrough.steps[Math.min(prev, walkthrough.steps.length - 1)];
    if (!finished) return;
    setJustDone({ title: finished.title, cue: guideStepCue(finished, scenario) });
    const timer = setTimeout(() => setJustDone(null), DONE_ACK_MS);
    return () => clearTimeout(timer);
  }, [progress.index, progress.status, progress.total, scenario, walkthrough]);

  if (progress.status === "hidden") return null;

  const step = progress.step;
  const interaction = step ? resolveGuideInteraction(step, scenario) : null;
  const article = step?.conceptId ? getArticle(step.conceptId) : undefined;
  const stepCue = cue ?? (step ? guideStepCue(step, scenario) : null);
  const commandDisplay =
    step && stepCue === "TYPE" ? resolveStepCommand(step, scenario) : null;
  const action =
    step?.actionId !== undefined
      ? scenario.actions.find((candidate) => candidate.id === step.actionId)
      : undefined;

  const announcement =
    step === null
      ? `Guided troubleshooting complete: all ${progress.total} steps done.`
      : `Step ${progress.index + 1} of ${progress.total}: ${step.title}. Target: ${interaction?.label ?? step.target.label}.`;

  const statusDetail =
    step === null
      ? null
      : step.actionId !== undefined
        ? interaction?.action?.label ?? action?.label ?? step.actionId
        : step.commandId !== undefined
          ? "run this step's command in the terminal"
          : interaction?.action?.label ?? "gather this step's evidence";

  const statusText =
    statusDetail === null ? null : `WAITING FOR ACTION — ${statusDetail}`;

  return (
    <div
      className="guide-card"
      role="region"
      aria-label="Guided troubleshooting"
      data-testid="guide-overlay"
      tabIndex={-1}
      ref={cardRef}
      onKeyDown={(event) => {
        if (event.key === "Escape" && !kbOpen) onExit();
      }}
    >
      <div className="guide-head">
        <span className="guide-count" data-testid="guide-count">
          {progress.status === "complete"
            ? "Complete"
            : `Step ${progress.index + 1} of ${progress.total}`}
        </span>
        <span className="guide-ticks" aria-hidden="true">
          {Array.from({ length: progress.total }, (_, i) => (
            <span
              key={i}
              className={`guide-tick${
                progress.status === "complete" || i < progress.index
                  ? " is-done"
                  : i === progress.index
                    ? " is-now"
                    : ""
              }`}
            />
          ))}
        </span>
        <button
          type="button"
          className="btn-ghost guide-exit"
          onClick={onExit}
          aria-label="Exit guided troubleshooting"
        >
          <X size={13} aria-hidden /> Exit Guide
        </button>
      </div>

      {justDone && (
        <p className="guide-done" data-testid="guide-done">
          ✓ {DONE_WORDS[justDone.cue]} — {justDone.title}
        </p>
      )}

      <p className="sr-only" role="status">
        {announcement}
      </p>

      {step === null ? (
        <>
          <h2 className="guide-title">Walkthrough complete</h2>
          <p className="guide-block-text">
            Every guided step is done. Keep working the same way on the next ticket.
          </p>
        </>
      ) : (
        <>
          {progress.index === 0 && walkthrough && (
            <p className="guide-intro">{walkthrough.intro}</p>
          )}
          <h2 className="guide-title">{step.title}</h2>
          <p className="guide-target" data-testid="guide-target">
            <span className="guide-target-label">TARGET:</span>
            <span>{interaction?.label ?? step.target.label}</span>
            {cue && (
              <span className="guide-cue-card" data-testid="guide-cue-card" data-guide-cue={cue}>
                {cue}
              </span>
            )}
          </p>
          {cue && (
            <p className="guide-cue-hint" data-testid="guide-cue-hint">
              {CUE_HINTS[cue]}
            </p>
          )}
          {anchorMissing && step.fallback && (
            <p className="guide-fallback" data-testid="guide-fallback">
              Look for {step.fallback}.
            </p>
          )}

          <div className="guide-blocks">
            {commandDisplay && (
              <section className="guide-block">
                <h3 className="guide-block-label">COMMAND</h3>
                <p className="guide-block-text"><code>{commandDisplay.text}</code></p>
              </section>
            )}
            {commandDisplay && (
              <section className="guide-block">
                <h3 className="guide-block-label">PURPOSE</h3>
                <p className="guide-block-text">{commandDisplay.purpose}</p>
              </section>
            )}
            <section className="guide-block">
              <h3 className="guide-block-label">DO THIS</h3>
              <p className="guide-block-text">{interaction?.instruction ?? step.explanation}</p>
            </section>
            <section className="guide-block">
              <h3 className="guide-block-label">WHY</h3>
              <p className="guide-block-text">{step.why}</p>
            </section>
            <section className="guide-block">
              <h3 className="guide-block-label">LOOK FOR</h3>
              <p className="guide-block-text">{step.expectedObservation}</p>
            </section>
            <section className="guide-block">
              <h3 className="guide-block-label">DONE WHEN</h3>
              <p className="guide-block-text">{guideStepDoneWhen(step, scenario)}</p>
            </section>
          </div>

          <div className="guide-foot">
            <p className="guide-status" data-testid="guide-status">
              {statusText}
            </p>
            {step.conceptId && article && (
              <button
                type="button"
                className="chip guide-concept"
                data-testid="guide-concept"
                onClick={() => onOpenKb(step.conceptId as string)}
              >
                <BookOpen size={11} aria-hidden />
                Learn: {article.title}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
