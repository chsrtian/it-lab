import { useMemo, useState } from "react";
import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { availableActions } from "@/engine";
import { LabSection } from "@/features/env";
import {
  AlertTriangle,
  CheckCircle2,
  Cog,
  Database,
  HardDrive,
  HelpCircle,
  Monitor,
  Network,
  Plug,
  ScrollText,
  Server,
  X,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import {
  DB_LOG_CATEGORIES,
  DB_TONE_MARK,
  dbAppView,
  dbConnectionView,
  dbDatabaseName,
  dbDatabaseView,
  dbEvidence,
  dbLayerViews,
  dbLogs,
  dbPoolView,
  dbPortView,
  dbStatus,
  dbStorageView,
  dbTarget,
  dbTargetAddress,
  dbUnit,
  type DbLayerId,
  type DbLogCategory,
  type DbTone,
} from "@/features/database/dbState";

type Selection = DbLayerId | null;

interface LayerMeta {
  role: string;
  icon: LucideIcon;
  title: (world: Record<string, unknown>) => string;
  kb?: string;
}

const LAYER_META: Record<DbLayerId, LayerMeta> = {
  app: {
    role: "CLIENT",
    icon: Monitor,
    title: () => "API service",
    kb: "database-connection-basics",
  },
  pool: {
    role: "CLIENT",
    icon: Network,
    title: () => "Connection pool",
    kb: "database-connection-basics",
  },
  host: {
    role: "SERVER",
    icon: Server,
    title: (w) => dbTarget(w).host,
    kb: "database-connection-basics",
  },
  service: {
    role: "UNIT",
    icon: Cog,
    title: (w) => `${dbUnit(w)?.name ?? "postgresql"}.service`,
    kb: "systemd-service-basics",
  },
  port: {
    role: "SOCKET",
    icon: Plug,
    title: (w) => `TCP ${dbTarget(w).port}`,
    kb: "database-connection-basics",
  },
  database: {
    role: "INSTANCE",
    icon: Database,
    title: (w) => dbDatabaseName(w),
    kb: "database-connection-basics",
  },
  storage: {
    role: "VOLUME",
    icon: HardDrive,
    title: () => "Data directory",
    kb: "database-connection-basics",
  },
};

/** Probe-strip click targets (which layer a diagnostic investigates). */
const CHECK_TARGET: Record<string, DbLayerId> = {
  "read-logs": "app",
  "check-port": "port",
  "check-service": "service",
};

function toneIcon(tone: DbTone) {
  if (tone === "ok") return <CheckCircle2 size={12} aria-hidden />;
  if (tone === "warn") return <AlertTriangle size={12} aria-hidden />;
  if (tone === "crit") return <XCircle size={12} aria-hidden />;
  return <HelpCircle size={12} aria-hidden />;
}

function layerFacts(
  world: Record<string, unknown>,
  layer: DbLayerId,
): { label: string; value: string }[] {
  const target = dbTarget(world);
  const host = (
    Array.isArray(world.hosts) ? world.hosts : []
  )[0] as Record<string, unknown> | undefined;
  const address = dbTargetAddress(world);
  switch (layer) {
    case "app":
      return [
        { label: "Target", value: `${target.host}:${target.port}` },
        { label: "Local host", value: String(host?.name ?? "app01") },
        {
          label: "Credentials",
          value:
            dbAppView(world).state === "AUTH ERROR"
              ? "rejected"
              : "not reached (refused before auth)",
        },
      ];
    case "pool":
      return [
        { label: "Mode", value: "transaction pool" },
        { label: "Target", value: `${target.host}:${target.port}` },
        { label: "Backends", value: dbPoolView(world).detail },
      ];
    case "host":
      return [
        {
          label: "Address",
          value: address ? `${address} · from logs` : "not observed",
        },
        { label: "Role", value: "database host" },
        { label: "Units", value: dbUnit(world)?.name ?? "postgresql" },
      ];
    case "service": {
      const unit = dbUnit(world);
      const checked = dbEvidence(world).serviceChecked;
      return [
        { label: "Unit", value: `${unit?.name ?? "postgresql"}.service` },
        { label: "Loaded", value: "loaded · enabled" },
        { label: "Active", value: checked && unit ? unit.status : "not checked" },
      ];
    }
    case "port": {
      const listening = dbPortView(world).state === "LISTENING";
      const checked =
        dbEvidence(world).portChecked || listening;
      return [
        { label: "Socket", value: `tcp ${target.port}` },
        {
          label: "Listener",
          value: !checked ? "not checked" : listening ? "LISTEN 0.0.0.0" : "no socket",
        },
        { label: "Process", value: listening ? "postgres" : "—" },
      ];
    }
    case "database":
      return [
        { label: "Instance", value: dbDatabaseName(world) },
        { label: "Engine", value: "PostgreSQL" },
        { label: "State", value: dbDatabaseView(world).detail },
      ];
    case "storage":
      return [
        {
          label: "Data dir",
          value: String((world.db as Record<string, unknown> | undefined)?.dataDir ?? "/var/lib/postgresql/data"),
        },
        { label: "State", value: dbStorageView(world).detail },
      ];
    default:
      return [];
  }
}

export interface DatabaseLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
}

/**
 * Database operations environment.
 *
 * Grammar: a client/server rack ladder (app → pool → TCP channel → host ⊃
 * service → port → database → storage) with evidence-driven states, a
 * contextual inspector (only while selected), a checks strip, and an
 * on-request journal overlay. Deliberately NOT the network lab's node graph
 * and NOT a dashboard of status cards.
 */
export function DatabaseLab({
  scenario,
  run,
  onInspect,
  onOpenKb,
}: DatabaseLabProps) {
  const [sel, setSel] = useState<Selection>(null);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logCat, setLogCat] = useState<DbLogCategory | "all">("all");

  const world = run.world;
  const status = dbStatus(world);
  const conn = dbConnectionView(world);
  const views = dbLayerViews(world);
  const target = dbTarget(world);
  const unit = dbUnit(world);
  const logs = dbLogs(world);

  const checkSteps = useMemo(
    () => scenario.actions.filter((a) => a.isDiagnostic).slice(0, 4),
    [scenario.actions],
  );

  const layerActions =
    sel !== null
      ? availableActions(scenario, run).filter(
          (a) => a.component === sel || a.inspectTarget === sel,
        )
      : [];

  const layerEvidence =
    sel === null
      ? []
      : scenario.actions
          .filter((a) => run.appliedActions.includes(a.id))
          .filter((a) => a.component === sel || a.inspectTarget === sel);

  const filteredLogs =
    logCat === "all" ? logs : logs.filter((l) => l.category === logCat);

  const runCheck = (actionId: string) => {
    onInspect(actionId);
    const layer = CHECK_TARGET[actionId];
    if (layer) setSel(layer);
  };

  const layerRow = (layer: DbLayerId) => {
    const meta = LAYER_META[layer];
    const view = views[layer];
    const Icon = meta.icon;
    return (
      <button
        key={layer}
        type="button"
        className={`db-layer${sel === layer ? " is-sel" : ""}`}
        aria-pressed={sel === layer}
        onClick={() => setSel(sel === layer ? null : layer)}
      >
        <span className={`db-layer-icon tone-${view.tone}`} aria-hidden>
          <Icon size={15} />
        </span>
        <span className="db-layer-names">
          <span className="db-layer-id">{meta.title(world)}</span>
          <span className="db-layer-role">{meta.role}</span>
        </span>
        <span className={`db-layer-state tone-${view.tone}`}>
          <span className="db-state-word">
            <span className="db-state-mark" aria-hidden>
              {DB_TONE_MARK[view.tone]}
            </span>
            {view.state}
          </span>
          <span className="db-layer-detail">{view.detail}</span>
        </span>
      </button>
    );
  };

  const openLogs = () => {
    setLogsOpen(true);
    setLogCat("all");
  };

  return (
    <LabSection
      aria-label="Database operations"
      data-testid="database-lab"
      title={
        <span className="inline-flex items-center gap-1.5">
          <Database size={14} aria-hidden className="text-lab-accent" />
          Database operations
        </span>
      }
      subtitle={`${(Array.isArray(world.hosts) ? (world.hosts[0] as Record<string, unknown> | undefined)?.name : undefined) ?? "app01"} → ${target.host}:${target.port}`}
      status={status}
    >
      <div className="db-body">
        <div className="db-stage-wrap" data-testid="database-stage">
          {/* Evidence checks — top-left, progress appears as it happens */}
          <div className="db-checks" role="status" aria-label="Diagnostic checks">
            <span className="db-checks-label" aria-hidden>
              CHECKS
            </span>
            {checkSteps.map((a) => {
              const done = run.appliedActions.includes(a.id);
              const layer = CHECK_TARGET[a.id];
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`db-check${done ? " is-done" : ""}${
                    layer && sel === layer ? " is-on" : ""
                  }`}
                  aria-pressed={layer ? sel === layer : false}
                  onClick={() => runCheck(a.id)}
                  title={done ? (a.feedback ?? a.label) : a.description}
                >
                  {done ? (
                    <CheckCircle2 size={11} aria-hidden />
                  ) : (
                    <HelpCircle size={11} aria-hidden />
                  )}
                  <span className="db-check-text">{a.label}</span>
                </button>
              );
            })}
          </div>

          {/* Journal — top-right, opens on request */}
          <button
            type="button"
            className={`db-log-toggle${logsOpen ? " is-on" : ""}`}
            aria-pressed={logsOpen}
            aria-expanded={logsOpen}
            onClick={() => (logsOpen ? setLogsOpen(false) : openLogs())}
          >
            <ScrollText size={12} aria-hidden /> Journal
            <span className="db-log-count">{logs.length}</span>
          </button>

          {/* The causal stack — the environment itself */}
          <div className="db-ladder" role="group" aria-label="Database stack">
            {layerRow("app")}
            {layerRow("pool")}

            {/* Connection channel: the app→db TCP path, state on the wire */}
            <div
              className={`db-conn tone-${conn.tone}${conn.established ? " is-up" : ""}`}
              aria-label={`Connection: ${conn.label}`}
            >
              <span className="db-conn-line" aria-hidden />
              <span className="db-conn-label">
                <span className="db-state-mark" aria-hidden>
                  {DB_TONE_MARK[conn.tone]}
                </span>
                {conn.label}
              </span>
            </div>

            {layerRow("host")}

            {/* db01 contains its units, sockets and data */}
            <div className="db-contain">
              <div className="db-contain-body">
                {layerRow("service")}
                {layerRow("port")}
                {layerRow("database")}
                {layerRow("storage")}
              </div>
            </div>
          </div>

          {/* Journal overlay — investigation tool, not a permanent panel */}
          {logsOpen && (
            <div className="db-logs" role="region" aria-label="System journal">
              <header className="db-logs-head">
                <span className="db-logs-title">
                  JOURNAL{unit ? ` · ${unit.name}` : ""}
                </span>
                <button
                  type="button"
                  className="db-logs-close"
                  aria-label="Close journal"
                  onClick={() => setLogsOpen(false)}
                >
                  <X size={13} aria-hidden />
                </button>
              </header>
              <div className="db-log-cats" role="group" aria-label="Log categories">
                {(["all", ...DB_LOG_CATEGORIES] as const).map((c) => (
                  <button
                    key={c}
                    type="button"
                    className={`db-log-cat${logCat === c ? " is-on" : ""}`}
                    aria-pressed={logCat === c}
                    onClick={() => setLogCat(c)}
                  >
                    {c}
                  </button>
                ))}
              </div>
              <ul className="db-log-lines">
                {filteredLogs.map((l, i) => (
                  <li key={`${i}-${l.source}-${l.text.slice(0, 20)}`}>
                    <span className={`db-log-sev sev-${l.severity.toLowerCase()}`}>
                      {l.severity}
                    </span>
                    <span className="db-log-src">{l.source}:</span>
                    <span className="db-log-text">{l.text}</span>
                  </li>
                ))}
              </ul>
              {filteredLogs.length === 0 && (
                <p className="db-logs-empty">No entries in this category.</p>
              )}
            </div>
          )}

          {/* Contextual inspector — only while a layer is selected */}
          {sel !== null && (
            <aside
              className="db-inspector"
              aria-label={`${LAYER_META[sel].title(world)} inspector`}
            >
              <header className="db-inspector-head">
                <span className={`db-inspector-icon tone-${views[sel].tone}`}>
                  {(() => {
                    const Icon = LAYER_META[sel].icon;
                    return <Icon size={14} aria-hidden />;
                  })()}
                </span>
                <span className="db-inspector-names">
                  <span className="db-inspector-role">{LAYER_META[sel].role}</span>
                  <span className="db-inspector-title">
                    {LAYER_META[sel].title(world)}
                  </span>
                </span>
                <button
                  type="button"
                  className="db-inspector-close"
                  aria-label="Close inspector"
                  onClick={() => setSel(null)}
                >
                  <X size={13} aria-hidden />
                </button>
              </header>

              <div className={`db-status-line tone-${views[sel].tone}`}>
                <span className="db-status-icon" aria-hidden>
                  {toneIcon(views[sel].tone)}
                </span>
                {views[sel].state}
                <span className="db-status-detail">{views[sel].detail}</span>
              </div>

              {sel === "service" && (
                <div className="db-unit-block" aria-label="Unit status">
                  <div className="db-unit-line">
                    <span
                      className={`db-unit-dot tone-${views.service.tone}`}
                      aria-hidden
                    >
                      ●
                    </span>
                    {unit?.name ?? "postgresql"}.service — {unit?.description ?? "service"}
                  </div>
                  <div className="db-unit-line dim">
                    Loaded: loaded (/lib/systemd/system/
                    {unit?.name ?? "postgresql"}.service; enabled)
                  </div>
                  <div className="db-unit-line">
                    Active:{" "}
                    {dbEvidence(world).serviceChecked && unit
                      ? unit.status
                      : "— not checked"}
                  </div>
                  {dbEvidence(world).serviceChecked &&
                    unit?.lastError.map((e) => (
                      <div key={e} className="db-unit-line err">
                        {e}
                      </div>
                    ))}
                </div>
              )}

              <dl className="db-facts">
                {layerFacts(world, sel).map((f) => (
                  <div key={f.label} className="db-fact-row">
                    <dt>{f.label}</dt>
                    <dd>{f.value}</dd>
                  </div>
                ))}
              </dl>

              {layerEvidence.length > 0 && (
                <div className="db-kv">
                  <div className="db-kv-label">Evidence</div>
                  <ul className="db-evidence">
                    {layerEvidence.map((a) => (
                      <li key={a.id}>
                        <span className="db-evidence-mark" aria-hidden>
                          ✓
                        </span>
                        <span>
                          <span className="db-evidence-label">{a.label}</span>
                          <span className="db-evidence-text">
                            {a.evaluation?.evidenceGain ?? a.feedback}
                          </span>
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {(layerActions.length > 0 || sel === "service" || sel === "host") && (
                <div className="db-kv">
                  <div className="db-kv-label">Available</div>
                  <div className="db-actions">
                    {layerActions.map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        className="btn-secondary db-action-btn"
                        onClick={() => onInspect(a.id)}
                        title={a.description}
                      >
                        {a.label}
                      </button>
                    ))}
                    <button
                      type="button"
                      className="btn-secondary db-action-btn"
                      onClick={openLogs}
                    >
                      <ScrollText size={12} aria-hidden /> Open journal
                    </button>
                  </div>
                </div>
              )}

              {LAYER_META[sel].kb && onOpenKb && (
                <button
                  type="button"
                  className="db-learn-btn"
                  onClick={() => onOpenKb(LAYER_META[sel].kb!)}
                >
                  Learn: {sel === "service" ? "systemd services" : "database connections"}
                </button>
              )}
            </aside>
          )}
        </div>
      </div>
    </LabSection>
  );
}
