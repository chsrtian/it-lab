/**
 * Deterministic, evidence-driven database state.
 *
 * Same principle as netState.ts: raw fault flags and unit status are NOT
 * surfaced until the learner's checks (or terminal commands mapped to those
 * checks) have recorded evidence. The reported symptom (application
 * connection refused) is public and may reflect faults directly; root cause
 * identity (why the service/port failed) is progressive.
 *
 * Layer views are derived generically from world keys so future database
 * incidents (auth failures, connection limits, disk full, config errors)
 * plug in without restructuring the ladder.
 */

export type DbLayerId =
  | "app"
  | "pool"
  | "host"
  | "service"
  | "port"
  | "database"
  | "storage";

export type DbTone = "ok" | "warn" | "crit" | "unknown";

export interface DbLayerView {
  /** Uppercase state word shown in the ladder/inspector. */
  state: string;
  tone: DbTone;
  /** One-line factual reason (never an instruction). */
  detail: string;
}

export const DB_LAYERS: readonly DbLayerId[] = [
  "app",
  "pool",
  "host",
  "service",
  "port",
  "database",
  "storage",
];

export const DB_TONE_MARK: Record<DbTone, string> = {
  ok: "✓",
  warn: "!",
  crit: "✗",
  unknown: "?",
};

function asRec(v: unknown): Record<string, unknown> {
  return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
}

function flags(v: unknown): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const [k, val] of Object.entries(asRec(v))) {
    if (typeof val === "boolean") out[k] = val;
  }
  return out;
}

function strList(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export interface DbUnit {
  id: string;
  name: string;
  status: string;
  description: string;
  lastError: string[];
}

/** The database unit (default postgresql; overridable per scenario). */
export function dbUnit(world: Record<string, unknown>): DbUnit | null {
  const wanted = String(asRec(world.db).serviceName ?? "postgresql");
  const services = Array.isArray(world.services) ? world.services : [];
  for (const raw of services) {
    const s = asRec(raw);
    const id = String(s.id ?? "");
    const name = String(s.name ?? "");
    if (name === wanted || id === wanted || name.includes(wanted)) {
      return {
        id: id || wanted,
        name: name || wanted,
        status: String(s.status ?? "unknown"),
        description: String(s.description ?? "service"),
        lastError: strList(s.lastError),
      };
    }
  }
  const first = asRec(services[0]);
  if (Object.keys(first).length === 0) return null;
  return {
    id: String(first.id ?? wanted),
    name: String(first.name ?? wanted),
    status: String(first.status ?? "unknown"),
    description: String(first.description ?? "service"),
    lastError: strList(first.lastError),
  };
}

export function dbFaults(world: Record<string, unknown>): Record<string, boolean> {
  return flags(asRec(asRec(world.network).faults));
}

export function dbFacts(world: Record<string, unknown>): Record<string, boolean> {
  return flags(world.db);
}

/** serviceChecked = the learner has inspected unit status (db.credsChecked). */
export function dbEvidence(world: Record<string, unknown>): {
  serviceChecked: boolean;
  portChecked: boolean;
  verified: boolean;
} {
  const f = dbFacts(world);
  return {
    serviceChecked: f.credsChecked === true,
    portChecked: f.portChecked === true,
    verified: f.verified === true,
  };
}

/** Map a systemd status string to an ops word (supports future scenarios). */
export function dbServicePhase(status: string): DbLayerView {
  const s = status.toLowerCase();
  // Order matters: "inactive" contains "active", "deactivating" contains "activating".
  if (/failed|deactivating-failed| Result: exit/.test(s))
    return { state: "FAILED", tone: "crit", detail: status };
  if (/inactive|stopped|dead/.test(s))
    return { state: "STOPPED", tone: "crit", detail: status };
  if (/activating|starting|auto-start/.test(s))
    return { state: "STARTING", tone: "warn", detail: status };
  if (/active|running/.test(s))
    return { state: "RUNNING", tone: "ok", detail: status };
  return { state: "UNKNOWN", tone: "unknown", detail: status || "no status" };
}

export function dbServiceView(world: Record<string, unknown>): DbLayerView {
  const ev = dbEvidence(world);
  const unit = dbUnit(world);
  if (!ev.serviceChecked && dbFacts(world).serviceStarted !== true) {
    return { state: "UNTESTED", tone: "unknown", detail: "unit status not checked" };
  }
  if (!unit) return { state: "MISSING", tone: "crit", detail: "unit not found" };
  const phase = dbServicePhase(unit.status);
  if (phase.tone === "crit" && unit.lastError.length > 0) {
    return { ...phase, detail: unit.lastError[0] };
  }
  return phase;
}

export function dbPortView(world: Record<string, unknown>): DbLayerView {
  const { portChecked } = dbEvidence(world);
  const port = String(asRec(world.db).port ?? "5432");
  // Positive state (a live listener) is observable; failures need evidence.
  if (dbFacts(world).portListening === true) {
    return { state: "LISTENING", tone: "ok", detail: `0.0.0.0:${port}` };
  }
  if (!portChecked) {
    return { state: "UNTESTED", tone: "unknown", detail: "listener not checked" };
  }
  if (dbFaults(world).portBlocked === true) {
    return { state: "FILTERED", tone: "crit", detail: "packets dropped" };
  }
  return { state: "CLOSED", tone: "crit", detail: "no process listening" };
}

export type DbAppFamily = "refused" | "filtered" | "auth" | "capacity" | "verified";

/** Which failure family (if any) drives the application symptom. */
export function dbAppFamily(world: Record<string, unknown>): DbAppFamily | null {
  const f = dbFaults(world);
  const facts = dbFacts(world);
  const ev = dbEvidence(world);
  if (ev.verified) return "verified";
  if (f.authFailed === true || facts.authFailed === true) return "auth";
  if (
    f.maxConnections === true ||
    facts.maxConnectionsReached === true ||
    facts.poolExhausted === true
  )
    return "capacity";
  if (f.portBlocked === true) return "filtered";
  // Symptom-level evidence: the service is down or nothing accepts on the port.
  const unit = dbUnit(world);
  const unitFailed = ev.serviceChecked && unit !== null && /failed|inactive|stopped/.test(unit.status.toLowerCase());
  if (f.dbServiceDown === true) return "refused";
  if (ev.portChecked && facts.portListening !== true) return "refused";
  if (unitFailed) return "refused";
  return null;
}

export function dbAppView(world: Record<string, unknown>): DbLayerView {
  const family = dbAppFamily(world);
  const port = String(asRec(world.db).port ?? "5432");
  const target = dbTarget(world).host;
  switch (family) {
    case "verified":
      return { state: "CONNECTED", tone: "ok", detail: "SELECT 1 ok" };
    case "refused":
      return {
        state: "REFUSED",
        tone: "crit",
        detail: `ECONNREFUSED ${target}:${port}`,
      };
    case "filtered":
      return { state: "TIMEOUT", tone: "crit", detail: "filtered path to port" };
    case "auth":
      return { state: "AUTH ERROR", tone: "crit", detail: "password authentication failed" };
    case "capacity":
      return { state: "REJECTED", tone: "crit", detail: "no connections available" };
    default:
      return { state: "UNTESTED", tone: "unknown", detail: "not verified" };
  }
}

export function dbPoolView(world: Record<string, unknown>): DbLayerView {
  const app = dbAppView(world);
  if (app.state === "CONNECTED")
    return { state: "OPEN", tone: "ok", detail: "backend in use" };
  if (app.tone === "crit")
    return { state: "0 / UNAVAILABLE", tone: "crit", detail: "dial did not succeed" };
  return { state: "UNTESTED", tone: "unknown", detail: "not verified" };
}

export function dbHostView(world: Record<string, unknown>): DbLayerView {
  const f = dbFaults(world);
  if (f.dbHostDown === true) return { state: "DOWN", tone: "crit", detail: "no route to host" };
  const ev = dbEvidence(world);
  const app = dbAppView(world);
  // A TCP RST (connection refused) is itself proof the host is answering.
  if (app.state === "REFUSED")
    return { state: "UP", tone: "ok", detail: "answered TCP RST" };
  if (ev.verified) return { state: "UP", tone: "ok", detail: "reachable" };
  if (ev.serviceChecked || ev.portChecked)
    return { state: "UP", tone: "ok", detail: "tools responded" };
  return { state: "UNTESTED", tone: "unknown", detail: "not probed" };
}

export function dbDatabaseView(world: Record<string, unknown>): DbLayerView {
  const ev = dbEvidence(world);
  const name = dbDatabaseName(world);
  if (ev.verified)
    return { state: "READY", tone: "ok", detail: `${name} accepting connections` };
  const svc = dbServiceView(world);
  const port = dbPortView(world);
  if (svc.state === "RUNNING" && port.state === "LISTENING")
    return { state: "READY", tone: "ok", detail: `${name} accepting connections` };
  if (
    (ev.serviceChecked && (svc.state === "FAILED" || svc.state === "STOPPED")) ||
    (ev.portChecked && port.state === "CLOSED")
  )
    return { state: "UNAVAILABLE", tone: "crit", detail: "instance not serving" };
  return { state: "UNTESTED", tone: "unknown", detail: "instance not checked" };
}

export function dbDatabaseName(world: Record<string, unknown>): string {
  const v = asRec(world.db).name;
  return typeof v === "string" && v.length > 0 ? v : "appdb";
}

export function dbStorageView(world: Record<string, unknown>): DbLayerView {
  const f = dbFaults(world);
  const svc = dbUnit(world);
  const diskErr = svc !== null && svc.lastError.some((e) => /disk|space|input\/output/i.test(e));
  if (f.diskFull === true || diskErr)
    return { state: "FULL", tone: "crit", detail: "no space for writes/WAL" };
  const dir = String(asRec(world.db).dataDir ?? "/var/lib/postgresql/data");
  return { state: "MOUNTED", tone: "ok", detail: dir };
}

export interface DbTarget {
  host: string;
  port: string;
}

/** Connection target identity (name is public via the ticket; addr from logs). */
export function dbTarget(world: Record<string, unknown>): DbTarget {
  const db = asRec(world.db);
  const port = String(db.port ?? "5432");
  const host =
    typeof db.host === "string" && db.host.length > 0
      ? db.host
      : String(db.hostName ?? "db01");
  return { host, port };
}

/** Address observed in log evidence (revealed with logs, not guessed). */
export function dbTargetAddress(world: Record<string, unknown>): string | null {
  const db = asRec(world.db);
  if (typeof db.hostAddress === "string") return db.hostAddress;
  for (const line of strList(world.logs)) {
    const m = line.match(/\b(\d{1,3}(?:\.\d{1,3}){3}):5432\b/);
    if (m) return m[1];
  }
  return null;
}

/** Header badge: only reflects proven state (plus the public symptom). */
export function dbStatus(world: Record<string, unknown>): {
  tone: "ok" | "warn" | "crit" | "unknown";
  label: string;
} {
  const ev = dbEvidence(world);
  if (ev.verified) return { tone: "ok", label: "app → db healthy" };
  const svc = dbServiceView(world);
  if (ev.serviceChecked && svc.tone === "crit")
    return { tone: "crit", label: `${dbUnit(world)?.name ?? "db"} ${svc.state.toLowerCase()}` };
  const port = dbPortView(world);
  if (ev.portChecked && port.tone === "crit")
    return { tone: "crit", label: `5432 ${port.state.toLowerCase()}` };
  const app = dbAppView(world);
  if (app.tone === "crit") {
    const family = dbAppFamily(world);
    if (family === "auth") return { tone: "crit", label: "app auth rejected" };
    if (family === "capacity") return { tone: "crit", label: "app connections exhausted" };
    if (family === "filtered") return { tone: "crit", label: "app connection timeout" };
    return { tone: "crit", label: "app connection refused" };
  }
  if (app.state === "CONNECTED") return { tone: "ok", label: "app → db healthy" };
  return { tone: "unknown", label: "unverified" };
}

export type DbLayerViews = Record<DbLayerId, DbLayerView>;

/** All ladder layer views in one pass (pure). */
export function dbLayerViews(world: Record<string, unknown>): DbLayerViews {
  return {
    app: dbAppView(world),
    pool: dbPoolView(world),
    host: dbHostView(world),
    service: dbServiceView(world),
    port: dbPortView(world),
    database: dbDatabaseView(world),
    storage: dbStorageView(world),
  };
}

export interface DbConnView {
  label: string;
  tone: DbTone;
  established: boolean;
}

/** The TCP connection channel between the pool and the database host. */
export function dbConnectionView(world: Record<string, unknown>): DbConnView {
  const app = dbAppView(world);
  const { host, port } = dbTarget(world);
  if (app.state === "CONNECTED")
    return { label: `TCP ${port} → ${host} · ESTABLISHED`, tone: "ok", established: true };
  if (app.tone === "crit")
    return { label: `TCP ${port} → ${host} · ${app.state}`, tone: "crit", established: false };
  return { label: `TCP ${port} → ${host} · UNTESTED`, tone: "unknown", established: false };
}

/* ----------------------------- journal / logs ---------------------------- */

export type DbLogSeverity = "FATAL" | "ERROR" | "WARN" | "INFO";

export type DbLogCategory =
  | "connection"
  | "listener"
  | "startup"
  | "auth"
  | "storage"
  | "config"
  | "general";

export interface DbLogLine {
  source: string;
  text: string;
  severity: DbLogSeverity;
  category: DbLogCategory;
}

export const DB_LOG_CATEGORIES: readonly DbLogCategory[] = [
  "connection",
  "listener",
  "startup",
  "auth",
  "storage",
  "config",
];

export function dbClassifyLog(text: string): {
  severity: DbLogSeverity;
  category: DbLogCategory;
} {
  let severity: DbLogSeverity = "INFO";
  if (/FATAL/i.test(text)) severity = "FATAL";
  else if (/error|ECONNREFUSED|refused|fail|denied|no space|out of space/i.test(text))
    severity = "ERROR";
  else if (/warn/i.test(text)) severity = "WARN";

  let category: DbLogCategory = "general";
  if (/password|authentication|auth|role "/i.test(text)) category = "auth";
  else if (/bind|listen|address already in use|socket/i.test(text)) category = "listener";
  else if (/shutting|shutdown|starting|started|ready to accept|recovery/i.test(text))
    category = "startup";
  else if (/disk|WAL|checkpoint|space|input\/output/i.test(text)) category = "storage";
  else if (/parameter|config|setting/i.test(text)) category = "config";
  else if (/connect|ECONNREFUSED|client|connection/i.test(text)) category = "connection";
  return { severity, category };
}

export function dbLogs(world: Record<string, unknown>): DbLogLine[] {
  return strList(world.logs).map((line) => {
    const m = line.match(/^([A-Za-z0-9_.-]+):\s*(.*)$/);
    const source = m ? m[1] : "kernel";
    const text = m ? m[2] : line;
    const { severity, category } = dbClassifyLog(`${source} ${text}`);
    return { source, text, severity, category };
  });
}
