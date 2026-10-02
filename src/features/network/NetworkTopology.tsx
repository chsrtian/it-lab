import { useEffect, useMemo } from "react";
import {
  Background,
  BackgroundVariant,
  Controls,
  MarkerType,
  Position,
  ReactFlow,
  type Edge,
  type Node,
} from "@xyflow/react";
import "@xyflow/react/dist/base.css";
import {
  AlertTriangle,
  CheckCircle2,
  HelpCircle,
  Router,
  Server,
  Wifi,
  WifiOff,
  XCircle,
} from "lucide-react";
import {
  NET_HEALTH_LABEL,
  NET_HEALTH_MARK,
  NET_LINK_META,
  netHost,
  netLinkState,
  netNodeState,
  type NetHealth,
  type NetLinkId,
  type NetNodeId,
} from "./netState";

export interface NetworkTopologyProps {
  world: Record<string, unknown>;
  selectedNode?: string | null;
  selectedLink?: string | null;
  onSelect?: (id: NetNodeId | null) => void;
  onSelectLink?: (id: NetLinkId | null) => void;
}

const HEALTH_COLOR: Record<NetHealth, string> = {
  healthy: "#3fa66a",
  degraded: "#c9973f",
  failed: "#d45b5b",
  unknown: "#64748b",
};

const LINK_STROKE: Record<NetHealth, string> = {
  healthy: "#3fa66a",
  degraded: "#c9973f",
  failed: "#d45b5b",
  unknown: "#3d4a63",
};

const LINK_DASH: Record<NetHealth, string | undefined> = {
  healthy: undefined,
  degraded: "7 4",
  failed: undefined,
  unknown: "5 6",
};

function healthIcon(health: NetHealth, size = 12) {
  const color = HEALTH_COLOR[health];
  if (health === "healthy") return <CheckCircle2 size={size} aria-hidden color={color} />;
  if (health === "failed") return <XCircle size={size} aria-hidden color={color} />;
  if (health === "degraded") return <AlertTriangle size={size} aria-hidden color={color} />;
  return <HelpCircle size={size} aria-hidden color={color} />;
}

/** Equipment-style node chrome: rack silhouette, status icon + text (never color alone). */
function nodeStyle(health: NetHealth, selected: boolean, dimmed: boolean): React.CSSProperties {
  return {
    background: "#0f172a",
    border: `1px solid ${selected ? "#e2560f" : HEALTH_COLOR[health]}`,
    borderRadius: 2,
    padding: "0",
    color: "#e2e8f0",
    fontSize: 12,
    minWidth: 172,
    outline: selected ? "2px solid rgba(56, 189, 248, 0.35)" : "none",
    outlineOffset: 1,
    cursor: "pointer",
    opacity: dimmed ? 0.45 : 1,
    transition: "opacity 140ms ease, border-color 140ms ease",
  };
}

function NodeLabel({
  title,
  icon,
  health,
  reason,
  role,
  detail,
}: {
  title: string;
  icon: React.ReactNode;
  health: NetHealth;
  reason: string;
  role: string;
  detail?: string;
}) {
  const c = HEALTH_COLOR[health];
  return (
    <div className="equip-node">
      <div className="equip-node-strip" style={{ background: c }} aria-hidden />
      <div className="equip-node-body">
        <div className="equip-node-role">{role}</div>
        <div className="equip-node-title">
          {icon}
          <span>{title}</span>
        </div>
        {detail && <div className="equip-node-detail">{detail}</div>}
        <div className="equip-node-health" style={{ color: c }}>
          {healthIcon(health, 11)}
          <span>
            {NET_HEALTH_LABEL[health]} · {reason}
          </span>
        </div>
      </div>
      <div className="equip-node-ports" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span key={i} className="equip-port" />
        ))}
      </div>
    </div>
  );
}

export function NetworkTopology({
  world,
  selectedNode,
  selectedLink,
  onSelect,
  onSelectLink,
}: NetworkTopologyProps) {
  const host = netHost(world);
  const routeLinks = useMemo(() => {
    if (!selectedNode) return null;
    const set = new Set<NetLinkId>();
    if (selectedNode === "host") {
      set.add("host-gateway");
      set.add("host-dhcp");
    } else if (selectedNode === "gateway") set.add("host-gateway");
    else if (selectedNode === "dhcp") set.add("host-dhcp");
    else if (selectedNode === "dns") {
      set.add("host-gateway");
      set.add("gateway-dns");
    } else if (selectedNode === "internet") {
      set.add("host-gateway");
      set.add("gateway-internet");
    }
    return set;
  }, [selectedNode]);

  const nodes = useMemo<Node[]>(() => {
    const state = (id: NetNodeId) => netNodeState(world, id);
    const inRoute = (id: NetNodeId) =>
      routeLinks === null ? true : [...routeLinks].some((l) => NET_LINK_META[l].a === id || NET_LINK_META[l].b === id) || id === selectedNode;
    const list: Node[] = [];

    const hs = state("host");
    list.push({
      id: "host",
      position: { x: 20, y: 110 },
      data: {
        label: (
          <NodeLabel
            role="CLIENT"
            title={host?.name ?? "Workstation"}
            icon={<Server size={13} aria-hidden />}
            health={hs.health}
            reason={hs.reason}
            detail={host?.ips.join(", ") || "no IP"}
          />
        ),
      },
      style: nodeStyle(hs.health, selectedNode === "host", !inRoute("host")),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const gs = state("gateway");
    list.push({
      id: "gateway",
      position: { x: 320, y: 20 },
      data: {
        label: (
          <NodeLabel
            role="EDGE"
            title="Gateway"
            icon={<Router size={13} aria-hidden />}
            health={gs.health}
            reason={gs.reason}
            detail={host?.gateway || "no gateway"}
          />
        ),
      },
      style: nodeStyle(gs.health, selectedNode === "gateway", !inRoute("gateway")),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const ds = state("dhcp");
    list.push({
      id: "dhcp",
      position: { x: 320, y: 215 },
      data: {
        label: (
          <NodeLabel
            role="LAN"
            title="DHCP"
            icon={<Server size={13} aria-hidden />}
            health={ds.health}
            reason={ds.reason}
          />
        ),
      },
      style: nodeStyle(ds.health, selectedNode === "dhcp", !inRoute("dhcp")),
      sourcePosition: Position.Right,
      targetPosition: Position.Left,
    });

    const rs = state("dns");
    list.push({
      id: "dns",
      position: { x: 620, y: 20 },
      data: {
        label: (
          <NodeLabel
            role="RESOLVER"
            title="DNS"
            icon={<Server size={13} aria-hidden />}
            health={rs.health}
            reason={rs.reason}
            detail={host?.dns.join(", ") || "no resolver"}
          />
        ),
      },
      style: nodeStyle(rs.health, selectedNode === "dns", !inRoute("dns")),
      sourcePosition: Position.Left,
      targetPosition: Position.Left,
    });

    const ws = state("internet");
    list.push({
      id: "internet",
      position: { x: 620, y: 215 },
      data: {
        label: (
          <NodeLabel
            role="WAN"
            title="Internet"
            icon={
              ws.health === "healthy" ? (
                <Wifi size={13} aria-hidden />
              ) : (
                <WifiOff size={13} aria-hidden />
              )
            }
            health={ws.health}
            reason={ws.reason}
          />
        ),
      },
      style: nodeStyle(ws.health, selectedNode === "internet", !inRoute("internet")),
      sourcePosition: Position.Left,
      targetPosition: Position.Left,
    });

    return list;
  }, [world, host, selectedNode, routeLinks]);

  const edges = useMemo<Edge[]>(() => {
    const ids: NetLinkId[] = ["host-gateway", "host-dhcp", "gateway-dns", "gateway-internet"];
    return ids.map((id) => {
      const view = netLinkState(world, id);
      const selected = selectedLink === id;
      const onRoute = routeLinks?.has(id) ?? false;
      const dimmed = routeLinks !== null && !onRoute && !selected;
      return {
        id,
        source: NET_LINK_META[id].a,
        target: NET_LINK_META[id].b,
        label: `${NET_LINK_META[id].short} ${NET_HEALTH_MARK[view.health]}`,
        style: {
          stroke: selected ? "#e2560f" : LINK_STROKE[view.health],
          strokeWidth: selected ? 3 : onRoute ? 2.5 : 2,
          strokeDasharray: LINK_DASH[view.health],
          opacity: dimmed ? 0.3 : 1,
          transition: "opacity 140ms ease, stroke-width 140ms ease",
        },
        markerEnd: { type: MarkerType.ArrowClosed, width: 14, height: 14 },
        labelStyle: {
          fill: selected ? "#7dd3fc" : "#94a3b8",
          fontSize: 10,
          fontFamily: "var(--font-mono)",
        },
      } satisfies Edge;
    });
  }, [world, selectedLink, routeLinks]);

  useEffect(() => {
    document.documentElement.classList.add("lab-flow");
    return () => document.documentElement.classList.remove("lab-flow");
  }, []);

  if (!host) return null;

  return (
    <section
      className="topology-viewport"
      aria-label="Network topology"
      data-testid="network-topology"
      data-guide-anchor="network-topology"
    >
      <ReactFlow
        nodes={nodes}
        edges={edges}
        fitView
        fitViewOptions={{ padding: 0.22 }}
        proOptions={{ hideAttribution: true }}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        nodesFocusable={false}
        edgesFocusable={false}
        zoomOnScroll={false}
        colorMode="dark"
        minZoom={0.5}
        maxZoom={1.5}
        onNodeClick={(_, node) => {
          const id = node.id as NetNodeId;
          onSelect?.(selectedNode === id ? null : id);
        }}
        onEdgeClick={(_, edge) => {
          const id = edge.id as NetLinkId;
          onSelectLink?.(selectedLink === id ? null : id);
        }}
        onPaneClick={() => {
          onSelect?.(null);
          onSelectLink?.(null);
        }}
      >
        <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="#1e293b" />
        <Controls showInteractive={false} position="top-right" />
      </ReactFlow>
    </section>
  );
}
