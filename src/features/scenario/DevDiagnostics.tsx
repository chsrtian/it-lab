import { Eye, EyeOff, FlaskConical } from "lucide-react";
import { Disclosure } from "@/components/ui";

export interface DevDiagnosticsToggleProps {
  enabled: boolean;
  onToggle: () => void;
}

/**
 * Entry point for developer diagnostics mode. Hidden behind a discrete control
 * in the lab toolbar so beginners never see raw world state by default.
 */
export function DevDiagnosticsToggle({ enabled, onToggle }: DevDiagnosticsToggleProps) {
  return (
    <button
      type="button"
      className="btn-ghost text-xs min-h-[32px] px-2"
      onClick={onToggle}
      aria-pressed={enabled}
      title="Toggle developer diagnostics (raw world state, seeds, condition evaluation)"
    >
      {enabled ? <Eye size={13} aria-hidden /> : <EyeOff size={13} aria-hidden />}
      <span className="hidden sm:inline">Diagnostics</span>
      <FlaskConical size={12} aria-hidden className="opacity-50" />
    </button>
  );
}

export interface DevDiagnosticsProps {
  enabled: boolean;
  children: React.ReactNode;
  meta?: Record<string, string | number | undefined>;
}

/**
 * Wraps developer-only content (raw world inspector). Renders nothing when disabled.
 */
export function DevDiagnostics({ enabled, children, meta }: DevDiagnosticsProps) {
  if (!enabled) return null;
  return (
    <div className="space-y-2" data-testid="dev-diagnostics">
      <div className="flex items-center gap-2 rounded border border-amber-500/30 bg-amber-500/5 px-2 py-1 text-[10px] uppercase tracking-wider text-amber-300">
        <FlaskConical size={12} aria-hidden />
        Developer Diagnostics
      </div>
      {meta && (
        <div className="rounded border border-lab-border bg-lab-bg p-2 font-mono text-[10px] text-lab-muted space-y-0.5">
          {Object.entries(meta).map(([k, v]) => (
            <div key={k} className="flex justify-between gap-2">
              <span>{k}</span>
              <span className="text-lab-text break-all">{v === undefined ? "—" : String(v)}</span>
            </div>
          ))}
        </div>
      )}
      <Disclosure summary="Raw world state">{children}</Disclosure>
    </div>
  );
}
