/**
 * Learner-facing value formatting for environment consoles.
 * Renders world values as readable `key: value` lines — never raw JSON.
 */
export function formatValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (Array.isArray(value)) return value.map((v) => formatValue(v)).join(" · ");
  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(" · ");
  }
  return String(value);
}
