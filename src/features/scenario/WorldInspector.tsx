import { useMemo } from "react";

function formatValue(value: unknown): string {
  if (value === null) return "null";
  if (value === undefined) return "—";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

export function WorldInspector({ world }: { world: Record<string, unknown> }) {
  const rows = useMemo(() => {
    const flatten = (
      obj: Record<string, unknown>,
      prefix = "",
      depth = 0,
    ): { path: string; value: unknown }[] => {
      if (depth > 4) return [{ path: prefix, value: obj }];
      const out: { path: string; value: unknown }[] = [];
      for (const [key, value] of Object.entries(obj)) {
        const path = prefix ? `${prefix}.${key}` : key;
        if (
          value !== null &&
          typeof value === "object" &&
          !Array.isArray(value) &&
          Object.keys(value as object).length > 0 &&
          depth < 3
        ) {
          out.push({ path, value: "{…}" });
          out.push(
            ...flatten(value as Record<string, unknown>, path, depth + 1),
          );
        } else {
          out.push({ path, value });
        }
      }
      return out;
    };
    return flatten(world);
  }, [world]);

  return (
    <section className="panel">
      <div className="panel-header">World state (inspector)</div>
      <div className="max-h-48 overflow-auto">
        <table className="w-full text-xs font-mono">
          <tbody>
            {rows.map((row) => (
              <tr key={row.path} className="border-b border-lab-border/50 last:border-0">
                <td className="px-3 py-1 text-lab-muted whitespace-nowrap">{row.path}</td>
                <td className="px-3 py-1 text-lab-text break-all">{formatValue(row.value)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-2 text-lab-muted" colSpan={2}>
                  Empty world
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
