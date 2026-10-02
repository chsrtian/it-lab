import type { ReactNode } from "react";
import { StatusBadge, type StatusTone } from "@/components/ui";

export interface HotspotData {
  id: string;
  label: string;
  identity?: string;
  stateSummary?: string;
  stateTone?: StatusTone;
  evidence?: { label: string; value: string; tone?: StatusTone }[];
  description?: string;
  relatedAction?: {
    id: string;
    label: string;
    description?: string;
    applied: boolean;
    disabled?: boolean;
  };
  actions?: NonNullable<HotspotData["relatedAction"]>[];
  learnKb?: string;
}

export interface InspectDockProps {
  selected: HotspotData | null;
  onAction?: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
  emptyHint?: string;
  children?: ReactNode;
}

/**
 * Docked inspection panel for a selected component/node.
 * Spatially attached to the environment (right/below), not a floating dashboard card.
 */
export function InspectDock({
  selected,
  onAction,
  onOpenKb,
  emptyHint = "Select a component to inspect it.",
  children,
}: InspectDockProps) {
  if (!selected) {
    return (
      <div className="rounded border border-dashed border-lab-border bg-lab-bg/50 p-3 text-xs text-lab-muted">
        {emptyHint}
        {children}
      </div>
    );
  }

  return (
    <div
      className="rounded border border-lab-border-strong bg-lab-surface p-3 text-xs space-y-2"
      data-testid="inspect-dock"
      aria-label={`Inspecting ${selected.label}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-semibold text-lab-text">{selected.label}</div>
          {selected.identity && (
            <div className="font-mono text-[11px] text-lab-muted">{selected.identity}</div>
          )}
        </div>
        {selected.stateSummary && (
          <StatusBadge tone={selected.stateTone ?? "unknown"} title={selected.stateSummary}>
            {selected.stateSummary}
          </StatusBadge>
        )}
      </div>

      {selected.description && (
        <p className="text-lab-muted leading-relaxed">{selected.description}</p>
      )}

      {selected.evidence && selected.evidence.length > 0 && (
        <div className="space-y-0.5">
          <div className="text-[10px] uppercase tracking-wider text-lab-muted">Evidence</div>
          {selected.evidence.map((e) => (
            <div key={e.label} className="flex justify-between gap-2 font-mono text-[11px]">
              <span className="text-lab-muted">{e.label}</span>
              <StatusBadge tone={e.tone ?? "unknown"} hideIcon>
                {e.value}
              </StatusBadge>
            </div>
          ))}
        </div>
      )}

      {(selected.actions ?? (selected.relatedAction ? [selected.relatedAction] : [])).map((action) => (
        <div className="space-y-1" key={action.id}>
          {action.description && (
            <p className="text-lab-muted">{action.description}</p>
          )}
          <button
            type="button"
            className="btn-secondary w-full justify-start"
            data-action-id={action.id}
            disabled={action.applied || action.disabled}
            onClick={() => onAction?.(action.id)}
          >
            {action.label}
            {action.applied && (
              <span className="action-state-mark" title="Completed" aria-hidden="true">✓</span>
            )}
          </button>
        </div>
      ))}

      {selected.learnKb && (
        <button
          type="button"
            className="lab-link text-left"
          onClick={() => onOpenKb?.(selected.learnKb!)}
        >
          Learn: {selected.learnKb.replace(/-/g, " ")}
        </button>
      )}

      {children}
    </div>
  );
}

export interface HotspotButtonProps {
  label: string;
  selected?: boolean;
  fault?: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
  title?: string;
}

/**
 * Accessible hotspot wrapper for diagram interactions (mouse + keyboard).
 */
export function HotspotButton({
  label,
  selected,
  fault,
  onClick,
  children,
  className = "",
  title,
}: HotspotButtonProps) {
  return (
    <button
      type="button"
      className={`hotspot text-left rounded transition-colors duration-150 ${
        selected ? "ring-2 ring-lab-accent" : fault ? "ring-1 ring-lab-crit/50" : ""
      } ${className}`}
      onClick={onClick}
      aria-pressed={selected}
      aria-label={label}
      title={title ?? label}
    >
      {children}
    </button>
  );
}
