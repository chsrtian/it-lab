import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { getCurriculum, getScenarios } from "@/content";
import { kbArticles } from "@/content/kb/articles";
import {
  DIFFICULTIES,
  DIFFICULTY_LABEL,
  DOMAINS,
  ENVIRONMENT_LABEL,
  disciplineLabel,
  trackTitle,
  type Category,
  type DifficultyLabel,
} from "@/content/domainMeta";
import type { Scenario } from "@/content/schema";
import { EMPTY_IDS, useProgressStore } from "@/store/progress";
import { CoverageTally, SecHead, tallyStates } from "@/components/ui";
import { DisciplineIcon } from "@/components/ui/domainVisuals";

export function CasePreviewVisual({ scenario }: { scenario: Scenario }) {
  const category = scenario.category;
  const primaryTool = scenario.environment.availableTools[0] ?? scenario.environment.kind;
  const componentA = scenario.environment.components[0] ?? "evidence";
  const componentB = scenario.environment.components[1] ?? "signal";

  return (
    <Link
      to={`/lab/${scenario.id}`}
      className={`case-preview case-preview--${category}`}
      data-testid="case-preview"
      data-case-preview={category}
      aria-label={`Open ${scenario.title}`}
    >
      <span className="case-preview__head">
        <span className="case-preview__kicker">Case preview</span>
        <span className="case-preview__domain">{disciplineLabel(category)}</span>
      </span>
      <span className="case-preview__stage" aria-hidden="true">
        {category === "hardware" && (
          <>
            <span className="cp-chassis" />
            <span className="cp-board" />
            <span className="cp-psu" />
            <span className="cp-front-panel" />
            <span className="cp-path cp-path-a" />
            <span className="cp-probe" />
          </>
        )}
        {category === "networking" && (
          <>
            <span className="cp-client" />
            <span className="cp-switch" />
            <span className="cp-router" />
            <span className="cp-service" />
            <span className="cp-path cp-path-a" />
            <span className="cp-path cp-path-b" />
            <span className="cp-packet" />
          </>
        )}
        {(category === "linux" || category === "automation") && (
          <>
            <span className="cp-terminal">
              <span>{category === "automation" ? "$ runbook verify" : "$ systemctl status"}</span>
              <span>{category === "automation" ? "job: evidence" : "journal: evidence"}</span>
              <span>{category === "automation" ? "step: waiting" : "unit: waiting"}</span>
            </span>
            <span className="cp-filetree" />
            <span className="cp-process" />
          </>
        )}
        {category === "windows" && (
          <>
            <span className="cp-window cp-window-main" />
            <span className="cp-window cp-window-log" />
            <span className="cp-event-row" />
            <span className="cp-event-row cp-event-row-alt" />
            <span className="cp-service-node" />
          </>
        )}
        {category === "database" && (
          <>
            <span className="cp-api" />
            <span className="cp-pool" />
            <span className="cp-db" />
            <span className="cp-path cp-path-a" />
            <span className="cp-path cp-path-b" />
            <span className="cp-query" />
          </>
        )}
        {category === "security" && (
          <>
            <span className="cp-endpoint" />
            <span className="cp-alert" />
            <span className="cp-timeline" />
            <span className="cp-timeline-dot" />
            <span className="cp-timeline-dot cp-timeline-dot-alt" />
          </>
        )}
        {category === "support" && (
          <>
            <span className="cp-customer" />
            <span className="cp-agent" />
            <span className="cp-chat cp-chat-a" />
            <span className="cp-chat cp-chat-b" />
            <span className="cp-ticket" />
          </>
        )}
        {category === "sysadmin" && (
          <>
            <span className="cp-server" />
            <span className="cp-service-stack" />
            <span className="cp-dependency" />
            <span className="cp-backup" />
            <span className="cp-path cp-path-a" />
          </>
        )}
        {category === "cloud" && (
          <>
            <span className="cp-cloud" />
            <span className="cp-gateway" />
            <span className="cp-bucket" />
            <span className="cp-path cp-path-a" />
            <span className="cp-packet" />
          </>
        )}
      </span>
      <span className="case-preview__caption">
        <span>{ENVIRONMENT_LABEL[scenario.environment.kind] ?? scenario.environment.kind}</span>
        <span>{primaryTool}</span>
        <span>{componentA}</span>
        <span>{componentB}</span>
      </span>
    </Link>
  );
}

export function HomePage() {
  const scenarios = useMemo(() => getScenarios(), []);
  const tracks = useMemo(() => getCurriculum(), []);
  const completed = useProgressStore((s) => s.profile?.completedScenarioIds ?? EMPTY_IDS);
  const xp = useProgressStore((s) => s.profile?.xp ?? 0);
  const runs = useProgressStore((s) => s.scenarios);

  const byId = useMemo(() => new Map(scenarios.map((s) => [s.id, s])), [scenarios]);
  const done = useMemo(() => new Set(completed), [completed]);

  const resume = useMemo(() => {
    const entries = Object.values(runs)
      .filter((entry) => byId.has(entry.scenarioId))
      .sort((a, b) => (b.completedAt ?? b.startedAt) - (a.completedAt ?? a.startedAt));
    if (entries.length === 0) return undefined;
    const chosen = entries.find((e) => e.status === "in_progress") ?? entries[0];
    return { scenario: byId.get(chosen.scenarioId)!, entry: chosen };
  }, [runs, byId]);

  const firstAssignment = useMemo(
    () =>
      scenarios.find((s) => s.difficulty === "foundational" && s.prerequisites.length === 0) ??
      scenarios[0],
    [scenarios],
  );

  const nextAssignment = useMemo(() => {
    if (completed.length === 0) return firstAssignment;
    const tier = (s: { difficulty: string }) =>
      DIFFICULTIES.indexOf(s.difficulty as DifficultyLabel);
    return (
      scenarios
        .filter((s) => !completed.includes(s.id))
        .sort((a, b) => tier(a) - tier(b) || scenarios.indexOf(a) - scenarios.indexOf(b))[0] ??
      firstAssignment
    );
  }, [completed, firstAssignment, scenarios]);

  const assignment = resume?.scenario ?? nextAssignment;
  const inProgress = resume?.entry.status === "in_progress";
  const verified = done.has(assignment.id);

  const activeIds = useMemo(
    () =>
      new Set(
        Object.values(runs)
          .filter((e) => e.status === "in_progress")
          .map((e) => e.scenarioId),
      ),
    [runs],
  );

  /** Disciplines, heaviest first — the heaviest one gets the featured bay. */
  const domains = useMemo(() => {
    const counts = new Map<Category, number>();
    const verifiedCount = new Map<Category, number>();
    for (const s of scenarios) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
      if (done.has(s.id)) verifiedCount.set(s.category, (verifiedCount.get(s.category) ?? 0) + 1);
    }
    return DOMAINS.filter((d) => (counts.get(d.id) ?? 0) > 0)
      .map((d) => {
        const items = scenarios.filter((s) => s.category === d.id);
        return {
          ...d,
          items,
          total: counts.get(d.id) ?? 0,
          verified: verifiedCount.get(d.id) ?? 0,
          title: trackTitle(d.trackId, tracks),
          states: tallyStates(
            items,
            done,
            activeIds,
            items.filter((s) => !done.has(s.id) && !s.prerequisites.every((p) => done.has(p))).map((s) => s.id),
          ),
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [scenarios, done, activeIds, tracks]);

  const recent = useMemo(
    () =>
      Object.values(runs)
        .filter((entry) => byId.has(entry.scenarioId))
        .sort((a, b) => (b.completedAt ?? b.startedAt) - (a.completedAt ?? a.startedAt))
        .slice(0, 5)
        .map((entry) => ({ entry, scenario: byId.get(entry.scenarioId)! })),
    [runs, byId],
  );

  const openCount = useMemo(
    () => scenarios.filter((s) => !done.has(s.id)).length,
    [scenarios, done],
  );
  const inProgressCount = useMemo(
    () => Object.values(runs).filter((e) => e.status === "in_progress").length,
    [runs],
  );
  const lastSession = recent[0]?.entry;

  const diffLabel = DIFFICULTY_LABEL[assignment.difficulty] ?? assignment.difficulty;
  const envLabel =
    ENVIRONMENT_LABEL[assignment.environment.kind] ?? assignment.environment.kind;
  const components = assignment.environment.components;
  const tools = assignment.environment.availableTools;
  const modes = assignment.modeSupport.length;

  const stateMark = verified ? "verified" : inProgress ? "active" : "open";
  const stateWord = verified ? "Verified" : inProgress ? "In progress" : "Open";

  return (
    <div className="page">
      <header className="inset page-head">
        <h1 className="t-display">Workbench</h1>
        <p className="page-note">
          {scenarios.length} incidents · {domains.length} disciplines ·{" "}
          {kbArticles.length} reference articles
        </p>
      </header>

      {/* The active case — a paper work order wearing a graphite job strip,
          beside the instrument well holding this case's equipment. */}
      <section className="inset case-band" aria-labelledby="case-heading">
        <div className="case-sheet">
          <div className="case-strip">
            <span className="case-strip-id">{assignment.ticket.id}</span>
            <span className={`state-mark state-mark--${stateMark}`}>{stateWord}</span>
            <span className="case-strip-meta">
              <span className="t-mono">{assignment.estimatedMinutes} min</span>
              <span aria-hidden>·</span>
              <span>{diffLabel}</span>
            </span>
          </div>

          <div className="case-body">
            <p className="case-disc">
              <DisciplineIcon category={assignment.category} size={15} />
              {disciplineLabel(assignment.category)}
            </p>
            <h2 id="case-heading" className="t-case">
              {assignment.title}
            </h2>
            <p className="t-lead case-symptom">
              “{assignment.ticket.symptomPlainLanguage}”
            </p>

            <ul className="obj-list">
              {assignment.learningObjectives.map((obj, i) => (
                <li key={obj}>
                  <span className="obj-num">{String(i + 1).padStart(2, "0")}</span>
                  <span>{obj}</span>
                </li>
              ))}
            </ul>

            <div className="case-actions">
              <Link to={`/lab/${assignment.id}`} className="btn-primary">
                {inProgress ? "Resume diagnosis" : "Enter lab"}
                <ArrowRight size={16} aria-hidden />
              </Link>
              <Link to="/labs" className="btn-secondary">
                All labs
              </Link>
              <span className="case-meta">
                <span className="t-mono">{assignment.learningObjectives.length}</span>{" "}
                objectives · <span className="t-mono">{modes}</span> modes
                {inProgress && resume?.entry ? (
                  <>
                    {" · "}
                    <span className="t-mono">{resume.entry.actionCount}</span> steps taken
                  </>
                ) : null}
              </span>
            </div>
          </div>
        </div>

        <div className="well">
          <div className="well-stage">
            <CasePreviewVisual scenario={assignment} />
          </div>
          <div className="well-cap">
            <span className="well-cap-title">{envLabel}</span>
            <span className="well-cap-sub">
              <span className="t-mono">{components.length}</span> components
              {tools.length > 0 ? (
                <>
                  {" · tools: "}
                  {tools.join(", ")}
                </>
              ) : null}
            </span>
            {components.length > 0 ? (
              <ul className="well-parts">
                {components.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            ) : null}
          </div>
        </div>
      </section>

      {/* Discipline station wall — unequal bays, hairline divisions, real
          coverage tallies. The heaviest discipline takes the full width. */}
      <section className="band band--paper" aria-labelledby="disciplines-title">
        <div className="inset">
          <SecHead
            headingId="disciplines-title"
            title="Disciplines on the bench"
            note={`${domains.length} disciplines`}
            action={
              <Link className="sec-link" to="/labs">
                All labs
              </Link>
            }
          />
          <div className="station-wall">
            {domains.map((d, i) => {
              const label = `${d.verified} of ${d.total} ${d.title} incidents verified`;
              if (i === 0) {
                return (
                  <Link
                    key={d.id}
                    to={`/labs?category=${d.id}`}
                    className="station station--featured"
                  >
                    <span className="station-lead">
                      <d.icon size={18} />
                      <span className="station-name">{d.title}</span>
                      <span className="station-tag">{d.tagline}</span>
                    </span>
                    <span className="station-fig">
                      <CoverageTally states={d.states} label={label} />
                      <span className="t-mono station-count">
                        {d.verified}/{d.total}
                      </span>
                    </span>
                  </Link>
                );
              }
              return (
                <Link key={d.id} to={`/labs?category=${d.id}`} className="station">
                  <span className="station-top">
                    <d.icon size={16} />
                    <span className="station-name">{d.title}</span>
                    <span className="t-mono station-count">
                      {d.verified}/{d.total}
                    </span>
                  </span>
                  <span className="station-tag">{d.tagline}</span>
                  <CoverageTally states={d.states} label={label} />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bench log — the dark readout shelf, the same material as the sim. */}
      <section className="band band--steel" aria-labelledby="benchlog-title">
        <div className="inset">
          <SecHead
            headingId="benchlog-title"
            title="Bench log"
            action={
              <Link className="sec-link" to="/progress">
                Full record
              </Link>
            }
          />
          <div className="grid gap-x-10 gap-y-7 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
            {recent.length === 0 ? (
              <div className="empty-state">
                <span className="t-title">No sessions yet</span>
                <span>Work a lab and its evidence trail lands here.</span>
                <Link to="/labs" className="btn-primary mt-1">
                  Browse the catalog
                </Link>
              </div>
            ) : (
              <div className="ruled-list">
                {recent.map(({ entry, scenario }) => {
                  const isDone = done.has(scenario.id);
                  return (
                    <Link key={scenario.id} to={`/lab/${scenario.id}`} className="ruled-row">
                      <span
                        className={`state-mark shrink-0 ${isDone ? "state-mark--verified" : "state-mark--active"}`}
                      >
                        {isDone ? "Verified" : "In progress"}
                      </span>
                      <span className="flex flex-col min-w-0 flex-1">
                        <span className="truncate">{scenario.title}</span>
                        <span className="row-sub t-mono">
                          {scenario.ticket.id} · {entry.actionCount} actions
                        </span>
                      </span>
                      <span className="row-sub shrink-0">{disciplineLabel(scenario.category)}</span>
                    </Link>
                  );
                })}
              </div>
            )}

            <div className="readout">
              <div className="readout-row">
                <span className="readout-key">Verified incidents</span>
                <span className="readout-val">
                  {completed.length}/{scenarios.length}
                </span>
              </div>
              <div className="readout-row">
                <span className="readout-key">In progress</span>
                <span className="readout-val">{inProgressCount}</span>
              </div>
              <div className="readout-row">
                <span className="readout-key">Still open</span>
                <span className="readout-val">{openCount}</span>
              </div>
              <div className="readout-row">
                <span className="readout-key">Experience</span>
                <span className="readout-val">{xp} XP</span>
              </div>
              <div className="readout-row">
                <span className="readout-key">Last session</span>
                <span className="readout-val">
                  {lastSession
                    ? new Date(lastSession.completedAt ?? lastSession.startedAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric" },
                      )
                    : "—"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
