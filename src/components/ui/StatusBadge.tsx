import type { ReactNode } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CircleHelp,
  Info,
  Loader2,
} from "lucide-react";

export type StatusTone = "ok" | "warn" | "crit" | "info" | "unknown" | "pending";

const TONE_CLASS: Record<StatusTone, string> = {
  ok: "status-ok",
  warn: "status-warn",
  crit: "status-crit",
  info: "status-info",
  unknown: "status-unknown",
  pending: "status-info",
};

const TONE_ICON: Record<StatusTone, ReactNode> = {
  ok: <CheckCircle2 size={12} aria-hidden />,
  warn: <AlertTriangle size={12} aria-hidden />,
  crit: <AlertTriangle size={12} aria-hidden />,
  info: <Info size={12} aria-hidden />,
  unknown: <CircleHelp size={12} aria-hidden />,
  pending: <Loader2 size={12} aria-hidden className="animate-spin" />,
};

export interface StatusBadgeProps {
  tone: StatusTone;
  children: ReactNode;
  /** Hide icon if the surrounding context already conveys state (still keep text). */
  hideIcon?: boolean;
  title?: string;
}

/**
 * Status badge: color + icon + text (never color alone — WCAG non-color status).
 */
export function StatusBadge({ tone, children, hideIcon, title }: StatusBadgeProps) {
  return (
    <span className={TONE_CLASS[tone]} title={title}>
      {!hideIcon && TONE_ICON[tone]}
      {children}
    </span>
  );
}

export interface StatusDotProps {
  tone: StatusTone;
  label: string;
}

/**
 * Compact status indicator: colored dot + accessible label (for dense diagrams).
 * Label is always rendered for non-color conveyance.
 */
export function StatusDot({ tone, label }: StatusDotProps) {
  const color =
    tone === "ok"
      ? "bg-lab-ok"
      : tone === "warn"
        ? "bg-lab-warn"
        : tone === "crit"
          ? "bg-lab-crit"
          : tone === "info"
            ? "bg-lab-info"
            : tone === "pending"
              ? "bg-lab-accent animate-pulse"
              : "bg-lab-muted";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-lab-muted">
      <span aria-hidden className={`h-2 w-2 rounded-full shrink-0 ${color}`} />
      {label}
    </span>
  );
}
