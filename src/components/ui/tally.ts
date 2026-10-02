export type TallyState = "verified" | "active" | "locked" | "open";

/**
 * Build one cell per case, in catalogue order: verified, then in progress,
 * then prerequisite-locked, then open. Always derived from the rows it sits
 * beside, so the figure can never drift from the list under it.
 */
export function tallyStates(
  items: readonly { id: string }[],
  verified: ReadonlySet<string> | readonly string[],
  active: ReadonlySet<string> | readonly string[],
  locked: ReadonlySet<string> | readonly string[] = [],
): TallyState[] {
  const has = (set: ReadonlySet<string> | readonly string[], id: string) =>
    set instanceof Set ? set.has(id) : (set as readonly string[]).includes(id);
  return items.map((item) =>
    has(verified, item.id)
      ? "verified"
      : has(active, item.id)
        ? "active"
        : has(locked, item.id)
          ? "locked"
          : "open",
  );
}
