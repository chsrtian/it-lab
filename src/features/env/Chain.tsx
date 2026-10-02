import type { ReactNode } from "react";

export type IndicatorTone = "ok" | "warn" | "crit" | "off" | "info" | "unknown";

/**
 * Shape-coded state marks — colour never carries state alone (shell law).
 * ok/verified ✓ · observed ● · warn ▲ · fault ✕ · not checked □
 */
const TONE_MARK: Record<IndicatorTone, string> = {
  ok: "●",
  warn: "▲",
  crit: "✕",
  off: "□",
  info: "●",
  unknown: "□",
};

const TONE_WORD: Record<IndicatorTone, string> = {
  ok: "observed",
  warn: "warning",
  crit: "fault",
  off: "off",
  info: "info",
  unknown: "not checked",
};

export interface IndicatorProps {
  tone: IndicatorTone;
  label: string;
  /** Show label inline (default) or only as title/aria (compact diagrams). */
  hideLabel?: boolean;
  pulse?: boolean;
  size?: "sm" | "md";
}

/**
 * Passive state light: always pairs a shape mark with a text label.
 */
export function Indicator({ tone, label, hideLabel, pulse, size = "sm" }: IndicatorProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-[11px] text-lab-muted${pulse ? " animate-pulse" : ""}`}
      title={hideLabel ? `${TONE_WORD[tone]}: ${label}` : undefined}
      aria-label={hideLabel ? `${TONE_WORD[tone]}: ${label}` : undefined}
      role={hideLabel ? "img" : undefined}
    >
      <span
        className={`sig-mark sig-mark--${tone}${size === "md" ? " text-[13px]" : ""}`}
        aria-hidden
      >
        {TONE_MARK[tone]}
      </span>
      {!hideLabel && <span>{label}</span>}
    </span>
  );
}

export interface ChainStepProps {
  id: string;
  label: string;
  state: string;
  tone: IndicatorTone;
  active?: boolean;
  /**
   * The learner has actually worked this stage (its related action is applied),
   * so a healthy reading graduates from "observed" to "verified". Derived from
   * run facts only — never asserted by the UI.
   */
  verified?: boolean;
  onClick?: (id: string) => void;
  icon?: ReactNode;
}

/**
 * One node in a signal path (power path, print path, data path).
 * Renders as a button when clickable; still readable as static text.
 */
export function ChainStep({
  id,
  label,
  state,
  tone,
  active,
  verified,
  onClick,
  icon,
}: ChainStepProps) {
  const mark = tone === "ok" && verified ? "✓" : TONE_MARK[tone];
  const markClass = tone === "ok" && verified ? "sig-mark--verified" : `sig-mark--${tone}`;
  const stateWord = tone === "ok" && verified ? "verified" : (TONE_WORD[tone] ?? TONE_WORD.unknown);

  const content = (
    <>
      <span className="sig-node-label">
        {icon}
        {label}
      </span>
      <span className="sig-node-state">
        <span className={`sig-mark ${markClass}`} aria-hidden>
          {mark}
        </span>
        <span className="sr-only">{stateWord}: </span>
        {state}
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        className={`sig-node is-action${active ? " is-active" : ""}`}
        onClick={() => onClick(id)}
        aria-pressed={active}
        data-chain-step={id}
        data-tone={tone}
        title={`${label} — ${stateWord}: ${state}`}
      >
        {content}
      </button>
    );
  }

  return (
    <div
      className={`sig-node${active ? " is-active" : ""}`}
      data-chain-step={id}
      data-tone={tone}
      title={`${label} — ${stateWord}: ${state}`}
    >
      {content}
    </div>
  );
}

/** Connector between two nodes: carries health, never decoration. */
export function ChainArrow({ healthy }: { healthy?: boolean }) {
  return (
    <span
      aria-hidden
      className={`sig-link${healthy === false ? " is-broken" : ""}${healthy ? " is-live" : ""}`}
    >
      <span className="sig-link-line" />
      <span className="sig-link-head">›</span>
    </span>
  );
}

export interface ChainProps {
  label: string;
  children: ReactNode;
  className?: string;
}

/**
 * Signal path: WALL → PSU → MB → FP → POST style visualization.
 * The path IS the environment story, not a text summary of it — it renders as a
 * console band above the environment, not as a row of dashboard cards.
 */
export function Chain({ label, children, className = "" }: ChainProps) {
  return (
    <div className={`sig ${className}`.trim()} role="group" aria-label={label}>
      <div className="sig-label">{label}</div>
      <div className="sig-rail">{children}</div>
    </div>
  );
}
