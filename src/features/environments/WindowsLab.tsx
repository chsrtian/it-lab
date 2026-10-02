import { useMemo, useState } from "react";
import type { Scenario } from "@/content/schema";
import { availableActions, type RunState } from "@/engine";
import { formatValue } from "@/features/env";

type PanelId = "event-viewer" | "task-manager" | "services" | "device-manager" | "storage";

const PANEL_TABS: { id: PanelId; label: string }[] = [
  { id: "event-viewer", label: "Event Viewer" },
  { id: "task-manager", label: "Task Manager" },
  { id: "services", label: "Services" },
  { id: "device-manager", label: "Device Manager" },
  { id: "storage", label: "Storage" },
];

function serviceList(world: Record<string, unknown>): { name: string; status: string }[] {
  const services = world.services;
  if (Array.isArray(services)) {
    return services.map((s) => {
      const svc = s as Record<string, unknown>;
      return { name: String(svc.name ?? svc.id), status: String(svc.status ?? "unknown") };
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

function diskPct(disk: Record<string, unknown>): number {
  const n = Number(String(disk.usePercent ?? "").replace("%", ""));
  return Number.isFinite(n) ? n : 0;
}

export interface WindowsLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
}

/**
 * Windows grammar: an MMC-style console. Tabs render persistent records and
 * observable machine state (event log, services, processes, storage);
 * interpretations and fixes stay gated by action `appliesWhen`. In-lab tools
 * are diagnostic checks only — every other action lives in the dock drawer.
 */
export function WindowsLab({ scenario, run, onInspect, onOpenKb }: WindowsLabProps) {
  const [panel, setPanel] = useState<PanelId>("event-viewer");
  const [selectedService, setSelectedService] = useState<string | null>(null);

  const checks = useMemo(
    () => scenario.actions.filter((a) => a.isDiagnostic),
    [scenario.actions],
  );

  const world = run.world;
  const records = (world.events ?? world.eventLog ?? world.logs ?? []) as unknown[];
  const services = serviceList(world);
  const processes = (world.processes ?? world.taskManager ?? []) as unknown[];
  const disks = Array.isArray(world.disks) ? (world.disks as Record<string, unknown>[]) : [];

  const relatedToService = selectedService
    ? availableActions(scenario, run)
        .filter((a) => a.isFix === true || a.isDiagnostic === true)
        .find(
          (a) =>
            a.matchHints?.some((h) =>
              selectedService.toLowerCase().includes(h.toLowerCase().split(" ")[0]),
            ) || a.inspectTarget === selectedService,
        )
    : undefined;

  const tabs = PANEL_TABS.filter(
    (t) =>
      (t.id === "event-viewer" && records.length > 0) ||
      (t.id === "task-manager" && processes.length > 0) ||
      (t.id === "services" && services.length > 0) ||
      (t.id === "device-manager" && world.devices !== undefined) ||
      (t.id === "storage" && disks.length > 0),
  );
  const activeTab = tabs.some((t) => t.id === panel) ? panel : (tabs[0]?.id ?? "event-viewer");

  return (
    <section className="panel overflow-y-auto" aria-label="Windows workstation">
      <div className="panel-header">
        <span>Windows workstation</span>
      </div>
      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-b border-lab-border p-2">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={activeTab === t.id}
              data-guide-anchor={t.id}
              className={`lab-tab rounded px-2.5 py-1.5 text-xs ${
                activeTab === t.id
                  ? "text-lab-text border border-lab-accent bg-lab-accent-dim"
                  : "text-lab-muted border border-transparent hover:bg-lab-panel"
              }`}
              onClick={() => setPanel(t.id)}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}
      <div className="p-3 space-y-3">
        <div className="rounded border border-lab-border bg-lab-bg p-3 min-h-[140px] text-xs font-mono">
          {activeTab === "event-viewer" && (
            <div className="space-y-1">
              <div className="flex justify-between text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                <span>Application log</span>
                <button
                  type="button"
                  className="lab-link normal-case tracking-normal"
                  onClick={() => onOpenKb?.("windows-event-logs")}
                >
                  Learn event logs
                </button>
              </div>
              {records.length === 0 && <div className="text-lab-muted">No recent events</div>}
              {records.map((e, i) => (
                <div key={i} className="text-lab-text border-b border-lab-border/30 pb-1">
                  {formatValue(e)}
                </div>
              ))}
            </div>
          )}
          {activeTab === "task-manager" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Processes
              </div>
              {processes.length === 0 && <div className="text-lab-muted">No process data</div>}
              {processes.map((p, i) => (
                <div key={i}>{formatValue(p)}</div>
              ))}
            </div>
          )}
          {activeTab === "services" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Services
              </div>
              {services.length === 0 && <div className="text-lab-muted">No service snapshot</div>}
              {services.map((s) => (
                <button
                  key={s.name}
                  type="button"
                  aria-pressed={selectedService === s.name}
                  className={`lab-row w-full flex justify-between gap-3 rounded px-1 text-left ${
                    selectedService === s.name ? "bg-lab-panel text-lab-text" : "hover:bg-lab-panel/60"
                  }`}
                  onClick={() => setSelectedService(s.name)}
                >
                  <span>{s.name}</span>
                  <span
                    className={
                      s.status.toLowerCase().includes("run") ||
                      s.status.toLowerCase().includes("start") ||
                      s.status.toLowerCase().includes("active")
                        ? "text-emerald-300"
                        : "text-amber-300"
                    }
                  >
                    {s.status}
                  </span>
                </button>
              ))}
              {relatedToService && (
                <button
                  type="button"
                  className="btn-secondary w-full justify-start mt-1"
                  onClick={() => onInspect(relatedToService.id)}
                >
                  {relatedToService.label}
                </button>
              )}
            </div>
          )}
          {activeTab === "device-manager" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Devices
              </div>
              <div>{world.devices === undefined ? "No devices reported" : formatValue(world.devices)}</div>
            </div>
          )}
          {activeTab === "storage" && (
            <div className="space-y-1">
              <div className="text-lab-muted font-sans text-[10px] uppercase tracking-wider">
                Storage
              </div>
              {disks.length === 0 && <div className="text-lab-muted">No disks reported</div>}
              {disks.map((d, i) => {
                const pct = diskPct(d);
                return (
                  <div key={i} className="flex justify-between gap-3">
                    <span>{String(d.fs ?? d.mount ?? "—")}</span>
                    <span className={pct >= 90 ? "text-amber-300" : "text-emerald-300"}>
                      {String(d.used ?? "—")}/{String(d.size ?? "—")} used ·{" "}
                      {String(d.avail ?? "—")} free · {String(d.usePercent ?? "—")}
                    </span>
                  </div>
                );
              })}
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
