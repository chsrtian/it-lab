import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { getScenarios } from "@/content";
import {
  DIFFICULTY_LABEL,
  DOMAINS,
  ENVIRONMENT_LABEL,
  disciplineLabel,
} from "@/content/domainMeta";
import { EMPTY_IDS, useProgressStore } from "@/store/progress";
import { DisciplineIcon } from "@/components/ui/domainVisuals";
import type { z } from "zod";
import type { difficultySchema } from "@/content/schema";

type Difficulty = z.infer<typeof difficultySchema>;

const difficulties: Difficulty[] = ["foundational", "beginner", "intermediate", "advanced"];

const statuses = [
  { id: "all", label: "Any status" },
  { id: "open", label: "Open" },
  { id: "progress", label: "In progress" },
  { id: "verified", label: "Verified" },
  { id: "locked", label: "Locked" },
] as const;

/**
 * Labs — a compact register: discipline rail on the left (sticky navigation
 * with progress totals), one incident ledger on the right. Rows are hairline
 * records, never cards; locked rows stay fully readable and only name the
 * prerequisite they wait on.
 */
export function CatalogPage() {
  const scenarios = useMemo(() => getScenarios(), []);
  const completed = useProgressStore((s) => s.profile?.completedScenarioIds ?? EMPTY_IDS);
  const runs = useProgressStore((s) => s.scenarios);
  const [params, setParams] = useSearchParams();

  const category = params.get("category") ?? "all";
  const difficulty = params.get("difficulty") ?? "all";
  const status = params.get("status") ?? "all";
  const query = params.get("q") ?? "";

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value === "" || value === "all") next.delete(key);
    else next.set(key, value);
    setParams(next, { replace: true });
  };

  const doneSet = useMemo(() => new Set(completed), [completed]);
  const activeSet = useMemo(
    () =>
      new Set(
        Object.values(runs)
          .filter((e) => e.status === "in_progress")
          .map((e) => e.scenarioId),
      ),
    [runs],
  );

  const available = useMemo(
    () => DOMAINS.filter((d) => scenarios.some((s) => s.category === d.id)),
    [scenarios],
  );

  /** Scenarios whose prerequisites are still unmet (advisory locks). */
  const lockedSet = useMemo(() => {
    const set = new Set<string>();
    for (const s of scenarios) {
      if (!doneSet.has(s.id) && !s.prerequisites.every((p) => doneSet.has(p))) set.add(s.id);
    }
    return set;
  }, [scenarios, doneSet]);

  /** Friendly prerequisite: case id + title, never the scenario slug. */
  const prereqLabel = (id: string) => {
    const s = scenarios.find((x) => x.id === id);
    return s ? `${s.ticket.id} · ${s.title}` : id;
  };

  const filtered = useMemo(
    () =>
      scenarios.filter((s) => {
        if (category !== "all" && s.category !== category) return false;
        if (difficulty !== "all" && s.difficulty !== difficulty) return false;
        if (status !== "all") {
          const isDone = doneSet.has(s.id);
          const inProgress = !isDone && runs[s.id]?.status === "in_progress";
          const locked = lockedSet.has(s.id);
          if (status === "verified" && !isDone) return false;
          if (status === "progress" && !inProgress) return false;
          if (status === "locked" && !locked) return false;
          if (status === "open" && (isDone || inProgress || locked)) return false;
        }
        if (query) {
          const q = query.toLowerCase();
          if (
            !s.title.toLowerCase().includes(q) &&
            !s.ticket.symptomPlainLanguage.toLowerCase().includes(q) &&
            !s.ticket.id.toLowerCase().includes(q)
          )
            return false;
        }
        return true;
      }),
    [scenarios, category, difficulty, status, query, doneSet, runs, lockedSet],
  );

  const isFiltered = category !== "all" || difficulty !== "all" || status !== "all" || query !== "";
  const inProgressCount = activeSet.size;

  return (
    <div className="page">
      <header className="inset page-head">
        <h1 className="t-display">Labs</h1>
        <p className="page-note">
          Every entry is a reported fault with one fixed root cause, a worked evidence trail and a
          verification gate.
        </p>
      </header>

      <div className="inset catalog-toolbar" role="group" aria-label="Search and filter incidents">
        <div className="catalog-search">
          <label className="sr-only" htmlFor="lab-search">
            Search labs
          </label>
          <Search
            size={15}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-faint pointer-events-none"
            aria-hidden
          />
          <input
            id="lab-search"
            value={query}
            onChange={(e) => setFilter("q", e.target.value)}
            placeholder="Title, symptom, or ticket id…"
            className="input w-full pl-9"
          />
        </div>
        <label className="sr-only" htmlFor="lab-diff">
          Level
        </label>
        <select
          id="lab-diff"
          value={difficulty}
          onChange={(e) => setFilter("difficulty", e.target.value)}
          className="input"
        >
          <option value="all">Any level</option>
          {difficulties.map((d) => (
            <option key={d} value={d}>
              {DIFFICULTY_LABEL[d] ?? d}
            </option>
          ))}
        </select>
        <label className="sr-only" htmlFor="lab-status">
          Status
        </label>
        <select
          id="lab-status"
          value={status}
          onChange={(e) => setFilter("status", e.target.value)}
          className="input"
        >
          {statuses.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
            </option>
          ))}
        </select>
        <span className="catalog-showing">
          Showing <span className="t-mono text-ink font-semibold">{filtered.length}</span> of{" "}
          <span className="t-mono text-ink font-semibold">{scenarios.length}</span>
        </span>
        {isFiltered && (
          <Link to="/labs" className="sec-link">
            Clear
          </Link>
        )}
      </div>

      <div className="inset catalog-grid">
        {/* Discipline rail — sticky navigation with progress totals. */}
        <nav className="disc-rail" aria-label="Disciplines">
          <div className="disc-rail-items">
            <button
              type="button"
              className="disc-rail-item"
              aria-pressed={category === "all"}
              onClick={() => setFilter("category", "all")}
            >
              <span className="disc-rail-label">All incidents</span>
              <span className="disc-rail-count t-mono">{scenarios.length}</span>
            </button>
            {available.map((d) => {
              const count = scenarios.filter((s) => s.category === d.id).length;
              return (
                <button
                  key={d.id}
                  type="button"
                  className="disc-rail-item"
                  aria-pressed={category === d.id}
                  onClick={() => setFilter("category", d.id)}
                >
                  <DisciplineIcon category={d.id} size={14} />
                  <span className="disc-rail-label">{d.label}</span>
                  <span className="disc-rail-count t-mono">{count}</span>
                </button>
              );
            })}
          </div>
          <div className="disc-rail-foot">
            <span className="state-mark state-mark--verified">{completed.length} verified</span>
            <span className="state-mark state-mark--active">{inProgressCount} in progress</span>
          </div>
        </nav>

        {/* The incident ledger — hairline rows, columns labelled once. */}
        <div className="ledger">
          {filtered.length === 0 ? (
            <div className="empty-state">
              <span className="t-title">No labs match these filters</span>
              <span>Clear them to see the full register of {scenarios.length} scenarios.</span>
              <Link to="/labs" className="btn-secondary mt-1">
                Clear filters
              </Link>
            </div>
          ) : (
            <>
              <div className="ledger-head" aria-hidden>
                <span className="case-row-status">Status</span>
                <span className="case-row-id">Ticket</span>
                <span className="case-row-title">Incident</span>
                <span className="case-row-domain">Domain</span>
                <span className="case-row-diff">Level</span>
                <span className="case-row-env">Environment</span>
                <span className="case-row-min">Time</span>
              </div>
              <div className="ruled-list">
                {filtered.map((scenario) => {
                  const isDone = doneSet.has(scenario.id);
                  const locked = lockedSet.has(scenario.id);
                  const entry = runs[scenario.id];
                  const inProgress = !isDone && entry?.status === "in_progress";
                  const level = DIFFICULTY_LABEL[scenario.difficulty];
                  const envLabel =
                    ENVIRONMENT_LABEL[scenario.environment.kind] ?? scenario.environment.kind;
                  return (
                    <Link
                      key={scenario.id}
                      to={`/lab/${scenario.id}`}
                      className="ruled-row case-row"
                      data-locked={locked ? "true" : undefined}
                    >
                      <span
                        className={`state-mark shrink-0 case-row-status ${
                          isDone
                            ? "state-mark--verified"
                            : inProgress
                              ? "state-mark--active"
                              : locked
                                ? "state-mark--warning"
                                : "state-mark--open"
                        }`}
                      >
                        {isDone
                          ? "Verified"
                          : inProgress
                            ? `${entry.actionCount} steps`
                            : locked
                              ? "Locked"
                              : "Open"}
                      </span>

                      <span className="t-mono text-faint tabular-nums shrink-0 case-row-id">
                        {scenario.ticket.id}
                      </span>

                      <span className="flex flex-col min-w-0 flex-1 case-row-title">
                        <span className="text-sm font-medium text-ink">{scenario.title}</span>
                        <span className="text-xs text-muted truncate">
                          {scenario.ticket.symptomPlainLanguage}
                        </span>
                        {locked && (
                          <span className="case-row-req">
                            Requires {scenario.prerequisites.map(prereqLabel).join(" · ")}
                          </span>
                        )}
                      </span>

                      <span className="text-sm text-muted truncate case-row-domain">
                        {disciplineLabel(scenario.category)}
                      </span>

                      <span className="text-sm text-muted truncate case-row-diff">{level}</span>

                      <span className="text-sm text-muted truncate case-row-env" title={envLabel}>
                        {envLabel}
                      </span>

                      <span className="t-mono text-faint tabular-nums shrink-0 case-row-min">
                        {scenario.estimatedMinutes}m
                      </span>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
