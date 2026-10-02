import {
  Fragment,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FocusEventHandler,
} from "react";
import { DisciplineIcon } from "@/components/ui/domainVisuals";
import {
  DEMO_PHASES,
  DEMO_STAGES,
  LOOP_PAUSE_MS,
  MANUAL_HOLD_MS,
  PHASE_CASE_STATE,
  PHASE_DURATION_MS,
  PHASE_LABEL,
  PHASE_STATUS,
  getDemoCases,
  nextDemoPhase,
  type ChainState,
  type DemoDomainId,
  type DemoLogRow,
  type DemoPhase,
  type DemoStage,
  type EdgeState,
} from "./landingData";
import { useInView, usePrefersReducedMotion } from "./motionHooks";

/**
 * The landing hero's interactive miniature — presentation only.
 *
 * It borrows the product's visual grammar (work order, probe log, chain of
 * custody) but imports no scenario engine, no RunState, no v86 and no 3D
 * runtime: React state plus SVG/CSS. Every sentence it shows is engine
 * feedback copied from the three real scenarios in `landingData`.
 *
 * Phase 15B.1: the demo also runs itself through observe → trace → verify
 * like a diagnostic instrument changing state. Hovering, focusing or
 * picking a phase by hand takes control; reduced motion or an off-screen
 * demo keeps it static and fully readable.
 */

const CHAIN_GLYPH: Record<ChainState, string> = {
  dead: "✕",
  ok: "✓",
  fault: "✕",
  pending: "○",
};
const CHAIN_WORD: Record<ChainState, string> = {
  dead: "no power",
  ok: "ok",
  fault: "fault",
  pending: "unchecked",
};

const MARK_GLYPH: Record<NonNullable<DemoLogRow["mark"]>, string> = {
  ok: "✓",
  fault: "✕",
  pending: "○",
};

const EDGE_GLYPH: Record<EdgeState, string> = {
  untested: "?",
  ok: "✓",
  fault: "✕",
};
const EDGE_WORD: Record<EdgeState, string> = {
  untested: "untested",
  ok: "working",
  fault: "failing",
};

function LogRow({ row, index }: { row: DemoLogRow; index: number }) {
  const style = { "--i": index } as CSSProperties;
  if (row.kind === "fix") {
    return (
      <div className="lp-log-fix lp-reveal-line" style={style}>
        <span className="lp-fix-tag">Fix applied</span>
        <span className="lp-log-src">{row.text}</span>
      </div>
    );
  }
  if (row.kind === "cmd") {
    return (
      <div className="lp-log-cmd lp-reveal-line" style={style}>
        <span className="lp-prompt" aria-hidden>
          $
        </span>
        {row.text}
      </div>
    );
  }
  if (row.kind === "out") {
    return (
      <div className="lp-log-out lp-reveal-line" style={style}>
        {row.text}
      </div>
    );
  }
  return (
    <div
      className="lp-log-line lp-reveal-line"
      data-mark={row.mark ?? "none"}
      style={style}
    >
      {row.mark ? (
        <span className="lp-log-mark" aria-hidden>
          {MARK_GLYPH[row.mark]}
        </span>
      ) : null}
      <span>{row.text}</span>
    </div>
  );
}

function Log({
  rows,
  phaseKey,
}: {
  rows?: readonly DemoLogRow[];
  phaseKey: DemoPhase;
}) {
  if (!rows || rows.length === 0) return null;
  return (
    <div className="lp-log">
      {rows.map((row, i) => (
        <Fragment key={`${phaseKey}:${i}`}>
          <LogRow row={row} index={i} />
        </Fragment>
      ))}
    </div>
  );
}

function ChainView({
  chain,
  states,
  phaseKey,
}: {
  chain: readonly string[];
  states: readonly ChainState[];
  phaseKey: DemoPhase;
}) {
  return (
    <ol className="lp-chain" data-phase={phaseKey}>
      {chain.map((label, i) => {
        const state = states[i];
        return (
          <li
            key={label}
            data-state={state}
            style={{ transitionDelay: `${i * 110}ms` }}
          >
            <span className="lp-chain-mark" aria-hidden>
              {CHAIN_GLYPH[state]}
            </span>
            <span className="lp-chain-name">{label}</span>
            <span className="lp-chain-state">{CHAIN_WORD[state]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function HardwareStageView({
  stage,
  phase,
}: {
  stage: Extract<DemoStage, { kind: "hardware" }>;
  phase: DemoPhase;
}) {
  const states = stage.states[phase];
  return (
    <div className="lp-hw">
      <ChainView chain={stage.chain} states={states} phaseKey={phase} />
      <Log rows={stage.phases[phase].lines} phaseKey={phase} />
    </div>
  );
}

function edgeMidpoint(
  from: { x: number; y: number },
  to: { x: number; y: number },
) {
  return { x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 };
}

function NetworkStageView({
  stage,
  phase,
}: {
  stage: Extract<DemoStage, { kind: "networking" }>;
  phase: DemoPhase;
}) {
  const states = stage.states[phase];
  const byId = new Map(stage.nodes.map((n) => [n.id, n]));
  const summary = stage.edges
    .map((e) => {
      const from = byId.get(e.from)!;
      const to = byId.get(e.to)!;
      return `${from.label} to ${to.label}: ${EDGE_WORD[states[e.key]]}`;
    })
    .join(", ");

  return (
    <div className="lp-net">
      <svg
        viewBox="0 0 340 180"
        className="lp-topo"
        role="img"
        aria-label={`Network map — ${summary}`}
      >
        {stage.edges.map((e) => {
          const from = byId.get(e.from)!;
          const to = byId.get(e.to)!;
          const mid = edgeMidpoint(from, to);
          const state = states[e.key];
          return (
            <g key={e.key}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                className="lp-edge"
                data-state={state}
              />
              <g className="lp-edge-badge" data-state={state}>
                <rect x={mid.x - 9} y={mid.y - 8} width={18} height={16} rx={2} />
                <text x={mid.x} y={mid.y + 3.5} textAnchor="middle">
                  {EDGE_GLYPH[state]}
                </text>
              </g>
            </g>
          );
        })}
        {stage.nodes.map((n) => (
          <g key={n.id} className="lp-node">
            <rect x={n.x - 44} y={n.y - 17} width={88} height={34} rx={2} />
            <text x={n.x} y={n.y - 3} textAnchor="middle" className="lp-node-label">
              {n.label}
            </text>
            <text x={n.x} y={n.y + 10} textAnchor="middle" className="lp-node-sub">
              {n.sub}
            </text>
          </g>
        ))}
      </svg>
      <p className="lp-legend t-mono" aria-hidden>
        <span>? untested</span>
        <span>✓ working</span>
        <span>✕ failing</span>
      </p>
      <Log rows={stage.phases[phase].lines} phaseKey={phase} />
    </div>
  );
}

function LinuxStageView({
  stage,
  phase,
}: {
  stage: Extract<DemoStage, { kind: "linux" }>;
  phase: DemoPhase;
}) {
  const content = stage.phases[phase];
  return (
    <div className="lp-nix">
      <ChainView
        chain={stage.chain}
        states={stage.states[phase]}
        phaseKey={phase}
      />
      {content.file ? (
        <div className="lp-file">
          <span className="lp-file-path t-mono">{content.file.path}</span>
          <span className="lp-file-meta t-mono">{content.file.meta}</span>
        </div>
      ) : null}
      <div className="lp-term">
        <Log rows={content.lines} phaseKey={phase} />
      </div>
    </div>
  );
}

export function LabPreview() {
  const cases = useMemo(() => getDemoCases(), []);
  const [domain, setDomain] = useState<DemoDomainId>("hardware");
  const [phase, setPhase] = useState<DemoPhase>("observe");
  const [held, setHeld] = useState(false);
  const [manualHold, setManualHold] = useState(false);

  const reduced = usePrefersReducedMotion();
  const previewRef = useRef<HTMLDivElement>(null);
  const view = useInView(previewRef, { once: false });
  // Autonomous cycle: only while on screen, motion allowed, and not paused
  // by hover/focus or a recent manual pick.
  const autoEnabled =
    view.supported && view.inView && !reduced && !held && !manualHold;

  useEffect(() => {
    if (!autoEnabled) return;
    const delay =
      PHASE_DURATION_MS[phase] + (phase === "verify" ? LOOP_PAUSE_MS : 0);
    const t = setTimeout(() => setPhase(nextDemoPhase(phase)), delay);
    return () => clearTimeout(t);
  }, [autoEnabled, phase]);

  // After a manual pick the visitor drives the demo for a fixed window,
  // then the instrument resumes its cycle from wherever they left it.
  useEffect(() => {
    if (!manualHold) return;
    const t = setTimeout(() => setManualHold(false), MANUAL_HOLD_MS);
    return () => clearTimeout(t);
  }, [manualHold]);

  const pickPhase = (p: DemoPhase) => {
    setPhase(p);
    setManualHold(true);
  };

  const switchDomain = (id: DemoDomainId) => {
    if (id === domain) return;
    setDomain(id);
    setPhase("observe"); // clean instrument reset onto the new channel
    setManualHold(false);
  };

  const pause = () => setHeld(true);
  const resume = () => setHeld(false);
  const handleBlur: FocusEventHandler<HTMLDivElement> = (e) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) resume();
  };

  const activeCase = cases.find((c) => c.id === domain) ?? cases[0];
  const stage = DEMO_STAGES[activeCase.id];
  const caseState = PHASE_CASE_STATE[phase];
  const phaseIndex = DEMO_PHASES.indexOf(phase);

  return (
    <div
      className="lp-preview"
      data-testid="lab-preview"
      data-phase={phase}
      ref={previewRef}
      onMouseEnter={pause}
      onMouseLeave={resume}
      onFocusCapture={pause}
      onBlurCapture={handleBlur}
    >
      <div className="lp-preview-bar">
        <span className="lp-preview-title">Case preview</span>
        <span className="lp-live" data-phase={phase}>
          <span className="lp-live-blip" aria-hidden />
          {PHASE_STATUS[phase]}
        </span>
        <div className="lp-domains" role="group" aria-label="Choose a discipline case">
          {cases.map((c) => (
            <button
              key={c.id}
              type="button"
              className="lp-domain-btn"
              aria-pressed={domain === c.id}
              onClick={() => switchDomain(c.id)}
            >
              <DisciplineIcon category={c.category} size={13} />
              {c.discipline}
            </button>
          ))}
        </div>
      </div>

      <div className="lp-case lp-channel" key={domain}>
        <div className="case-strip">
          <span className="case-strip-id">{activeCase.ticketId}</span>
          <span className={`state-mark state-mark--${caseState.mark}`}>
            {caseState.word}
          </span>
          <span className="case-strip-meta">
            <span className="t-mono">{activeCase.environment}</span>
          </span>
        </div>

        <div className="lp-case-body">
          <p className="case-disc">
            <DisciplineIcon category={activeCase.category} size={15} />
            {activeCase.discipline}
            <span aria-hidden> · </span>
            <span className="lp-case-title">{activeCase.incidentTitle}</span>
          </p>
          <p className="t-lead case-symptom">“{activeCase.symptom}”</p>

          <div className="lp-stage">
            {stage.kind === "hardware" ? (
              <HardwareStageView stage={stage} phase={phase} />
            ) : stage.kind === "networking" ? (
              <NetworkStageView stage={stage} phase={phase} />
            ) : (
              <LinuxStageView stage={stage} phase={phase} />
            )}
            {phase === "observe" ? (
              <p className="lp-stage-hint">
                Nothing run yet — evidence appears here as you work the case.
              </p>
            ) : null}
          </div>

          <div className="lp-steps" role="group" aria-label="Case progress">
            {DEMO_PHASES.map((p, i) => (
              <button
                key={p}
                type="button"
                className="lp-step"
                data-state={i < phaseIndex ? "done" : i === phaseIndex ? "now" : "todo"}
                aria-pressed={phase === p}
                onClick={() => pickPhase(p)}
              >
                <span className="lp-step-mark" aria-hidden>
                  {i < phaseIndex ? "✓" : i === phaseIndex ? "●" : "○"}
                </span>
                {PHASE_LABEL[p]}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
