import { resolveGuideInteraction } from "@/features/guide/logic";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bug,
  ClipboardList,
  FileText,
  Lightbulb,
  MessageSquare,
  RotateCcw,
  ShieldCheck,
  Terminal as TerminalIcon,
  X,
} from "lucide-react";
import { getScenario, getArticle } from "@/content";
import { DIFFICULTY_LABEL, disciplineLabel } from "@/content/domainMeta";
import type { Scenario } from "@/content/schema";
import {
  applyAction,
  availableActions,
  canVerify,
  createRun,
  createConversation,
  askCustomer,
  mentorHint,
  explainConcept,
  buildLearningLoop,
  evaluateActionDef,
  recordCommand,
  requestHint,
  scoreRun,
  submitDiagnosis,
  verify,
  type ConversationState,
  type LearningLoopCard,
  type RunMode,
  type RunState,
} from "@/engine";
import { SimTerminal } from "@/features/terminal/SimTerminal";
import { WorldInspector } from "@/features/scenario/WorldInspector";
import { DevDiagnostics, DevDiagnosticsToggle } from "@/features/scenario/DevDiagnostics";
import { useDevDiagnostics } from "@/features/scenario/useDevDiagnostics";
import { EnvironmentRenderer } from "@/features/environments/EnvironmentRenderer";
import type { LabContextPanel } from "@/features/environments/contextPanel";
import { CasePath, hasOwnSignalPath } from "@/features/env";
import { hasCustomerConversation } from "@/features/environments/hasCustomerConversation";
import { getFamily } from "@/features/environments/equipment/registry";
import { SupportLab } from "@/features/environments/SupportLab";
import { LearningLoopPanel } from "@/features/scenario/LearningLoopPanel";
import { KbOverlay } from "@/features/kb/KbOverlay";
import {
  GuideEntryButton,
  GuideOverlay,
  GuideTargetLayer,
  guideProgress,
  guideStepCue,
  useGuideAnchor,
} from "@/features/guide";
import { IncidentBanner } from "@/components/IncidentBanner";
import { Disclosure, StatusBadge } from "@/components/ui";
import { useProgressStore } from "@/store/progress";

const modeLabels: Record<RunMode, string> = {
  guided: "Guided",
  practice: "Practice",
  challenge: "Challenge",
};

/** One honest line per mode — the row IS the selector, no radio widget. */
const modeNotes: Record<RunMode, string> = {
  guided: "Walks the diagnostic path with you, step by step",
  practice: "Open bench - work the ticket at your own pace",
  challenge: "Hypotheses hidden - work the case cold",
};

/** Friendly prerequisite: case id + title, never the scenario slug. */
const prereqLabel = (id: string): string => {
  const s = getScenario(id);
  return s ? `${s.ticket.id} · ${s.title}` : id;
};
const TOOL_LABELS: Record<DockId, string> = {
  terminal: "Terminal",
  customer: "Customer",
  evidence: "Evidence",
  hints: "Hints",
  learn: "Learn",
  journal: "Journal",
  dev: "Diagnostics",
};
const envKindLabel: Record<string, string> = {
  "network+terminal": "Network + terminal",
  "windows-panel": "Windows console",
  "linux-terminal": "Linux console",
  "hardware-bench": "Hardware bench",
  "equipment-bench": "Equipment bench",
  mixed: "Service desk",
};

/** Contextual bottom-dock drawers — one open at a time (or none). */
type DockId =
  "terminal" | "customer" | "evidence" | "hints" | "learn" | "journal" | "dev";

function startRun(scenario: Scenario, mode: RunMode): RunState {
  return createRun(scenario, mode);
}

function startConversation(scenario: Scenario): ConversationState {
  return createConversation(scenario);
}

export function ScenarioPage() {
  const { scenarioId } = useParams();
  const scenario = scenarioId ? getScenario(scenarioId) : undefined;
  const recordRun = useProgressStore((s) => s.recordRun);
  const [mode, setMode] = useState<RunMode>("guided");
  const [run, setRun] = useState<RunState | null>(null);
  const [conversation, setConversation] = useState<ConversationState | null>(null);
  const [activeScenarioId, setActiveScenarioId] = useState(scenarioId);
  const [learningLoop, setLearningLoop] = useState<LearningLoopCard | null>(null);
  const [kbOverlayId, setKbOverlayId] = useState<string | null>(null);
  const [dock, setDock] = useState<DockId | null>(null);
  const [labContextPanel, setLabContextPanel] = useState<LabContextPanel | null>(null);
  const [briefOpen, setBriefOpen] = useState(false);
  const [dismissedFeedback, setDismissedFeedback] = useState<LearningLoopCard | null>(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const diagnostics = useDevDiagnostics();
  const logRef = useRef<HTMLDivElement>(null);

  if (activeScenarioId !== scenarioId) {
    setActiveScenarioId(scenarioId);
    setRun(null);
    setConversation(null);
    setMode("guided");
    setLearningLoop(null);
    setKbOverlayId(null);
    setDock(null);
    setLabContextPanel(null);
    setBriefOpen(false);
    setDismissedFeedback(null);
    setGuideOpen(false);
  }

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [run?.actionLog.length, run?.lastFeedback, conversation?.messages.length]);

  // The right utility rail hosts one expanded region at a time: Customer
  // and Guide are mutually exclusive; the tool drawers keep working next to
  // the guide (the walkthrough often says "open the terminal and run this").
  const toggleDock = useCallback((id: DockId) => {
    if (id === "customer") setGuideOpen(false);
    setDock((prev) => (prev === id ? null : id));
  }, []);

  const setGuide = useCallback((open: boolean) => {
    if (open) setDock((prev) => (prev === "customer" ? null : prev));
    setGuideOpen(open);
  }, []);

  // Guided-step target, derived from the run (never stored). While the guide
  // is closed the anchor hook is inert — zero measurement overhead.
  const guideStepProgress = useMemo(
    () => (scenario && run ? guideProgress(scenario, run) : null),
    [scenario, run],
  );
  const guideAvailable =
    !!scenario?.guidedWalkthrough && run?.mode === "guided" && !!guideStepProgress?.hasGuide;
  const guideActive = guideAvailable && guideOpen;
  const guideInteraction = scenario && guideStepProgress?.step
    ? resolveGuideInteraction(guideStepProgress.step, scenario) : null;
  const guideTargetId =
    guideActive && guideStepProgress?.step ? guideInteraction?.surfaceId ?? null : null;
  const guideTargetLabel =
    guideActive && guideStepProgress?.step ? guideInteraction?.label ?? null : null;
  const guideAnchor = useGuideAnchor(guideTargetId);
  const guideCue =
    scenario && guideActive && guideStepProgress?.step
      ? guideStepCue(guideStepProgress.step, scenario)
      : null;

  const score = useMemo(() => (scenario && run ? scoreRun(scenario, run) : null), [scenario, run]);

  const openKb = useCallback((articleId: string) => {
    setKbOverlayId(articleId);
  }, []);

  const persist = useCallback(
    async (sc: Scenario, state: RunState) => {
      if (state.status === "in_progress") {
        await recordRun({
          scenarioId: sc.id,
          status: "in_progress",
          mode: state.mode,
          hintsUsed: state.hintsUsed.length,
          actionCount: state.actionLog.length,
          startedAt: state.startedAt,
          completedAt: null,
        });
      }
    },
    [recordRun],
  );

  const start = useCallback(
    (m: RunMode) => {
      if (!scenario) return;
      setMode(m);
      setRun(startRun(scenario, m));
      setGuideOpen(m === "guided" && !!scenario.guidedWalkthrough);
      setDock(null);
      setLabContextPanel(null);
      setConversation(startConversation(scenario));
      setLearningLoop(null);
    },
    [scenario],
  );

  const onCustomer = useCallback(
    (question: string) => {
      if (!scenario) return;
      setConversation((prev) =>
        prev ? askCustomer(scenario, prev, question, run ?? undefined) : prev,
      );
    },
    [scenario, run],
  );

  const onDiagnosis = useCallback(
    (text: string) => {
      if (!scenario || !run) return;
      const result = submitDiagnosis(scenario, run, text);
      setConversation((prev) =>
        prev
          ? {
              ...prev,
              messages: [
                ...prev.messages,
                {
                  id: `l-${Date.now()}`,
                  role: "learner" as const,
                  text,
                  at: Date.now(),
                },
                {
                  id: `m-${Date.now() + 1}`,
                  role: "mentor" as const,
                  text: result.reply,
                  at: Date.now() + 1,
                  evaluation: result.grade,
                  actionId: result.actionId,
                },
              ],
            }
          : prev,
      );
      setLearningLoop(
        buildLearningLoop(
          scenario,
          run,
          result,
          result.actionId
            ? (scenario.actions.find((a) => a.id === result.actionId)?.label ?? text)
            : text,
        ),
      );
      if (result.actionId && !run.appliedActions.includes(result.actionId)) {
        if (availableActions(scenario, run).some((a) => a.id === result.actionId)) {
          const next = applyAction(scenario, run, result.actionId);
          setRun(next);
          void persist(scenario, next);
        }
      }
    },
    [scenario, run, persist],
  );

  const onMentorTip = useCallback(() => {
    if (!scenario) return;
    setConversation((prev) => (prev ? mentorHint(scenario, prev) : prev));
  }, [scenario]);

  const onExplainConcept = useCallback(
    (concept: string) => {
      if (!scenario) return;
      setConversation((prev) => (prev ? explainConcept(scenario, prev, concept) : prev));
    },
    [scenario],
  );

  const apply = useCallback(
    (actionId: string) => {
      if (!scenario || !run) return;
      const action = scenario.actions.find((a) => a.id === actionId);
      const next = applyAction(scenario, run, actionId);
      setRun(next);
      if (action) {
        const evaluation = evaluateActionDef(action, run.appliedActions.includes(actionId));
        setLearningLoop(buildLearningLoop(scenario, next, evaluation, action.label));
      }
      void persist(scenario, next);
    },
    [scenario, run, persist],
  );

  const onCommand = useCallback(
    (commandId: string, summary: string, worldPatch?: Record<string, unknown>) => {
      if (!scenario || !run) return;
      const next = recordCommand(scenario, run, commandId, summary, worldPatch);
      setRun(next);
      const appliedActionId = next.appliedActions[next.appliedActions.length - 1];
      const action = appliedActionId
        ? scenario.actions.find((a) => a.id === appliedActionId)
        : undefined;
      if (action && run.appliedActions[run.appliedActions.length - 1] !== action.id) {
        const evaluation = evaluateActionDef(action, false);
        setLearningLoop(buildLearningLoop(scenario, next, evaluation, action.label));
      }
      void persist(scenario, next);
    },
    [scenario, run, persist],
  );

  const hint = useCallback(() => {
    if (!scenario || !run) return;
    const next = requestHint(scenario, run);
    setRun(next);
    void persist(scenario, next);
  }, [scenario, run, persist]);

  const doVerify = useCallback(() => {
    if (!scenario || !run) return;
    const next = verify(scenario, run);
    setRun(next);
    if (next.status === "verified") {
      const completed = {
        scenarioId: scenario.id,
        status: "completed" as const,
        mode: next.mode,
        hintsUsed: next.hintsUsed.length,
        actionCount: next.actionLog.filter((a) => a.kind !== "hint" && a.kind !== "verify").length,
        startedAt: next.startedAt,
        completedAt: next.completedAt ?? Date.now(),
        bestMode: next.mode,
      };
      void recordRun(completed);
    } else {
      void persist(scenario, next);
    }
  }, [scenario, run, recordRun, persist]);

  const reset = useCallback(() => {
    if (!scenario) return;
    setRun(startRun(scenario, mode));
    setConversation(startConversation(scenario));
    setLearningLoop(null);
    setLabContextPanel(null);
  }, [scenario, mode]);

  if (!scenario) {
    return (
      <div className="panel p-6">
        <p className="mb-3">Scenario not found.</p>
        <Link to="/labs" className="lab-link">
          Back to catalog
        </Link>
      </div>
    );
  }

  const showTerminal =
    scenario.environment.shell !== "none" && scenario.environment.showTerminal !== false;
  const showCustomer = hasCustomerConversation(scenario);

  if (!run) {
    const entryMode: RunMode = scenario.modeSupport.includes(mode)
      ? mode
      : (scenario.modeSupport[0] ?? "practice");
    const family = getFamily(scenario.environment.deviceFamily);
    const environmentName =
      family?.label ?? envKindLabel[scenario.environment.kind] ?? "Workstation";

    return (
      <div className="shell">
        <div className="inset">
          <div className="page">
            <Link to="/labs" className="btn-quiet case-back">
              <ArrowLeft size={14} aria-hidden /> Catalog
            </Link>

            {/* Incident briefing — a paper sheet on the bench, not a card
                wall. Contrast bug root cause: this surface is paper and every
                child below sets its own ink. */}
            <article className="case-sheet">
              <header className="case-head">
                <span className="case-id">CASE {scenario.ticket.id}</span>
                <span className="case-meta">
                  {disciplineLabel(scenario.category)} ·{" "}
                  {DIFFICULTY_LABEL[scenario.difficulty] ?? scenario.difficulty} ·{" "}
                  {scenario.estimatedMinutes} min
                </span>
              </header>

              <div className="case-cols">
                {/* Left — the case */}
                <div className="case-col">
                  <h1 className="case-title">{scenario.title}</h1>

                  <blockquote className="case-symptom">
                    <span className="case-symptom-tag">Reported symptom</span>
                    <p>{scenario.ticket.symptomPlainLanguage}</p>
                  </blockquote>

                  <section className="case-section">
                    <div className="sec-head">
                      <h2 className="sec-title">Objectives</h2>
                      <span className="sec-rule" aria-hidden />
                      <span className="sec-note">{scenario.learningObjectives.length}</span>
                    </div>
                    <ul className="case-objectives">
                      {scenario.learningObjectives.map((o) => (
                        <li key={o}>
                          <span className="case-box" aria-hidden>
                            □
                          </span>
                          {o}
                        </li>
                      ))}
                    </ul>
                  </section>
                </div>

                {/* Right — field conditions + entry */}
                <div className="case-col">
                  <dl className="case-fields">
                    <div className="case-field">
                      <dt>Difficulty</dt>
                      <dd>{DIFFICULTY_LABEL[scenario.difficulty] ?? scenario.difficulty}</dd>
                    </div>
                    <div className="case-field">
                      <dt>Environment</dt>
                      <dd>{environmentName}</dd>
                    </div>
                    <div className="case-field">
                      <dt>Time</dt>
                      <dd>{scenario.estimatedMinutes} min</dd>
                    </div>
                    <div className="case-field">
                      <dt>Requestor</dt>
                      <dd>
                        {scenario.ticket.user} ({scenario.ticket.role})
                      </dd>
                    </div>
                    <div className="case-field">
                      <dt>Priority</dt>
                      <dd>{scenario.ticket.priority}</dd>
                    </div>
                    <div className="case-field">
                      <dt>Channel</dt>
                      <dd>{scenario.ticket.channel}</dd>
                    </div>
                  </dl>

                  {scenario.prerequisites.length > 0 && (
                    <p className="case-prereq">
                      <span className="case-prereq-tag">Requires</span>
                      {scenario.prerequisites.map(prereqLabel).join(" · ")}
                    </p>
                  )}

                  <div className="case-modes" role="group" aria-label="Mode">
                    {(Object.keys(modeLabels) as RunMode[]).map((m) => {
                      const supported = scenario.modeSupport.includes(m);
                      const selected = supported && m === entryMode;
                      return (
                        <button
                          key={m}
                          type="button"
                          className={`case-mode${selected ? " is-selected" : ""}`}
                          aria-pressed={selected}
                          disabled={!supported}
                          onClick={() => setMode(m)}
                        >
                          <span className="case-mode-mark" aria-hidden>
                            {selected ? "●" : "○"}
                          </span>
                          <span className="case-mode-body">
                            <span className="case-mode-name">{modeLabels[m]}</span>
                            <span className="case-mode-note">{modeNotes[m]}</span>
                          </span>
                          {!supported && <span className="case-mode-na">not available</span>}
                        </button>
                      );
                    })}
                  </div>

                  <footer className="case-actions">
                    <button
                      type="button"
                      className="btn-primary case-enter"
                      onClick={() => start(entryMode)}
                    >
                      Enter the workstation <ArrowRight size={15} aria-hidden />
                    </button>
                  </footer>
                </div>
              </div>
            </article>
          </div>
        </div>
      </div>
    );
  }

  const verified = run.status === "verified";
  // Never render an empty drawer (e.g. dev toggled off while its drawer is open).
  const drawerOpen =
    dock !== null &&
    (dock !== "dev" || diagnostics.enabled) &&
    (dock !== "terminal" || showTerminal) &&
    (dock !== "customer" || showCustomer);
  const contextMode = drawerOpen ? "tool" : guideActive ? "guide" : labContextPanel ? "inspector" : null;
  const railOpen = contextMode !== null;

  return (
    <>
      <div className="sim-workspace">
        {/* Console header — grouped CASE · MODE · TOOLS · VERIFY */}
        <div className="sim-topbar">
          {/* CASE */}
          <div className="sim-zone sim-zone--case">
            <Link to="/labs" className="btn-ghost sim-btn" aria-label="Exit scenario">
              <ArrowLeft size={14} aria-hidden />
              <span className="hidden sm:inline">Exit</span>
            </Link>
            <span className="sim-sep" aria-hidden />
            <span className="sim-zone-tag" aria-hidden>
              Case
            </span>
            <h1 className="sim-title">{scenario.title}</h1>
            <button
              type="button"
              className={`chip sim-ticket${
                briefOpen ? " chip-on" : " bg-lab-panel text-lab-muted hover:text-lab-text"
              }`}
              onClick={() => setBriefOpen((v) => !v)}
              aria-expanded={briefOpen}
              title="Ticket details and learning objectives"
              data-guide-anchor="ticket-inbox"
            >
              {scenario.ticket.id} · {scenario.ticket.priority}
            </button>
            {verified ? (
              <StatusBadge tone="ok">Verified</StatusBadge>
            ) : (
              <span className="chip bg-lab-panel text-lab-muted hidden sm:inline-flex">
                {modeLabels[run.mode]}
              </span>
            )}
          </div>

          {/* MODE — the current objective, room permitting */}
          <div className="sim-zone sim-zone--mode">
            <span className="sim-zone-tag" aria-hidden>
              Mode
            </span>
            <span className="sim-objective" title={scenario.learningObjectives[0]}>
              <span className="sim-objective-tag">Objective</span>
              <span className="sim-objective-text">{scenario.learningObjectives[0]}</span>
            </span>
          </div>

          {/* GUIDE — a learning flow, not an ordinary tool */}
          {guideAvailable && (
            <div className="sim-zone sim-zone--guide">
              <GuideEntryButton
                scenario={scenario}
                open={guideActive}
                onToggle={() => setGuide(!guideActive)}
              />
            </div>
          )}

          {/* VERIFY — the one primary action */}
          <div className="sim-zone sim-zone--verify">
            <span className="sim-zone-tag" aria-hidden>
              Verify
            </span>
            <button
              type="button"
              className="btn-primary sim-btn"
              onClick={doVerify}
              disabled={!canVerify(scenario, run) && !verified}
              title={
                canVerify(scenario, run) ? "Run verification checks" : "Complete fix steps first"
              }
            >
              <ShieldCheck size={14} aria-hidden /> Verify
            </button>
          </div>
        </div>

        {/* Expandable incident brief — contextual, not a permanent banner */}
        {briefOpen && (
          <div className="sim-brief">
            <IncidentBanner
              ticketId={scenario.ticket.id}
              symptom={scenario.ticket.symptomPlainLanguage}
              user={scenario.ticket.user}
              role={scenario.ticket.role}
              priority={scenario.ticket.priority}
              channel={scenario.ticket.channel}
              additionalContext={scenario.ticket.additionalContext}
              verified={verified}
            />
            <div className="sim-brief-cols">
              <section>
                <div className="sim-label">Objectives</div>
                <ul className="sim-brief-list">
                  {scenario.learningObjectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
              </section>
              {scenario.prerequisites.length > 0 && (
                <section>
                  <div className="sim-label">Prerequisites</div>
                  <p className="text-xs text-lab-muted">
                    {scenario.prerequisites.map(prereqLabel).join(" · ")}
                  </p>
                </section>
              )}
            </div>
          </div>
        )}

        {/* LARGE simulation workspace — the dominant surface. Stage and the
            right utility rail share a grid: the rail reserves space, never
            covers. */}
        <div className={`sim-main${railOpen ? " sim-main--tool" : ""}`}>
          <div
            className={`sim-stage${guideActive ? " is-guide" : ""}`}
            role="region"
            aria-label="Simulation environment"
          >
            <div className="env-fill">
              {/* Path above the environment: hardware/equipment own their real
                signal chain and render it themselves; every other domain gets
                the case path so the composition is identical. */}
              {!hasOwnSignalPath(scenario) && <CasePath scenario={scenario} run={run} />}
              <EnvironmentRenderer
                scenario={scenario}
                run={run}
                conversation={conversation ?? undefined}
                onAction={apply}
                onCustomer={onCustomer}
                onDiagnosis={onDiagnosis}
                onMentorTip={onMentorTip}
                onExplainConcept={onExplainConcept}
                onOpenKb={openKb}
                onContextPanel={setLabContextPanel}
                guideFocus={
                  guideActive && guideStepProgress?.step
                    ? {
                        ...guideStepProgress.step.target,
                        componentId: guideInteraction?.componentId ?? guideStepProgress.step.target.componentId,
                        actionId: guideStepProgress.step.actionId,
                      }
                    : null
                }
              />
            </div>

            <GuideTargetLayer
              targetId={guideTargetId}
              anchor={guideAnchor}
              cue={guideCue}
              label={guideTargetLabel}
            />
</div>

            {/* Contextual action review — inline in stage column, dismissible.
              Identity-keyed: a newly built card always surfaces again. */}
            {learningLoop && dismissedFeedback !== learningLoop && (
              <div className="sim-feedback" role="status" aria-label="Action review">
                <button
                  type="button"
                  className="sim-feedback-close"
                  onClick={() => setDismissedFeedback(learningLoop)}
                  aria-label="Dismiss action review"
                >
                  <X size={13} aria-hidden />
                </button>
                <LearningLoopPanel card={learningLoop} />
              </div>
            )}

            {/* Context panel — one owner at a time in a reserved layout region. */}
          {railOpen && (
            <aside
              className="sim-tool"
              aria-label={
                contextMode === "tool" && dock
                  ? `${TOOL_LABELS[dock]} panel`
                  : contextMode === "guide"
                    ? "Guided troubleshooting panel"
                    : "Component inspector"
              }
            >
              {contextMode === "guide" && (
                <div className="sim-rail-guide">
                  <GuideOverlay
                    scenario={scenario}
                    run={run}
                    onExit={() => setGuideOpen(false)}
                    onOpenKb={openKb}
                    kbOpen={kbOverlayId !== null}
                    anchorMissing={guideAnchor.rect === null}
                    cue={guideCue}
                  />
                </div>
              )}
              {contextMode === "inspector" && labContextPanel && (
                <div
                  className="sim-rail-tool sim-rail-inspector"
                  data-inspector-component={labContextPanel.componentId ?? ""}
                  data-testid="context-inspector"
                >
                  <div className="sim-tool-head">
                    <span className="sim-tool-title">{labContextPanel.title}</span>
                    <button
                      type="button"
                      className="sim-tool-close"
                      onClick={() => {
                        labContextPanel.onClose?.();
                        setLabContextPanel(null);
                      }}
                      aria-label="Close context panel"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </div>
                  <div className="sim-tool-body">{labContextPanel.body}</div>
                </div>
              )}
              {contextMode === "tool" && dock && drawerOpen && (
                <div className="sim-rail-tool">
              <div className="sim-tool-head">
                <span className="sim-tool-title">{TOOL_LABELS[dock]}</span>
                <button
                  type="button"
                  className="sim-tool-close"
                  onClick={() => setDock(null)}
                  aria-label="Close tool panel"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
              <div className="sim-tool-body">
                {dock === "terminal" && showTerminal && (
                  <SimTerminal
                    scenario={scenario}
                    world={run.world}
                    onCommand={onCommand}
                    expanded
                    onToggleExpand={() => setDock(null)}
                    hideTrigger
                  />
                )}

                {dock === "customer" && showCustomer && conversation && (
                  <SupportLab
                    scenario={scenario}
                    run={run}
                    conversation={conversation}
                    onCustomer={onCustomer}
                    onDiagnosis={onDiagnosis}
                    onMentorTip={onMentorTip}
                    onExplainConcept={onExplainConcept}
                    onOpenKb={openKb}
                  />
                )}

                {dock === "evidence" && (
                  <div className="sim-drawer-cols" data-guide-anchor="evidence-board">
                    <section className="min-w-0">
                      <div className="sim-label">Session log</div>
                      <div
                        ref={logRef}
                        className="max-h-48 overflow-y-auto space-y-1 text-xs font-mono"
                      >
                        {run.actionLog.length === 0 && (
                          <div className="text-lab-muted font-sans">Actions will appear here.</div>
                        )}
                        {run.actionLog.map((entry, i) => (
                          <div
                            key={`${entry.actionId}-${i}`}
                            className={
                              entry.outcome === "wrong"
                                ? "text-lab-warn"
                                : entry.outcome === "ok"
                                  ? "text-lab-ok"
                                  : "text-lab-muted"
                            }
                          >
                            [{new Date(entry.at).toLocaleTimeString()}]{" "}
                            <span aria-hidden>
                              {entry.outcome === "ok" ? "✓" : entry.outcome === "wrong" ? "✕" : "●"}
                            </span>{" "}
                            {entry.label}
                            {entry.feedback && (
                              <div className="text-lab-muted font-sans pl-3">{entry.feedback}</div>
                            )}
                          </div>
                        ))}
                      </div>
                    </section>
                    <section className="min-w-0">
                      <div className="sim-label">Latest feedback</div>
                      {run.lastFeedback ? (
                        <div
                          className={`border-l-2 pl-2 py-1 text-sm ${
                            verified
                              ? "border-lab-ok/60 text-lab-ok"
                              : run.lastFeedback.toLowerCase().includes("fail") ||
                                  run.lastFeedback.toLowerCase().includes("wrong") ||
                                  run.lastFeedback.toLowerCase().includes("not ")
                                ? "border-lab-warn/60 text-lab-warn"
                                : "border-lab-border-strong text-lab-text"
                          }`}
                          role="status"
                        >
                          {run.lastFeedback}
                        </div>
                      ) : (
                        <p className="text-xs text-lab-muted">
                          Feedback on your actions will appear here.
                        </p>
                      )}
                      {run.lastVerifyFailures.length > 0 && !verified && (
                        <ul className="mt-2 text-xs text-lab-warn/90 space-y-0.5">
                          {run.lastVerifyFailures.map((f) => (
                            <li key={f}>• {f}</li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                )}

                {dock === "hints" && (
                  <section>
                    <div className="sim-label">Hints</div>
                    <ul className="space-y-2 text-xs max-w-2xl">
                      {scenario.hints.map((h) => {
                        const used = run.hintsUsed.includes(h.level);
                        return (
                          <li key={h.level} className="flex gap-2 items-start">
                            <span
                              className={`chip shrink-0 ${
                                used ? "bg-lab-ok-dim text-lab-ok" : "bg-lab-panel text-lab-muted"
                              }`}
                            >
                              L{h.level}
                            </span>
                            <span className={used ? "text-lab-text" : "text-lab-muted"}>
                              {used ? h.text : h.category}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                    <button type="button" className="btn-ghost text-xs mt-2" onClick={hint}>
                      <Lightbulb size={12} aria-hidden /> Unlock next hint
                    </button>
                  </section>
                )}

                {dock === "learn" && (
                  <div className="sim-drawer-cols">
                    <section className="min-w-0">
                      <div className="sim-label">Knowledge</div>
                      {scenario.knowledgeLinks.length === 0 ? (
                        <p className="text-xs text-lab-muted">
                          No linked articles for this scenario.
                        </p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {scenario.knowledgeLinks.map((id) => {
                            const art = getArticle(id);
                            return (
                              <button
                                key={id}
                                type="button"
                                className="btn-ghost text-xs"
                                onClick={() => openKb(id)}
                              >
                                {art?.title ?? id}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </section>
                    <section className="min-w-0">
                      <div className="sim-label">Concepts revealed</div>
                      {run.conceptsRevealed.length === 0 ? (
                        <p className="text-xs text-lab-muted">
                          Concepts you uncover during actions will collect here.
                        </p>
                      ) : (
                        <ul className="space-y-1.5 text-xs text-lab-muted">
                          {run.conceptsRevealed.map((c) => (
                            <li key={c} className="border-l-2 border-lab-border-strong pl-2">
                              {c}
                            </li>
                          ))}
                        </ul>
                      )}
                    </section>
                  </div>
                )}

                {dock === "journal" && (
                  <div className="sim-drawer-cols">
                    <section className="min-w-0">
                      <div className="sim-label">Run</div>
                      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs max-w-sm">
                        <dt className="text-lab-muted">Mode</dt>
                        <dd>{modeLabels[run.mode]}</dd>
                        <dt className="text-lab-muted">Status</dt>
                        <dd className="capitalize">{run.status.replace(/_/g, " ")}</dd>
                        <dt className="text-lab-muted">Actions</dt>
                        <dd className="tabular-nums">{run.appliedActions.length}</dd>
                        <dt className="text-lab-muted">Hints used</dt>
                        <dd className="tabular-nums">
                          {run.hintsUsed.length}/{scenario.hints.length}
                        </dd>
                        <dt className="text-lab-muted">Commands</dt>
                        <dd className="tabular-nums">{run.ranCommands.length}</dd>
                      </dl>
                    </section>
                    <section className="min-w-0">
                      <div className="sim-label">Score</div>
                      <Disclosure summary="Score" defaultOpen={false}>
                        {score && (
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between">
                              <span className="text-lab-muted">Total</span>
                              <span className="font-mono">
                                {score.total}/{score.max}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-lab-muted">Grade</span>
                              <span>{score.grade}</span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-lab-muted">Hints / wrong</span>
                              <span>
                                −{score.hintPenalty} / −{score.wrongPenalty}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-lab-muted">Evidence</span>
                              <span>+{score.evidencePoints}</span>
                            </div>
                          </div>
                        )}
                      </Disclosure>
                    </section>
                  </div>
                )}

                {dock === "dev" && diagnostics.enabled && (
                  <section>
                    <div className="sim-label">Diagnostics</div>
                    <DevDiagnostics
                      enabled={diagnostics.enabled}
                      meta={{
                        scenarioId: scenario.id,
                        mode: run.mode,
                        status: run.status,
                        appliedActions: run.appliedActions.length,
                        ranCommands: run.ranCommands.length,
                      }}
                    >
                      <WorldInspector world={run.world} />
                    </DevDiagnostics>
                  </section>
                )}
              </div>
                </div>
              )}
            </aside>
          )}
        </div>

        <div className="sim-dock">
          <div className="sim-dock-bar" role="toolbar" aria-label="Lab tools">
            <span className="dock-tag">Tools</span>
            {showTerminal && (
              <button
                type="button"
                className={`dock-btn${dock === "terminal" ? " is-on" : ""}`}
                onClick={() => toggleDock("terminal")}
                aria-pressed={dock === "terminal"}
                data-guide-anchor="terminal"
              >
                <TerminalIcon size={14} aria-hidden /> Terminal
              </button>
            )}
            {showCustomer && (
              <button
                type="button"
                className={`dock-btn${dock === "customer" ? " is-on" : ""}`}
                onClick={() => toggleDock("customer")}
                aria-pressed={dock === "customer"}
                title="Talk to the customer"
                data-guide-anchor="customer"
              >
                <MessageSquare size={14} aria-hidden /> Customer
                {conversation && conversation.messages.length > 0 && (
                  <span className="dock-badge">{conversation.messages.length}</span>
                )}
              </button>
            )}
            <button
              type="button"
              className={`dock-btn${dock === "evidence" ? " is-on" : ""}`}
              onClick={() => toggleDock("evidence")}
              aria-pressed={dock === "evidence"}
              data-guide-anchor="evidence"
            >
              <ClipboardList size={14} aria-hidden /> Evidence
            </button>
            <button
              type="button"
              className={`dock-btn${dock === "hints" ? " is-on" : ""}`}
              onClick={() => toggleDock("hints")}
              aria-pressed={dock === "hints"}
              data-guide-anchor="hints"
            >
              <Lightbulb size={14} aria-hidden /> Hints
              <span className="dock-badge">
                {run.hintsUsed.length}/{scenario.hints.length}
              </span>
            </button>
            <button
              type="button"
              className={`dock-btn${dock === "learn" ? " is-on" : ""}`}
              onClick={() => toggleDock("learn")}
              aria-pressed={dock === "learn"}
              data-guide-anchor="learn"
            >
              <BookOpen size={14} aria-hidden /> Learn
              {run.conceptsRevealed.length > 0 && (
                <span className="dock-badge">{run.conceptsRevealed.length}</span>
              )}
            </button>
            <button
              type="button"
              className={`dock-btn${dock === "journal" ? " is-on" : ""}`}
              onClick={() => toggleDock("journal")}
              aria-pressed={dock === "journal"}
              data-guide-anchor="journal"
            >
              <FileText size={14} aria-hidden /> Journal
            </button>
            <span className="dock-spacer" aria-hidden />
            <DevDiagnosticsToggle enabled={diagnostics.enabled} onToggle={diagnostics.toggle} />
            {diagnostics.enabled && (
              <button
                type="button"
                className={`dock-btn${dock === "dev" ? " is-on" : ""}`}
                onClick={() => toggleDock("dev")}
                aria-pressed={dock === "dev"}
                data-guide-anchor="dev"
              >
                <Bug size={14} aria-hidden /> Dev
              </button>
            )}
            <button
              type="button"
              className="dock-btn sim-danger"
              onClick={reset}
              aria-label="Restart scenario"
              title="Restart scenario"
            >
              <RotateCcw size={14} aria-hidden /> Restart
            </button>
          </div>
        </div>
      </div>

      {verified && (
        <div className="shell">
          <div className="inset">
            <div className="page">
              <section className="deb-sheet" aria-labelledby="deb-title">
                <header className="deb-head">
                  <h2 className="deb-title" id="deb-title">
                    Debrief
                  </h2>
                  <span className="deb-verdict">✓ Verified</span>
                  <span className="deb-meta">
                    CASE {scenario.ticket.id}
                    {score ? ` · ${score.total}/${score.max}` : ""} · {run.appliedActions.length}{" "}
                    actions
                  </span>
                </header>

                <div className="deb-grid">
                  <div className="deb-col">
                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">01</span>
                        <h3 className="deb-sec-t">Root cause</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <p className="deb-p">{scenario.debrief.rootCause}</p>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">02</span>
                        <h3 className="deb-sec-t">Why the fix worked</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <p className="deb-p deb-p--quiet">{scenario.debrief.whyItWorked}</p>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">03</span>
                        <h3 className="deb-sec-t">Method map</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list">
                        {scenario.debrief.methodologyMap.map((step) => (
                          <li key={step.step}>
                            <span>
                              <span className="deb-sec-t">{step.step}</span>
                              <span className="deb-p deb-p--quiet"> — {step.whatLearnerDid}</span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    </section>
                  </div>

                  <div className="deb-col">
                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">04</span>
                        <h3 className="deb-sec-t">Evidence trail</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list deb-list--log">
                        {run.actionLog
                          .filter((e) => e.kind !== "hint")
                          .slice(-8)
                          .map((e, i) => (
                            <li key={`${e.actionId}-${i}`}>
                              [{e.kind}] {e.label}
                            </li>
                          ))}
                        {run.ranCommands.slice(0, 6).map((c) => (
                          <li key={c}>$ {c}</li>
                        ))}
                        {run.actionLog.filter((e) => e.kind !== "hint").length === 0 &&
                          run.ranCommands.length === 0 && <li>No actions logged this run.</li>}
                      </ul>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">05</span>
                        <h3 className="deb-sec-t">What went well</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list">
                        {run.actionLog
                          .filter((e) => e.outcome === "ok" && e.kind !== "verify")
                          .slice(0, 4)
                          .map((e, i) => (
                            <li key={`${e.actionId}-ok-${i}`}>
                              <span className="deb-list-mark is-ok">✓</span>
                              <span>{e.label}</span>
                            </li>
                          ))}
                        {run.hintsUsed.length === 0 && (
                          <li>
                            <span className="deb-list-mark is-ok">✓</span>
                            <span>Completed without hints</span>
                          </li>
                        )}
                      </ul>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">06</span>
                        <h3 className="deb-sec-t">What to improve</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list">
                        {run.actionLog
                          .filter((e) => e.outcome === "wrong")
                          .map((e, i) => (
                            <li key={`${e.actionId}-bad-${i}`}>
                              <span className="deb-list-mark is-warn">▲</span>
                              <span>{e.label}</span>
                            </li>
                          ))}
                        {run.hintsUsed.length > 0 && (
                          <li>
                            <span className="deb-list-mark is-warn">▲</span>
                            <span>
                              Used {run.hintsUsed.length} hint
                              {run.hintsUsed.length === 1 ? "" : "s"} — try evidence-first next run
                            </span>
                          </li>
                        )}
                        {run.actionLog.every((e) => e.outcome !== "wrong") &&
                          run.hintsUsed.length === 0 && (
                            <li>
                              <span className="deb-list-mark">□</span>
                              <span>Clean run — push for challenge mode next time</span>
                            </li>
                          )}
                      </ul>
                    </section>
                  </div>

                  <div className="deb-col">
                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">07</span>
                        <h3 className="deb-sec-t">Score breakdown</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      {score && (
                        <div className="deb-score">
                          <div className="deb-score-top">
                            <span className="deb-score-value">{score.total}</span>
                            <span className="deb-score-max">/{score.max}</span>
                            <span className="deb-score-grade">{score.grade}</span>
                          </div>
                          <dl className="deb-score-rows">
                            <div>
                              <dt>Diagnostic</dt>
                              <dd>+{score.diagnosticPoints}</dd>
                            </div>
                            <div>
                              <dt>Fix</dt>
                              <dd>+{score.fixPoints}</dd>
                            </div>
                            <div>
                              <dt>Evidence</dt>
                              <dd>+{score.evidencePoints}</dd>
                            </div>
                            <div>
                              <dt>Hints</dt>
                              <dd>−{score.hintPenalty}</dd>
                            </div>
                            <div>
                              <dt>Wrong</dt>
                              <dd>−{score.wrongPenalty}</dd>
                            </div>
                          </dl>
                        </div>
                      )}
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">08</span>
                        <h3 className="deb-sec-t">Concepts learned</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list">
                        {run.conceptsRevealed.slice(0, 5).map((c) => (
                          <li key={c}>
                            <span className="deb-list-mark">●</span>
                            <span>{c}</span>
                          </li>
                        ))}
                        {run.conceptsRevealed.length === 0 && (
                          <li>
                            <span className="deb-list-mark">□</span>
                            <span className="deb-p deb-p--quiet">
                              No concept cards revealed this run.
                            </span>
                          </li>
                        )}
                      </ul>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">09</span>
                        <h3 className="deb-sec-t">Knowledge review</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <div className="deb-links">
                        {scenario.knowledgeLinks.map((id) => (
                          <button
                            key={id}
                            type="button"
                            className="chip"
                            onClick={() => openKb(id)}
                          >
                            {getArticle(id)?.title ?? id}
                          </button>
                        ))}
                      </div>
                    </section>

                    <section className="deb-sec">
                      <div className="deb-sec-head">
                        <span className="deb-sec-n">10</span>
                        <h3 className="deb-sec-t">Follow-ups</h3>
                        <span className="deb-rule" aria-hidden />
                      </div>
                      <ul className="deb-list">
                        {scenario.debrief.followUps.map((f) => (
                          <li key={f}>
                            <span className="deb-list-mark">□</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                      <div className="deb-actions">
                        <Link to="/labs" className="btn-primary">
                          Next lab
                        </Link>
                        <Link to="/progress" className="btn-secondary">
                          View progress
                        </Link>
                      </div>
                    </section>
                  </div>
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      <KbOverlay articleId={kbOverlayId} onClose={() => setKbOverlayId(null)} />
    </>
  );
}
