import { describe, expect, it } from "vitest";
import {
  DB_LAYERS,
  DB_TONE_MARK,
  dbAppFamily,
  dbAppView,
  dbClassifyLog,
  dbConnectionView,
  dbDatabaseView,
  dbEvidence,
  dbFaults,
  dbHostView,
  dbLayerViews,
  dbLogs,
  dbPoolView,
  dbPortView,
  dbServicePhase,
  dbServiceView,
  dbStatus,
  dbStorageView,
  dbTarget,
  dbTargetAddress,
  dbUnit,
} from "./dbState";

type World = Record<string, unknown>;

/** t0 of the db-connection-refused ticket: symptom public, root cause hidden. */
function t0(): World {
  return {
    hosts: [{ id: "app01", name: "app01", ip: "192.168.1.30" }],
    services: [
      {
        id: "postgresql",
        name: "postgresql",
        status: "failed",
        description: "PostgreSQL RDBMS",
        lastError: ["FATAL: could not bind IPv4 address: Address already in use"],
      },
    ],
    network: { faults: { dbServiceDown: true, portBlocked: false } },
    db: {
      host: "db01",
      port: "5432",
      credsChecked: false,
      portChecked: false,
      verified: false,
      serviceStarted: false,
      portListening: false,
    },
    logs: [
      "app01: connection refused to 192.168.1.31:5432",
      "postgresql: FATAL: could not bind IPv4 address: Address already in use",
    ],
  };
}

function checkPort(w: World): World {
  return {
    ...w,
    db: { ...(w.db as object), portChecked: true },
  };
}

function checkService(w: World): World {
  return {
    ...w,
    db: { ...(w.db as object), credsChecked: true },
  };
}

function restart(w: World): World {
  const services = (w.services as Record<string, unknown>[]).map((s) => ({
    ...s,
    status: "active (running)",
    lastError: [],
  }));
  return {
    ...w,
    services,
    db: {
      ...(w.db as object),
      credsChecked: true,
      portChecked: true,
      serviceStarted: true,
      portListening: true,
    },
  };
}

function verify(w: World): World {
  return { ...w, db: { ...(w.db as object), verified: true } };
}

describe("db evidence gate", () => {
  it("starts with no evidence recorded", () => {
    expect(dbEvidence(t0())).toEqual({
      serviceChecked: false,
      portChecked: false,
      verified: false,
    });
  });

  it("records check evidence from applied actions", () => {
    expect(dbEvidence(checkPort(t0())).portChecked).toBe(true);
    expect(dbEvidence(checkPort(t0())).serviceChecked).toBe(false);
    expect(dbEvidence(checkService(t0())).serviceChecked).toBe(true);
    expect(dbEvidence(verify(t0())).verified).toBe(true);
  });
});

describe("ladder views at t0 (root cause hidden)", () => {
  it("app shows the public symptom, pool shows dial failure", () => {
    expect(dbAppView(t0())).toMatchObject({
      state: "REFUSED",
      tone: "crit",
      detail: "ECONNREFUSED db01:5432",
    });
    expect(dbAppFamily(t0())).toBe("refused");
    expect(dbPoolView(t0())).toMatchObject({ state: "0 / UNAVAILABLE", tone: "crit" });
  });

  it("connection channel labels the refused TCP path", () => {
    expect(dbConnectionView(t0())).toEqual({
      label: "TCP 5432 → db01 · REFUSED",
      tone: "crit",
      established: false,
    });
  });

  it("service, port and database stay untested until checked", () => {
    expect(dbServiceView(t0())).toMatchObject({ state: "UNTESTED", tone: "unknown" });
    expect(dbPortView(t0())).toMatchObject({ state: "UNTESTED", tone: "unknown" });
    expect(dbDatabaseView(t0())).toMatchObject({ state: "UNTESTED", tone: "unknown" });
  });

  it("host reads UP from the TCP RST evidence, storage is mounted", () => {
    expect(dbHostView(t0())).toMatchObject({ state: "UP", tone: "ok", detail: "answered TCP RST" });
    expect(dbStorageView(t0())).toMatchObject({ state: "MOUNTED", tone: "ok" });
  });

  it("status badge reports the public symptom only", () => {
    expect(dbStatus(t0())).toEqual({ tone: "crit", label: "app connection refused" });
  });

  it("status badge names auth, capacity and filtered families honestly", () => {
    expect(dbStatus({ network: { faults: { authFailed: true } } })).toEqual({
      tone: "crit",
      label: "app auth rejected",
    });
    expect(dbStatus({ db: { poolExhausted: true } })).toEqual({
      tone: "crit",
      label: "app connections exhausted",
    });
    expect(dbStatus({ network: { faults: { portBlocked: true } } })).toEqual({
      tone: "crit",
      label: "app connection timeout",
    });
  });
});

describe("causal evidence progression", () => {
  it("check-port proves the listener is CLOSED (service still untested)", () => {
    const w = checkPort(t0());
    expect(dbPortView(w)).toMatchObject({ state: "CLOSED", tone: "crit" });
    expect(dbServiceView(w)).toMatchObject({ state: "UNTESTED" });
    expect(dbStatus(w)).toEqual({ tone: "crit", label: "5432 closed" });
  });

  it("check-service proves the unit FAILED with the bind error", () => {
    const w = checkService(t0());
    expect(dbServiceView(w)).toMatchObject({
      state: "FAILED",
      tone: "crit",
      detail: "FATAL: could not bind IPv4 address: Address already in use",
    });
    expect(dbPortView(w)).toMatchObject({ state: "UNTESTED" });
    expect(dbStatus(w)).toEqual({ tone: "crit", label: "postgresql failed" });
  });

  it("restart drives RUNNING + LISTENING + READY, app still refused until verified", () => {
    const w = restart(t0());
    expect(dbServiceView(w)).toMatchObject({ state: "RUNNING", tone: "ok" });
    expect(dbPortView(w)).toMatchObject({ state: "LISTENING", tone: "ok", detail: "0.0.0.0:5432" });
    expect(dbDatabaseView(w)).toMatchObject({ state: "READY", tone: "ok" });
    expect(dbHostView(w)).toMatchObject({ state: "UP" });
    expect(dbAppView(w)).toMatchObject({ state: "REFUSED", tone: "crit" });
    expect(dbConnectionView(w).established).toBe(false);
  });

  it("verify completes the chain to CONNECTED / OPEN / ESTABLISHED / healthy", () => {
    const w = verify(restart(t0()));
    expect(dbAppView(w)).toMatchObject({ state: "CONNECTED", tone: "ok" });
    expect(dbPoolView(w)).toMatchObject({ state: "OPEN", tone: "ok" });
    expect(dbConnectionView(w)).toEqual({
      label: "TCP 5432 → db01 · ESTABLISHED",
      tone: "ok",
      established: true,
    });
    expect(dbDatabaseView(w)).toMatchObject({ state: "READY" });
    expect(dbStatus(w)).toEqual({ tone: "ok", label: "app → db healthy" });
  });
});

describe("multi-fault families (architecture not tied to one incident)", () => {
  it("auth fault maps to AUTH ERROR", () => {
    const w: World = {
      ...t0(),
      network: { faults: { authFailed: true } },
    };
    expect(dbAppFamily(w)).toBe("auth");
    expect(dbAppView(w)).toMatchObject({ state: "AUTH ERROR", tone: "crit" });
    expect(dbPoolView(w)).toMatchObject({ state: "0 / UNAVAILABLE" });
  });

  it("capacity fault maps to REJECTED", () => {
    const w: World = { ...t0(), db: { ...(t0().db as object), poolExhausted: true } };
    expect(dbAppFamily(w)).toBe("capacity");
    expect(dbAppView(w)).toMatchObject({ state: "REJECTED", tone: "crit" });
  });

  it("blocked port maps to FILTERED port and TIMEOUT app", () => {
    const w: World = {
      ...checkPort(t0()),
      network: { faults: { portBlocked: true, dbServiceDown: false } },
    };
    expect(dbPortView(w)).toMatchObject({ state: "FILTERED", tone: "crit" });
    expect(dbAppFamily(w)).toBe("filtered");
    expect(dbAppView(w)).toMatchObject({ state: "TIMEOUT" });
  });

  it("disk full maps to FULL storage", () => {
    const w: World = { ...t0(), network: { faults: { diskFull: true } } };
    expect(dbStorageView(w)).toMatchObject({ state: "FULL", tone: "crit" });
  });

  it("host down maps to DOWN host", () => {
    const w: World = { ...t0(), network: { faults: { dbHostDown: true } } };
    expect(dbHostView(w)).toMatchObject({ state: "DOWN", tone: "crit" });
  });

  it("faults reader survives missing network node", () => {
    expect(dbFaults({})).toEqual({});
    expect(dbFaults({ network: null })).toEqual({});
  });
});

describe("service phase mapping", () => {
  it("maps systemd statuses to ops words", () => {
    expect(dbServicePhase("activating")).toMatchObject({ state: "STARTING", tone: "warn" });
    expect(dbServicePhase("active (running)")).toMatchObject({ state: "RUNNING", tone: "ok" });
    expect(dbServicePhase("failed")).toMatchObject({ state: "FAILED", tone: "crit" });
    expect(dbServicePhase("inactive (dead)")).toMatchObject({ state: "STOPPED", tone: "crit" });
    expect(dbServicePhase("")).toMatchObject({ state: "UNKNOWN", tone: "unknown" });
  });

  it("unit lookup finds postgresql and tolerates empty services", () => {
    expect(dbUnit(t0())).toMatchObject({ name: "postgresql", status: "failed" });
    expect(dbUnit({ services: [] })).toBeNull();
  });
});

describe("target identity and logs", () => {
  it("target defaults and explicit values", () => {
    expect(dbTarget({})).toEqual({ host: "db01", port: "5432" });
    expect(dbTarget({ db: { host: "db02", port: "5433" } })).toEqual({
      host: "db02",
      port: "5433",
    });
  });

  it("address is observed from logs, not guessed", () => {
    expect(dbTargetAddress(t0())).toBe("192.168.1.31");
    expect(dbTargetAddress({ logs: [] })).toBeNull();
    expect(dbTargetAddress({ db: { hostAddress: "10.0.0.9" }, logs: [] })).toBe("10.0.0.9");
  });

  it("classifies listener, connection, auth and storage lines", () => {
    expect(
      dbClassifyLog("FATAL: could not bind IPv4 address: Address already in use"),
    ).toMatchObject({ severity: "FATAL", category: "listener" });
    expect(
      dbClassifyLog("connection refused to 192.168.1.31:5432"),
    ).toMatchObject({ severity: "ERROR", category: "connection" });
    expect(
      dbClassifyLog("password authentication failed for user app"),
    ).toMatchObject({ severity: "ERROR", category: "auth" });
    expect(dbClassifyLog("could not write to disk: no space left")).toMatchObject({
      severity: "ERROR",
      category: "storage",
    });
    expect(
      dbClassifyLog("server started, ready to accept connections"),
    ).toMatchObject({ severity: "INFO", category: "startup" });
  });

  it("splits journal source prefix and keeps unstructured lines", () => {
    const logs = dbLogs(t0());
    expect(logs).toHaveLength(2);
    expect(logs[0]).toMatchObject({ source: "app01", severity: "ERROR" });
    expect(logs[1]).toMatchObject({ source: "postgresql", category: "listener" });
    expect(dbLogs({ logs: ["unstructured line"] })[0]).toMatchObject({ source: "kernel" });
  });
});

describe("structural contracts", () => {
  it("exposes all seven ladder layers with tone marks", () => {
    expect(DB_LAYERS).toEqual(["app", "pool", "host", "service", "port", "database", "storage"]);
    expect(DB_TONE_MARK).toEqual({ ok: "✓", warn: "!", crit: "✗", unknown: "?" });
    const views = dbLayerViews(t0());
    expect(Object.keys(views)).toEqual([...DB_LAYERS]);
    for (const id of DB_LAYERS) {
      expect(typeof views[id].state).toBe("string");
      expect(views[id].state).toBe(views[id].state.toUpperCase());
      expect(views[id].detail.length).toBeGreaterThan(0);
    }
  });
});
