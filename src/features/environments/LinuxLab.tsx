import { useMemo, useState } from "react";
import type { Scenario } from "@/content/schema";
import { availableActions, type RunState } from "@/engine";
import { formatValue } from "@/features/env";

type ViewId = "filesystem" | "process-list" | "service-manager" | "package-manager";

const VIEWS: { id: ViewId; label: string }[] = [
  { id: "filesystem", label: "Filesystem" },
  { id: "process-list", label: "Processes" },
  { id: "service-manager", label: "Services" },
  { id: "package-manager", label: "Packages" },
];

interface FsNode {
  type?: string;
  name?: string;
  mode?: string;
  owner?: string;
  group?: string;
  content?: string;
  children?: Record<string, FsNode>;
}

function modeToRwx(mode: string, isDir: boolean): string {
  const padded = (mode.replace(/^0+/, "") || "0").padStart(3, "0").slice(-3);
  const digits = padded.split("").map((d) => Number(d) & 7);
  const perms = digits
    .map((d) => `${d & 4 ? "r" : "-"}${d & 2 ? "w" : "-"}${d & 1 ? "x" : "-"}`)
    .join("");
  return (isDir ? "d" : "-") + perms;
}

function flattenFs(
  node: FsNode,
  path: string,
  out: {
    path: string;
    mode?: string;
    owner?: string;
    group?: string;
    content?: string;
    type?: string;
    rwx?: string;
  }[],
) {
  const children = node.children ?? {};
  for (const [name, child] of Object.entries(children)) {
    const childPath = path === "/" ? `/${name}` : `${path}/${name}`;
    const isDir = child.type === "dir" || Boolean(child.children);
    out.push({
      path: childPath,
      mode: child.mode,
      owner: child.owner,
      group: child.group,
      content: child.content,
      type: child.type,
      rwx: modeToRwx(child.mode ?? (isDir ? "755" : "644"), isDir),
    });
    if (isDir) flattenFs(child, childPath, out);
  }
}

function serviceEntries(services: unknown): { name: string; status: string; description?: string }[] {
  if (Array.isArray(services)) {
    return services.map((s) => {
      const svc = s as Record<string, unknown>;
      return {
        name: String(svc.name ?? svc.id ?? "unknown"),
        status: String(svc.status ?? "unknown"),
        description: svc.description ? String(svc.description) : undefined,
      };
    });
  }
  if (services && typeof services === "object") {
    return Object.entries(services as Record<string, unknown>).map(([name, state]) => ({
      name,
      status: formatValue(state),
    }));
  }
  return [];
}

export interface LinuxLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
}

export function LinuxLab({ scenario, run, onInspect, onOpenKb }: LinuxLabProps) {
  const [view, setView] = useState<ViewId>("filesystem");
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const checks = useMemo(
    () => scenario.actions.filter((a) => a.isDiagnostic),
    [scenario.actions],
  );

  const world = run.world;
  const fsRoot = useMemo(
    () => (world.fs ?? world.files ?? {}) as FsNode,
    [world.fs, world.files],
  );
  const files = useMemo(() => {
    const out: {
      path: string;
      mode?: string;
      owner?: string;
      group?: string;
      content?: string;
      type?: string;
      rwx?: string;
    }[] = [];
    if (fsRoot.children || fsRoot.type === "dir") flattenFs(fsRoot, "", out);
    else Object.entries(fsRoot).forEach(([path, meta]) => out.push({ path, ...(meta as object) }));
    return out;
  }, [fsRoot]);
  const processes = (world.processes ?? []) as unknown[];
  const services = serviceEntries(world.services);
  const packages = (world.packages ?? {}) as Record<string, unknown>;
  const users = Array.isArray(world.users)
    ? (world.users as Record<string, unknown>[])
    : [];
  const views = VIEWS.filter(
    (v) =>
      (v.id === "filesystem" && files.length > 0) ||
      (v.id === "process-list" && processes.length > 0) ||
      (v.id === "service-manager" && services.length > 0) ||
      (v.id === "package-manager" && Object.keys(packages).length > 0),
  );
  const activeView = views.some((v) => v.id === view)
    ? view
    : (views[0]?.id ?? "filesystem");
  const selectedFile = selectedPath ? files.find((f) => f.path === selectedPath) : undefined;
  const selectedRelated = selectedPath
    ? availableActions(scenario, run)
        .filter((a) => a.isFix === true || a.isDiagnostic === true)
        .find(
          (a) =>
            a.matchHints?.some((h) => selectedPath.includes(h.replace(/^-|-$/g, ""))) ||
            a.inspectTarget === selectedPath,
        )
    : undefined;

  return (
    <section className="panel overflow-y-auto" aria-label="Linux workstation">
      <div className="panel-header">
        <span>Linux workstation</span>
      </div>
      {views.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-lab-border p-2">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              aria-pressed={activeView === v.id}
              data-guide-anchor={v.id}
              className={`lab-tab rounded px-2.5 py-1.5 text-xs ${
                activeView === v.id
                  ? "text-lab-text border border-lab-accent bg-lab-accent-dim"
                  : "text-lab-muted border border-transparent hover:bg-lab-panel"
              }`}
              onClick={() => setView(v.id)}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
      <div className="p-3 space-y-3">
        <div className="rounded border border-lab-border bg-lab-bg p-3 min-h-[140px] text-xs font-mono">
          {activeView === "filesystem" && (
            <div className="space-y-1" data-guide-anchor="filesystem">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Virtual filesystem
              </div>
              <div className="text-lab-muted font-sans text-[10px]">
                user: {String(world.currentUser ?? "root")}
                {users.length > 0 && (
                  <span> · {users.map((u) => String(u.name)).join(", ")}</span>
                )}
              </div>
              {files.length === 0 && <div className="text-lab-muted">empty</div>}
              {files.map((f) => (
                <button
                  key={f.path}
                  type="button"
                  aria-pressed={selectedPath === f.path}
                  className={`lab-row w-full flex justify-between gap-3 rounded px-1 text-left ${
                    selectedPath === f.path ? "bg-lab-panel text-lab-text" : "hover:bg-lab-panel/60"
                  }`}
                  onClick={() => setSelectedPath(f.path)}
                >
                  <span className="text-lab-text">
                    {f.type === "dir" ? "▸ " : ""}
                    {f.path}
                  </span>
                  <span className="text-lab-muted font-mono">
                    {f.rwx ?? f.mode ?? "—"} {f.owner ?? "root"}:{f.group ?? "root"}
                  </span>
                </button>
              ))}
              {selectedFile && (
                <div className="mt-2 rounded border border-lab-border-strong bg-lab-panel p-2 space-y-1">
                  <div className="text-lab-text">{selectedFile.path}</div>
                  <div className="text-lab-muted font-mono">
                    {selectedFile.rwx ?? modeToRwx(selectedFile.mode ?? "644", false)} mode{" "}
                    {selectedFile.mode ?? "—"} · {selectedFile.owner ?? "root"}:
                    {selectedFile.group ?? "root"} ·{" "}
                    {selectedFile.content
                      ? `${selectedFile.content.split("\n").length} lines`
                      : "dir/empty"}
                  </div>
                  {selectedFile.content && (
                    <pre className="whitespace-pre-wrap text-[11px] text-lab-text max-h-24 overflow-auto">
                      {selectedFile.content}
                    </pre>
                  )}
                  {selectedRelated && (
                    <button
                      type="button"
                      className="btn-secondary w-full justify-start"
                      disabled={run.appliedActions.includes(selectedRelated.id)}
                      onClick={() => onInspect(selectedRelated.id)}
                    >
                      {selectedRelated.label}
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
          {activeView === "process-list" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Running
              </div>
              {processes.length === 0 && (
                <div className="text-lab-muted">
                  {services.length ? "use ps in terminal for live list" : "no data"}
                </div>
              )}
              {processes.map((p, i) => (
                <div key={i}>{formatValue(p)}</div>
              ))}
              {services.map((s) => (
                <div key={s.name} className="flex justify-between gap-3">
                  <span>{s.name}</span>
                  <span className={s.status.includes("active") || s.status.includes("running") ? "text-emerald-300" : "text-amber-300"}>
                    {s.status}
                  </span>
                </div>
              ))}
            </div>
          )}
          {activeView === "service-manager" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                systemd units
              </div>
              {services.length === 0 && <div className="text-lab-muted">no data</div>}
              {services.map((s) => {
                const active =
                  s.status.toLowerCase().includes("active") ||
                  s.status.toLowerCase().includes("running");
                return (
                  <div key={s.name} className="flex justify-between gap-3">
                    <span>
                      {s.name}
                      {s.description ? ` — ${s.description}` : ""}
                    </span>
                    <span className={active ? "text-emerald-300" : "text-amber-300"}>{s.status}</span>
                  </div>
                );
              })}
              <button
                type="button"
                className="lab-link inline-block pt-1 font-sans"
                onClick={() => onOpenKb?.("systemd-service-basics")}
              >
                Learn systemd services
              </button>
            </div>
          )}
          {activeView === "package-manager" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Packages
              </div>
              {Object.keys(packages).length === 0 && <div className="text-lab-muted">no data</div>}
              {Object.entries(packages).map(([name, ver]) => (
                <div key={name}>
                  {name} {formatValue(ver)}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-1.5" role="status" aria-label="Diagnostic checks">
          <div className="text-xs uppercase tracking-wider text-lab-muted">Checks</div>
          {checks.map((a) => {
            const done = run.appliedActions.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className="btn-secondary w-full justify-start text-left"
                disabled={done}
                onClick={() => onInspect(a.id)}
                title={a.description}
              >
                <span className="truncate">{a.label}</span>
                {done && <span className="action-state-mark" title="Completed" aria-hidden="true">✓</span>}
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
