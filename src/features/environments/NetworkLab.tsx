import { Suspense, lazy, useMemo, useState } from "react";
import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { availableActions } from "@/engine";
import { LabSection } from "@/features/env/LabSection";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Network,
  Router,
  Search,
  Server,
  Terminal as TerminalIcon,
  Wifi,
  WifiOff,
  Wrench,
  X,
  XCircle,
} from "lucide-react";
import {
  NET_HEALTH_LABEL,
  NET_HEALTH_MARK,
  NET_NODE_IDS,
  NET_ROUTES,
  netHost,
  netLinkEndpoints,
  netLinkShortLabel,
  netLinkState,
  netNodeState,
  netStatus,
  type NetHealth,
  type NetLinkId,
  type NetNodeId,
} from "@/features/network/netState";

const NetworkTopology = lazy(() =>
  import("@/features/network/NetworkTopology").then((m) => ({ default: m.NetworkTopology })),
);

type NetSelection =
  | { kind: "node"; id: NetNodeId }
  | { kind: "link"; id: NetLinkId }
  | null;

const NODE_SHORT: Record<NetNodeId, string> = {
  host: "CLIENT",
  gateway: "GATEWAY",
  dhcp: "DHCP",
  dns: "RESOLVER",
  internet: "WAN",
};

const NODE_TITLE: Record<NetNodeId, string> = {
  host: "Workstation",
  gateway: "Default gateway",
  dhcp: "DHCP server",
  dns: "DNS resolver",
  internet: "Internet / WAN",
};

const NODE_BLURB: Record<NetNodeId, { blurb: string; kb?: string }> = {
  host: {
    blurb: "Client NIC, IP, gateway, and DNS settings live here.",
    kb: "ip-addressing-basics",
  },
  gateway: {
    blurb: "Routes traffic off the local subnet. No gateway means no off-LAN reachability.",
    kb: "gateway-vs-dns",
  },
  dhcp: {
    blurb: "Hands out IP, mask, gateway, and DNS leases to clients.",
    kb: "ip-addressing-basics",
  },
  dns: {
    blurb: "Turns names into IPs. Failures block new sites while cached ones still open.",
    kb: "what-is-dns",
  },
  internet: {
    blurb: "Upstream path beyond the gateway. Test with raw IP before blaming DNS.",
    kb: "gateway-vs-dns",
  },
};

function nodeIcon(id: NetNodeId, health: NetHealth) {
  if (id === "gateway") return <Router size={14} aria-hidden />;
  if (id === "internet")
    return health === "healthy" ? (
      <Wifi size={14} aria-hidden />
    ) : (
      <WifiOff size={14} aria-hidden />
    );
  return <Server size={14} aria-hidden />;
}

function healthMark(health: NetHealth) {
  if (health === "healthy") return <CheckCircle2 size={12} aria-hidden />;
  if (health === "unknown") return <HelpCircle size={12} aria-hidden />;
  if (health === "degraded") return <AlertTriangle size={12} aria-hidden />;
  return <XCircle size={12} aria-hidden />;
}

function getPath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

function nodeFacts(
  world: Record<string, unknown>,
  id: NetNodeId,
): { label: string; value: string }[] {
  const host = netHost(world);
  const zones = getPath(world, "dnsZones");
  const pool = getPath(world, "dhcpServer.pool");
  switch (id) {
    case "host":
      return [
        { label: "Interface", value: "Ethernet0" },
        { label: "IP", value: host?.ips.join(", ") || "—" },
        { label: "MAC", value: String(getPath(world, "hosts.0.mac") ?? "—") },
        { label: "Gateway", value: host?.gateway || "—" },
        { label: "DNS", value: host?.dns.join(", ") || "—" },
      ];
    case "gateway":
      return [
        { label: "Interfaces", value: "lan0 · wan0" },
        { label: "LAN IP", value: host?.gateway || "—" },
        { label: "Role", value: "default route" },
      ];
    case "dhcp":
      return [
        { label: "Interface", value: "eth0" },
        { label: "Ports", value: "67/UDP · 68/UDP" },
        { label: "Pool", value: typeof pool === "string" ? pool : "—" },
      ];
    case "dns":
      return [
        { label: "Interface", value: "eth0" },
        { label: "Ports", value: "53/UDP · 53/TCP" },
        { label: "Resolver", value: host?.dns[0] ?? "—" },
        ...Object.entries(
          zones && typeof zones === "object" ? (zones as Record<string, string>) : {},
        ).slice(0, 4).map(([name, ip]) => ({
          label: "Zone",
          value: `${name} → ${ip}`,
        })),
      ];
    case "internet":
      return [
        { label: "Uplink", value: host?.gateway ? `via ${host.gateway}` : "—" },
        { label: "Probe target", value: "8.8.8.8" },
      ];
    default:
      return [];
  }
}

export interface NetworkLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
}

export function NetworkLab({
  scenario,
  run,
  onInspect,
  onOpenKb,
}: NetworkLabProps) {
  const [sel, setSel] = useState<NetSelection>(null);
  const selectNode = (id: NetNodeId | null) =>
    setSel(id ? { kind: "node", id } : null);
  const selectLink = (id: NetLinkId | null) =>
    setSel(id ? { kind: "link", id } : null);

  const world = run.world;
  const status = netStatus(world);

  const probeSteps = useMemo(
    () => scenario.actions.filter((a) => a.isDiagnostic).slice(0, 4),
    [scenario.actions],
  );

  const affects = (actionComponent: string | undefined, target: string | undefined) =>
    (sel?.kind === "node" && (actionComponent === sel.id || target === sel.id)) ||
    (sel?.kind === "link" &&
      (actionComponent === netLinkEndpoints(sel.id).a ||
        actionComponent === netLinkEndpoints(sel.id).b ||
        target === netLinkEndpoints(sel.id).a ||
        target === netLinkEndpoints(sel.id).b));

  const nodeActions =
    sel?.kind === "node"
      ? availableActions(scenario, run).filter(
          (a) => a.component === sel.id || a.inspectTarget === sel.id,
        )
      : [];

  const evidence =
    sel === null
      ? []
      : scenario.actions
          .filter((a) => run.appliedActions.includes(a.id))
          .filter((a) => affects(a.component, a.inspectTarget));

  const selectedNode = sel?.kind === "node" ? sel.id : null;
  const route = selectedNode ? NET_ROUTES[selectedNode] : null;

  return (
    <LabSection
      aria-label="Network operations"
      data-testid="network-lab"
      title={
        <span className="inline-flex items-center gap-1.5">
          <Network size={14} aria-hidden className="text-lab-accent" />
          Network operations
        </span>
      }
      subtitle="workstation · gateway · dhcp · dns · internet"
      status={status}
    >
      <div className="net-body">
        <div className="net-stage-wrap">
          <Suspense
            fallback={<div className="topology-fallback">Loading topology…</div>}
          >
            <NetworkTopology
              world={world}
              selectedNode={selectedNode}
              selectedLink={sel?.kind === "link" ? sel.id : null}
              onSelect={selectNode}
              onSelectLink={selectLink}
            />
          </Suspense>

          {/* Diagnostic probe chain — the investigation, shown as it happens */}
          <div className="net-probes" role="status" aria-label="Diagnostic probes">
            <span className="net-probes-label" aria-hidden>
              PROBES
            </span>
            {probeSteps.map((a) => {
              const done = run.appliedActions.includes(a.id);
              const node = a.component as NetNodeId | undefined;
              const title = done
                ? a.evaluation?.evidenceGain ?? a.feedback ?? a.label
                : a.label;
              const body = (
                <>
                  {done ? (
                    <CheckCircle2 size={11} aria-hidden className="text-emerald-400" />
                  ) : (
                    <HelpCircle size={11} aria-hidden className="text-lab-faint" />
                  )}
                  <span className="net-probe-text">{a.label}</span>
                </>
              );
              if (!node) {
                return (
                  <span
                    key={a.id}
                    className={`net-probe${done ? " is-done" : ""}`}
                    title={title}
                  >
                    {body}
                  </span>
                );
              }
              return (
                <button
                  key={a.id}
                  type="button"
                  className={`net-probe${done ? " is-done" : ""}`}
                  title={title}
                  aria-pressed={selectedNode === node}
                  onClick={() => selectNode(selectedNode === node ? null : node)}
                >
                  {body}
                </button>
              );
            })}
          </div>

          {/* Health legend + keyboard device quick-select (mouse is never the only path) */}
          <div className="net-stage-legend">
            <div className="net-legend-row" aria-hidden>
              {(["unknown", "healthy", "degraded", "failed"] as NetHealth[]).map(
                (h) => (
                  <span key={h} className="net-legend-item">
                    {healthMark(h)}
                    {NET_HEALTH_LABEL[h]}
                  </span>
                ),
              )}
            </div>
            <div className="net-chips">
              {NET_NODE_IDS.map((id) => {
                const view = netNodeState(world, id);
                return (
                  <button
                    key={id}
                    type="button"
                    className={`net-chip${selectedNode === id ? " is-on" : ""}`}
                    aria-pressed={selectedNode === id}
                    title={`${NODE_TITLE[id]}: ${NET_HEALTH_LABEL[view.health]} — ${view.reason}`}
                    onClick={() => selectNode(selectedNode === id ? null : id)}
                  >
                    {healthMark(view.health)}
                    {NODE_SHORT[id]}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Contextual inspector — only while something is selected */}
          {sel !== null && (
            <aside
              className="net-inspector"
              aria-label={
                sel.kind === "node" ? "Device inspector" : "Link inspector"
              }
            >
              <header className="net-inspector-head">
                {sel.kind === "node" ? (
                  <>
                    <span className="net-inspector-icon">
                      {nodeIcon(sel.id, netNodeState(world, sel.id).health)}
                    </span>
                    <span className="net-inspector-names">
                      <span className="net-inspector-role">{NODE_SHORT[sel.id]}</span>
                      <span className="net-inspector-title">
                        {NODE_TITLE[sel.id]}
                      </span>
                    </span>
                  </>
                ) : (
                  <>
                    <span className="net-inspector-icon">
                      <Network size={14} aria-hidden />
                    </span>
                    <span className="net-inspector-names">
                      <span className="net-inspector-role">LINK</span>
                      <span className="net-inspector-title">
                        {netLinkShortLabel(sel.id)} segment
                      </span>
                    </span>
                  </>
                )}
                <button
                  type="button"
                  className="net-inspector-close"
                  aria-label="Close inspector"
                  onClick={() => setSel(null)}
                >
                  <X size={13} aria-hidden />
                </button>
              </header>

              {sel.kind === "node" && (
                <>
                  <div className="net-kv">
                    <div className="net-kv-label">Status</div>
                    <div className="net-status-line">
                      {(() => {
                        const view = netNodeState(world, sel.id);
                        return (
                          <>
                            <span className="net-status-icon">
                              {healthMark(view.health)}
                            </span>
                            <span>
                              {NET_HEALTH_LABEL[view.health]} — {view.reason}
                            </span>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  <div className="net-kv">
                    <div className="net-kv-label">Details</div>
                    <dl className="net-facts">
                      {nodeFacts(world, sel.id).map((f) => (
                        <div key={f.label + f.value} className="net-fact-row">
                          <dt>{f.label}</dt>
                          <dd>{f.value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {route && (
                    <div className="net-kv">
                      <div className="net-kv-label">Path</div>
                      <div className="net-hops">
                        {route.nodes.map((hop, i) => {
                          const hopView = netNodeState(world, hop);
                          return (
                            <span key={hop} className="net-hops-seg">
                              <button
                                type="button"
                                className="net-hop"
                                aria-pressed={selectedNode === hop}
                                title={`${NODE_TITLE[hop]}: ${NET_HEALTH_LABEL[hopView.health]} — ${hopView.reason}`}
                                onClick={() => selectNode(hop)}
                              >
                                {healthMark(hopView.health)}
                                {NODE_SHORT[hop]}
                              </button>
                              {i > 0 && (
                                <span
                                  className="net-hop-link"
                                  title={
                                    netLinkState(world, route.links[i - 1]).reason
                                  }
                                >
                                  {NET_HEALTH_MARK[
                                    netLinkState(world, route.links[i - 1]).health
                                  ]}
                                </span>
                              )}
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="net-kv">
                    <div className="net-kv-label">
                      Evidence ({evidence.length})
                    </div>
                    {evidence.length === 0 ? (
                      <p className="net-empty">
                        No probes run against this device yet.
                      </p>
                    ) : (
                      <ul className="net-evidence">
                        {evidence.map((a) => (
                          <li key={a.id}>
                            <span aria-hidden className="net-evidence-mark">
                              ✓
                            </span>
                            <span>
                              <span className="net-evidence-label">{a.label}</span>
                              <span className="net-evidence-text">
                                {a.evaluation?.evidenceGain ??
                                  a.feedback ??
                                  "recorded"}
                              </span>
                            </span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>

                  {nodeActions.length > 0 && (
                    <div className="net-kv">
                      <div className="net-kv-label">Node interactions</div>
                      <div className="net-actions">
                        {nodeActions.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            className="btn-secondary net-action-btn"
                            onClick={() => onInspect(a.id)}
                          >
                            {a.kind === "terminal" ? (
                              <TerminalIcon size={12} aria-hidden />
                            ) : a.kind === "inspect" ? (
                              <Search size={12} aria-hidden />
                            ) : (
                              <Wrench size={12} aria-hidden />
                            )}
                            <span className="truncate">{a.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {NODE_BLURB[sel.id].kb && (
                    <button
                      type="button"
                      className="net-learn-btn"
                      onClick={() => onOpenKb?.(NODE_BLURB[sel.id].kb!)}
                    >
                      Learn: {NODE_TITLE[sel.id]}
                    </button>
                  )}
                </>
              )}

              {sel.kind === "link" && (() => {
                const { a: aId, b: bId } = netLinkEndpoints(sel.id);
                const view = netLinkState(world, sel.id);
                const host = netHost(world);
                const endpoint = (id: NetNodeId): { name: string; iface: string; ip: string } => {
                  const name = id === "host" ? host?.name ?? "Client" : NODE_TITLE[id];
                  const iface =
                    id === "host"
                      ? "Ethernet0"
                      : id === "gateway"
                        ? "lan0"
                        : id === "dhcp"
                          ? "eth0"
                          : id === "dns"
                            ? "eth0"
                            : "wan0";
                  const ip =
                    id === "host"
                      ? host?.ips.join(", ") || "—"
                      : id === "gateway"
                        ? host?.gateway || "—"
                        : id === "dns"
                          ? host?.dns[0] ?? "—"
                          : "—";
                  return { name, iface, ip };
                };
                const ea = endpoint(aId);
                const eb = endpoint(bId);
                return (
                  <>
                    <div className="net-kv">
                      <div className="net-kv-label">Endpoints</div>
                      <dl className="net-facts">
                        <div className="net-fact-row">
                          <dt>A</dt>
                          <dd>
                            {ea.name} · {ea.iface} · {ea.ip}
                          </dd>
                        </div>
                        <div className="net-fact-row">
                          <dt>B</dt>
                          <dd>
                            {eb.name} · {eb.iface} · {eb.ip}
                          </dd>
                        </div>
                      </dl>
                    </div>
                    <div className="net-kv">
                      <div className="net-kv-label">State</div>
                      <div className="net-status-line">
                        <span className="net-status-icon">{healthMark(view.health)}</span>
                        <span>
                          {NET_HEALTH_LABEL[view.health]} — {view.reason}
                        </span>
                      </div>
                    </div>
                    <div className="net-kv">
                      <div className="net-kv-label">Evidence ({evidence.length})</div>
                      {evidence.length === 0 ? (
                        <p className="net-empty">
                          No probes have exercised this link yet.
                        </p>
                      ) : (
                        <ul className="net-evidence">
                          {evidence.map((a) => (
                            <li key={a.id}>
                              <span aria-hidden className="net-evidence-mark">
                                ✓
                              </span>
                              <span>
                                <span className="net-evidence-label">{a.label}</span>
                                <span className="net-evidence-text">
                                  {a.evaluation?.evidenceGain ??
                                    a.feedback ??
                                    "recorded"}
                                </span>
                              </span>
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                    <div className="net-actions">
                      <button
                        type="button"
                        className="btn-secondary net-action-btn"
                        onClick={() => selectNode(aId)}
                      >
                        <Server size={12} aria-hidden />
                        Inspect {NODE_SHORT[aId]}
                      </button>
                      <button
                        type="button"
                        className="btn-secondary net-action-btn"
                        onClick={() => selectNode(bId)}
                      >
                        <Server size={12} aria-hidden />
                        Inspect {NODE_SHORT[bId]}
                      </button>
                    </div>
                  </>
                );
              })()}
            </aside>
          )}
        </div>
      </div>
    </LabSection>
  );
}
