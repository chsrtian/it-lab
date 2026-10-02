import type { ReactNode } from "react";
import { AlertOctagon, ClipboardList, Lightbulb } from "lucide-react";

export interface IncidentBannerProps {
  ticketId: string;
  symptom: string;
  user?: string;
  role?: string;
  priority?: string;
  channel?: string;
  additionalContext?: string;
  verified?: boolean;
  actions?: ReactNode;
}

/**
 * Primary learner context: what's broken, who reported it, priority.
 * Always visible above the fold in the lab workspace.
 */
export function IncidentBanner({
  ticketId,
  symptom,
  user,
  role,
  priority,
  channel,
  additionalContext,
  verified,
  actions,
}: IncidentBannerProps) {
  return (
    <section
      className={`incident-banner ${verified ? "incident-banner-verified" : ""}`}
      aria-label={`Incident ${ticketId}`}
      data-testid="incident-banner"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 space-y-1.5">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 font-semibold text-lab-text">
              <ClipboardList size={13} aria-hidden className="text-lab-warn" />
              Ticket {ticketId}
            </span>
            {priority && (
              <span
                className={`chip ${
                  priority.toLowerCase() === "critical" || priority.toLowerCase() === "high"
                    ? "status-crit"
                    : priority.toLowerCase() === "medium"
                      ? "status-warn"
                      : "status-info"
                }`}
              >
                {priority}
              </span>
            )}
            {channel && <span className="chip bg-lab-panel text-lab-muted">{channel}</span>}
            {verified && (
              <span className="status-ok">
                <AlertOctagon size={11} aria-hidden className="hidden" />
                Resolved
              </span>
            )}
          </div>
          <p className="text-sm leading-relaxed text-lab-text">
            <span className="text-lab-muted">Reported: </span>
            “{symptom}”
          </p>
          {user && (
            <p className="text-xs text-lab-muted">
              {user}
              {role ? ` (${role})` : ""}
            </p>
          )}
          {additionalContext && (
            <p className="text-xs text-lab-faint">{additionalContext}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </section>
  );
}

export interface NextStepHintProps {
  text: string;
}

/**
 * Subtle contextual "what next" nudge — not a score/hint penalty UI.
 */
export function NextStepHint({ text }: NextStepHintProps) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-lab-border bg-lab-panel/40 px-3 py-2 text-xs text-lab-muted">
      <Lightbulb size={14} aria-hidden className="mt-0.5 shrink-0 text-lab-warn" />
      <span>{text}</span>
    </p>
  );
}
