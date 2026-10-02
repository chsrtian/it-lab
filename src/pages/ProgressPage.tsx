import { useMemo } from "react";
import { Link } from "react-router-dom";
import { getCurriculum, getScenarios } from "@/content";
import { DOMAINS, disciplineLabel, trackTitle } from "@/content/domainMeta";
import { EMPTY_IDS, useProgressStore } from "@/store/progress";
import { SecHead } from "@/components/ui";
import { DisciplineIcon } from "@/components/ui/domainVisuals";

/**
 * Progress — a training record. One graphite summary slab with real readouts
 * (no bar, no gauge), per-discipline coverage as a ruled roster, then the
 * chronological session log. Zero-progress is designed, not blank.
 */
export function ProgressPage() {
  const scenarios = useMemo(() => getScenarios(), []);
  const tracks = useMemo(() => getCurriculum(), []);
  const profile = useProgressStore((s) => s.profile);
  const progressMap = useProgressStore((s) => s.scenarios);
  const hydrated = useProgressStore((s) => s.hydrated);

  const completed = profile?.completedScenarioIds ?? EMPTY_IDS;
  const inProgress = Object.values(progressMap).filter((p) => p.status === "in_progress");
  const byId = new Map(scenarios.map((s) => [s.id, s]));
  const history = Object.values(progressMap)
    .filter((p) => byId.has(p.scenarioId))
    .sort((a, b) => (b.completedAt ?? b.startedAt) - (a.completedAt ?? a.startedAt));

  if (!hydrated) {
    return (
      <div className="page">
        <div className="inset">
          <div className="empty-state">Loading progress…</div>
        </div>
      </div>
    );
  }

  const xp = profile?.xp ?? 0;
  const hasData = history.length > 0 || completed.length > 0;
  const last = history[0];

  const coverage = DOMAINS.filter((d) => scenarios.some((s) => s.category === d.id)).map((d) => {
    const items = scenarios.filter((s) => s.category === d.id);
    const hit = items.filter((s) => completed.includes(s.id)).length;
    const skills = [...new Set(items.flatMap((s) => s.skills))];
    return { ...d, total: items.length, hit, skills, title: trackTitle(d.trackId, tracks) };
  });

  return (
    <div className="page">
      <header className="inset page-head">
        <h1 className="t-display">Training record</h1>
        <p className="page-note">
          Stored on this device only — nothing is uploaded
        </p>
      </header>

      <div className="inset flex flex-col gap-7">
        <section className="slab" aria-label="Qualification summary">
          <div className="flex flex-col gap-1.5">
            <div className="slab-figure">
              <span className="slab-num">{completed.length}</span>
              <span className="slab-unit">/ {scenarios.length}</span>
            </div>
            <span className="readout-key">Verified incidents</span>
          </div>

          <div className="readout slab-readouts">
            <div className="readout-row">
              <span className="readout-key">In progress</span>
              <span className="readout-val">{inProgress.length}</span>
            </div>
            <div className="readout-row">
              <span className="readout-key">Still open</span>
              <span className="readout-val">{scenarios.length - completed.length}</span>
            </div>
            <div className="readout-row">
              <span className="readout-key">Experience</span>
              <span className="readout-val">{xp} XP</span>
            </div>
            <div className="readout-row">
              <span className="readout-key">Recorded sessions</span>
              <span className="readout-val">{history.length}</span>
            </div>
            <div className="readout-row">
              <span className="readout-key">Last session</span>
              <span className="readout-val">
                {last
                  ? new Date(last.completedAt ?? last.startedAt).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : "—"}
              </span>
            </div>
          </div>
        </section>

        <section aria-labelledby="coverage-title" className="flex flex-col">
          <SecHead
            headingId="coverage-title"
            title="Coverage by discipline"
            note={`${coverage.length} disciplines`}
            action={
              <Link className="sec-link" to="/labs">
                Open the register
              </Link>
            }
          />
          <div className="ruled-list">
            {coverage.map((d) => (
              <div key={d.id} className="ruled-row">
                <DisciplineIcon
                  category={d.id}
                  size={15}
                  className="shrink-0 text-faint"
                />
                <Link
                  to={`/labs?category=${d.id}`}
                  className="text-sm font-medium text-ink hover:text-accent min-w-0 flex-1 sm:flex-none sm:w-44"
                >
                  {d.title}
                </Link>
                <span className="t-mono text-sm text-ink tabular-nums shrink-0">
                  {d.hit}/{d.total}
                </span>
                <span className="text-xs text-faint truncate min-w-0 flex-1 sm:ml-4">
                  {d.skills.slice(0, 3).join(" · ")}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section aria-labelledby="history-title" className="flex flex-col">
          <SecHead
            headingId="history-title"
            title="Session history"
            note={`${history.length} recorded`}
          />
          {!hasData ? (
            <div className="empty-state">
              <span className="t-title">No sessions recorded yet</span>
              <span>
                Work a lab from the register and it lands here with its evidence trail.
              </span>
              <Link to="/labs" className="btn-primary mt-1">
                Browse the register
              </Link>
            </div>
          ) : (
            <div className="ruled-list">
              {history.map((entry) => {
                const scenario = byId.get(entry.scenarioId)!;
                const isDone = completed.includes(scenario.id);
                const when = new Date(entry.completedAt ?? entry.startedAt);
                return (
                  <Link key={scenario.id} to={`/lab/${scenario.id}`} className="ruled-row">
                    <span className="t-mono text-faint tabular-nums w-32 shrink-0">
                      {when.toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      {" · "}
                      {when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                    </span>
                    <span
                      className={`state-mark shrink-0 ${isDone ? "state-mark--verified" : "state-mark--active"}`}
                    >
                      {isDone ? "Verified" : "In progress"}
                    </span>
                    <span className="text-sm text-ink truncate min-w-0 flex-1">
                      {scenario.title}
                    </span>
                    <span className="row-sub shrink-0">{disciplineLabel(scenario.category)}</span>
                    <span className="t-mono text-faint shrink-0">
                      {entry.mode} · {entry.actionCount} actions
                      {entry.hintsUsed ? ` · ${entry.hintsUsed} hints` : ""}
                    </span>
                  </Link>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
