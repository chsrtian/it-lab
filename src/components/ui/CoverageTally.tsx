import type { TallyState } from "./tally";

/**
 * Coverage tally — one 9px square per case. Filled squares are facts:
 * healthy = verified, signal = in progress, grey = prerequisite locked,
 * hollow = open. Replaces every progress bar in the product.
 */
export function CoverageTally({
  states,
  label,
  className,
}: {
  states: readonly TallyState[];
  label: string;
  className?: string;
}) {
  return (
    <span
      className={className ? `tally ${className}` : "tally"}
      role="img"
      aria-label={label}
    >
      {states.map((state, i) => (
        <span key={i} className="tally-cell" data-s={state} aria-hidden />
      ))}
    </span>
  );
}
