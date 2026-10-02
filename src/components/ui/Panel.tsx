import type { ReactNode } from "react";

export interface PanelProps {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  headerClassName?: string;
  as?: "section" | "div" | "aside";
  "aria-label"?: string;
  "data-testid"?: string;
}

/**
 * Standard lab panel: elevated surface + consistent header.
 */
export function Panel({
  title,
  actions,
  children,
  className = "",
  headerClassName = "",
  as: Tag = "section",
  "aria-label": ariaLabel,
  "data-testid": testId,
}: PanelProps) {
  return (
    <Tag className={`panel ${className}`} aria-label={ariaLabel} data-testid={testId}>
      {(title !== undefined || actions) && (
        <div className={`panel-header ${headerClassName}`}>
          {title}
          {actions && <div className="panel-header-actions">{actions}</div>}
        </div>
      )}
      {children}
    </Tag>
  );
}

export interface DisclosureProps {
  summary: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  "aria-label"?: string;
}

/**
 * Progressive-disclosure block (native details/summary).
 * Use for secondary content: debug mode, advanced score, knowledge links.
 */
export function Disclosure({
  summary,
  children,
  defaultOpen,
  className = "",
  "aria-label": ariaLabel,
}: DisclosureProps) {
  return (
    <details className={`disclosure ${className}`} open={defaultOpen} aria-label={ariaLabel}>
      <summary>{summary}</summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
