import { useState } from "react";
import { useProgressStore } from "@/store/progress";
import { validateContent } from "@/content";
import { SecHead } from "@/components/ui";

/**
 * Settings — a plain utility form on the bench floor. Section headings on
 * hairline rules, no chrome, one destructive control.
 */
export function SettingsPage() {
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const [message, setMessage] = useState<string | null>(null);
  const content = validateContent();

  const onReset = async () => {
    const ok = window.confirm("Clear all local progress on this device?");
    if (!ok) return;
    await resetProgress();
    setMessage("Progress cleared.");
  };

  return (
    <div className="page">
      <header className="inset page-head">
        <h1 className="t-display">Bench settings</h1>
        <p className="page-note">
          Everything runs in this browser — no accounts, no servers, no uploads
        </p>
      </header>

      <div className="inset max-w-2xl flex flex-col gap-7">
        <section className="flex flex-col" aria-labelledby="safety-title">
          <SecHead headingId="safety-title" title="Safety" />
          <p className="t-body text-muted">
            Terminal input is an allowlist simulation only. The app never spawns processes,
            evaluates host shell text, or touches files outside the browser sandbox.
          </p>
        </section>

        <section className="flex flex-col" aria-labelledby="integrity-title">
          <SecHead headingId="integrity-title" title="Content integrity" />
          <div className="flex flex-col gap-1.5">
            <span
              className={`state-mark ${content.ok ? "state-mark--verified" : "state-mark--fault"}`}
              data-testid="content-status"
              role="status"
            >
              {content.ok ? "Schema valid" : `${content.errors.length} content error(s)`}
            </span>
            <p className="text-sm text-muted">
              {content.ok
                ? `${content.scenarioIds.length} scenarios and ${content.kbIds.length} knowledge articles validated against the schema.`
                : "Content failed schema validation and may not load correctly."}
            </p>
          </div>
          {!content.ok && (
            <ul className="mt-2 text-sm text-fault grid gap-1">
              {content.errors.slice(0, 8).map((e) => (
                <li key={e} className="flex gap-2">
                  <span aria-hidden className="t-mono">
                    —
                  </span>
                  <span>{e}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="flex flex-col" aria-labelledby="data-title">
          <SecHead headingId="data-title" title="Data" />
          <div className="flex flex-wrap items-center gap-3">
            <button type="button" className="btn-danger" onClick={() => void onReset()}>
              Reset progress
            </button>
            {message && (
              <span className="state-mark state-mark--verified" role="status">
                {message}
              </span>
            )}
          </div>
          <p className="mt-3 text-sm text-muted">
            Resetting clears the progress saved in this browser. Scenarios and knowledge articles
            ship with the app and are not affected.
          </p>
        </section>
      </div>
    </div>
  );
}
