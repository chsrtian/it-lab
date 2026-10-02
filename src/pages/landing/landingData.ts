import { getScenario, getScenarios } from "@/content";
import {
  DOMAINS,
  ENVIRONMENT_LABEL,
  disciplineLabel,
  type Category,
} from "@/content/domainMeta";
import type { ComponentType } from "react";

/**
 * Landing-page content (Phase 15B).
 *
 * Everything a visitor reads here is derived from the real catalog:
 * discipline rows, counts, incident titles, symptoms and environments come
 * from `getScenarios()`; the three demo cases pull their ticket/title/
 * symptom from their actual scenario records. The step-by-step probe lines
 * are the verbatim engine feedback of those scenarios' own actions — this
 * module adds presentation, never new facts.
 */

export type DemoDomainId = "hardware" | "networking" | "linux";
export type DemoPhase = "observe" | "trace" | "verify";

export const DEMO_DOMAINS: readonly DemoDomainId[] = [
  "hardware",
  "networking",
  "linux",
];

export const DEMO_PHASES: readonly DemoPhase[] = ["observe", "trace", "verify"];

/** Demo loop timing (Phase 15B.1) — each phase dwells long enough to read. */
export const PHASE_DURATION_MS: Record<DemoPhase, number> = {
  observe: 3000,
  trace: 3000,
  verify: 3000,
};

/** Brief hold on the resolved case before the cycle restarts. */
export const LOOP_PAUSE_MS = 1400;

/** After a manual phase pick, the visitor drives the demo for this long. */
export const MANUAL_HOLD_MS = 10000;

/** Next phase of the autonomous observe → trace → verify loop. */
export function nextDemoPhase(phase: DemoPhase): DemoPhase {
  if (phase === "observe") return "trace";
  if (phase === "trace") return "verify";
  return "observe";
}

/** Header status chip wording per phase (text, never colour alone). */
export const PHASE_STATUS: Record<DemoPhase, string> = {
  observe: "collecting",
  trace: "tracing",
  verify: "verifying",
};

export const PHASE_LABEL: Record<DemoPhase, string> = {
  observe: "Observe",
  trace: "Trace",
  verify: "Verify",
};

/** Work-order strip state as the story advances (product vocabulary). */
export const PHASE_CASE_STATE: Record<
  DemoPhase,
  { mark: "open" | "active" | "verified"; word: string }
> = {
  observe: { mark: "open", word: "Open" },
  trace: { mark: "active", word: "In progress" },
  verify: { mark: "verified", word: "Verified" },
};

/** The catalog's three demo scenarios (one per selectable discipline). */
const DEMO_SCENARIO_IDS: Record<DemoDomainId, string> = {
  hardware: "pc-no-power",
  networking: "dns-some-sites-broken",
  linux: "linux-permission-denied",
};

export interface DemoCase {
  id: DemoDomainId;
  category: Category;
  discipline: string;
  scenarioId: string;
  ticketId: string;
  incidentTitle: string;
  symptom: string;
  environment: string;
}

/** Demo cases assembled from the live scenario records (no copied copy). */
export function getDemoCases(): DemoCase[] {
  return DEMO_DOMAINS.map((id) => {
    const scenario = getScenario(DEMO_SCENARIO_IDS[id]);
    if (!scenario) {
      throw new Error(
        `Landing demo references missing scenario: ${DEMO_SCENARIO_IDS[id]}`,
      );
    }
    return {
      id,
      category: scenario.category,
      discipline: disciplineLabel(scenario.category),
      scenarioId: scenario.id,
      ticketId: scenario.ticket.id,
      incidentTitle: scenario.title,
      symptom: scenario.ticket.symptomPlainLanguage,
      environment:
        ENVIRONMENT_LABEL[scenario.environment.kind] ?? scenario.environment.kind,
    };
  });
}

/* ------------------------------------------------------------------ */
/* Stage content — verbatim engine feedback from the demo scenarios   */
/* ------------------------------------------------------------------ */

export type ChainState = "dead" | "ok" | "fault" | "pending";
export type LogMark = "ok" | "fault" | "pending";
export type LogKind = "cmd" | "out" | "note" | "fix";

/**
 * One row of the stage log:
 * - `cmd` — a shell command (rendered with the lab prompt, mono)
 * - `out` — raw command output (mono, no prompt)
 * - `note` — a readable result/evidence sentence (sans, optional state mark)
 * - `fix` — an applied fix action label (mono, tagged)
 */
export interface DemoLogRow {
  kind: LogKind;
  mark?: LogMark;
  text: string;
}

export interface FileRow {
  path: string;
  meta: string;
}

interface PhaseContent {
  lines?: readonly DemoLogRow[];
  file?: FileRow;
}

export interface HardwareStage {
  kind: "hardware";
  chain: readonly string[];
  states: Record<DemoPhase, readonly ChainState[]>;
  phases: Record<DemoPhase, PhaseContent>;
}

export interface NetworkNode {
  id: "pc" | "gw" | "inet" | "dns";
  label: string;
  sub: string;
  x: number;
  y: number;
}

export type EdgeState = "untested" | "ok" | "fault";

export interface NetworkStage {
  kind: "networking";
  nodes: readonly NetworkNode[];
  edges: readonly { key: string; from: NetworkNode["id"]; to: NetworkNode["id"] }[];
  states: Record<DemoPhase, Record<string, EdgeState>>;
  phases: Record<DemoPhase, PhaseContent>;
}

export interface LinuxStage {
  kind: "linux";
  chain: readonly string[];
  states: Record<DemoPhase, readonly ChainState[]>;
  phases: Record<DemoPhase, PhaseContent>;
}

export type DemoStage = HardwareStage | NetworkStage | LinuxStage;

const HARDWARE_CHAIN = ["Wall", "Cable", "PSU", "Front panel", "POST"] as const;

const HARDWARE_STAGE: HardwareStage = {
  kind: "hardware",
  chain: HARDWARE_CHAIN,
  states: {
    observe: ["dead", "dead", "dead", "dead", "dead"],
    trace: ["ok", "ok", "ok", "fault", "dead"],
    verify: ["ok", "ok", "ok", "ok", "ok"],
  },
  phases: {
    observe: {},
    trace: {
      lines: [
        {
          kind: "note",
          mark: "ok",
          text: "Outlet strip switch was off — power restored to the cable.",
        },
        {
          kind: "note",
          mark: "ok",
          text: "Cable is fully seated at the PSU and the strip end.",
        },
        {
          kind: "note",
          mark: "fault",
          text: "The case power button cable was loose on the motherboard header.",
        },
      ],
    },
    verify: {
      lines: [{ kind: "note", mark: "ok", text: "Fans spin, LEDs on, system POSTs." }],
    },
  },
};

const NETWORK_NODES: readonly NetworkNode[] = [
  { id: "pc", label: "DESKTOP-ALEX", sub: "192.168.1.50", x: 58, y: 54 },
  { id: "gw", label: "Gateway", sub: "192.168.1.1", x: 170, y: 54 },
  { id: "inet", label: "Internet", sub: "8.8.8.8", x: 282, y: 54 },
  { id: "dns", label: "DNS resolver", sub: "lookups", x: 58, y: 138 },
];

const NETWORK_STAGE: NetworkStage = {
  kind: "networking",
  nodes: NETWORK_NODES,
  edges: [
    { key: "pc-gw", from: "pc", to: "gw" },
    { key: "gw-inet", from: "gw", to: "inet" },
    { key: "pc-dns", from: "pc", to: "dns" },
  ],
  states: {
    observe: { "pc-gw": "untested", "gw-inet": "untested", "pc-dns": "untested" },
    trace: { "pc-gw": "ok", "gw-inet": "ok", "pc-dns": "fault" },
    verify: { "pc-gw": "ok", "gw-inet": "ok", "pc-dns": "ok" },
  },
  phases: {
    observe: {},
    trace: {
      lines: [
        { kind: "cmd", text: "ping 192.168.1.1" },
        { kind: "note", mark: "ok", text: "Gateway responds — local network path is healthy." },
        { kind: "cmd", text: "ping 8.8.8.8" },
        { kind: "note", mark: "ok", text: "Public IP responds — routing to internet works." },
        { kind: "cmd", text: "nslookup example.com" },
        { kind: "note", mark: "fault", text: "nslookup times out — DNS server unreachable." },
      ],
    },
    verify: {
      lines: [
        { kind: "fix", text: "Point DNS to working secondary (1.1.1.1)" },
        { kind: "note", mark: "ok", text: "Adapter now uses a reachable DNS resolver." },
        { kind: "fix", text: "Resolve and open a new site" },
        { kind: "note", mark: "ok", text: "New hostname resolves; page loads." },
      ],
    },
  },
};

const LINUX_CHAIN = ["devon", "config.yaml", "deploy write"] as const;

const LINUX_STAGE: LinuxStage = {
  kind: "linux",
  chain: LINUX_CHAIN,
  states: {
    observe: ["pending", "pending", "fault"],
    trace: ["ok", "fault", "pending"],
    verify: ["ok", "ok", "ok"],
  },
  phases: {
    observe: {
      file: { path: "/etc/myapp/config.yaml", meta: "600 · root:root" },
      lines: [
        {
          kind: "note",
          mark: "fault",
          text: "Deploy script fails: Permission denied on /etc/myapp/config.yaml",
        },
      ],
    },
    trace: {
      lines: [
        { kind: "cmd", text: "whoami" },
        { kind: "out", text: "devon" },
        { kind: "cmd", text: "ls -l /etc/myapp/config.yaml" },
        { kind: "out", text: "-rw------- 1 root root 27 config.yaml" },
        {
          kind: "note",
          mark: "fault",
          text: "config.yaml is root:root mode 600 — devon cannot write it.",
        },
      ],
    },
    verify: {
      file: { path: "/etc/myapp/config.yaml", meta: "660 · root:app" },
      lines: [
        { kind: "fix", text: "Set config group-writable mode 660" },
        { kind: "out", text: "-rw-rw---- 1 root app 27 config.yaml" },
        {
          kind: "note",
          mark: "ok",
          text: "Mode changed to 660 root:app (owner+group write) — better than 777.",
        },
        { kind: "note", mark: "ok", text: "Deploy write test succeeded." },
      ],
    },
  },
};

export const DEMO_STAGES: Record<DemoDomainId, DemoStage> = {
  hardware: HARDWARE_STAGE,
  networking: NETWORK_STAGE,
  linux: LINUX_STAGE,
};

/* ------------------------------------------------------------------ */
/* Discipline register — active (scenario-bearing) disciplines only    */
/* ------------------------------------------------------------------ */

export interface DisciplineRow {
  id: Category;
  label: string;
  tagline: string;
  icon: ComponentType<{ size?: number; className?: string }>;
  count: number;
  example: string;
  exampleScenarioId: string;
}

/**
 * The disciplines the catalog actually serves: DOMAINS filtered to the
 * categories that carry scenarios (metadata-only domains such as an unused
 * "cloud" entry never reach the page), with one real example incident each —
 * the first scenario of that discipline in catalog order.
 */
export function getActiveDisciplines(): DisciplineRow[] {
  const scenarios = getScenarios();
  return DOMAINS.map((d) => {
    const items = scenarios.filter((s) => s.category === d.id);
    const first = items[0];
    return {
      id: d.id,
      label: d.label,
      tagline: d.tagline,
      icon: d.icon,
      count: items.length,
      example: first ? first.ticket.symptomPlainLanguage : "",
      exampleScenarioId: first ? first.id : "",
    };
  }).filter((d) => d.count > 0);
}

/* ------------------------------------------------------------------ */
/* Method + guided walkthrough (grounded copy)                          */
/* ------------------------------------------------------------------ */

/** The method, phrased the way the product's own debriefs phrase it. */
export const METHOD_STEPS: readonly { title: string; text: string }[] = [
  {
    title: "Investigate",
    text: "Open the incident and read what the user actually reports — before touching a single setting.",
  },
  {
    title: "Gather evidence",
    text: "Run the checks, probes and commands the lab offers; the workspace records what they return.",
  },
  {
    title: "Diagnose",
    text: "Test hypotheses against the evidence until one cause explains the whole symptom.",
  },
  {
    title: "Fix",
    text: "Apply the smallest change that matches what you found — parts-swapping without evidence is scored against you.",
  },
  {
    title: "Verify",
    text: "Re-run the failing operation. Skipping verification is how “fixed it” becomes a ticket reopen.",
  },
];

/** A real step from the guided walkthrough of linux-permission-denied. */
export const GUIDE_EXAMPLE = {
  scenarioTitle: "Permission denied writing config",
  stepTitle: "Read the file's mode and owner",
  target: "/etc/myapp/config.yaml in the file tree",
  what: "List the config file with its permissions, in the file view or the terminal.",
  why: "Mode and ownership tell you which permission class is blocking the write.",
  lookFor: "The mode string, owner, and group shown for config.yaml.",
} as const;
