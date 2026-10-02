import type { ReactNode } from "react";
import { Panel } from "@/components/ui";
import type { StatusTone } from "@/components/ui";
import { StatusBadge } from "@/components/ui";

export interface LabSectionProps {
  title: ReactNode;
  subtitle?: ReactNode;
  status?: { tone: StatusTone; label: string };
  actions?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  "aria-label"?: string;
  "data-testid"?: string;
}

/**
 * Environment chrome: title + status + actions + body + optional footer.
 * Gives every lab a consistent "this is a real place" header without dashboard cards.
 */
export function LabSection({
  title,
  subtitle,
  status,
  actions,
  children,
  footer,
  className = "",
  "aria-label": ariaLabel,
  "data-testid": testId,
}: LabSectionProps) {
  return (
    <Panel
      className={`overflow-hidden ${className}`}
      aria-label={ariaLabel}
      data-testid={testId}
      title={
        <span className="flex flex-wrap items-center gap-2 min-w-0">
          <span className="truncate">{title}</span>
          {subtitle && (
            <span className="text-[10px] font-normal normal-case tracking-normal text-lab-faint truncate">
              {subtitle}
            </span>
          )}
        </span>
      }
      actions={
        <>
          {status && <StatusBadge tone={status.tone}>{status.label}</StatusBadge>}
          {actions}
        </>
      }
    >
      {children}
      {footer && (
        <div className="border-t border-lab-border px-3 py-2 text-xs text-lab-muted">{footer}</div>
      )}
    </Panel>
  );
}
