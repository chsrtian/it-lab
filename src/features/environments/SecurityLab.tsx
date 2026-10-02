import { useMemo } from "react";
import type { Scenario } from "@/content/schema";
import type { RunState } from "@/engine";

export interface SecurityLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
}

interface EvidenceRow {
  label: string;
  detail: string;
}

/**
 * Security grammar: an evidence board. Persistent records and directly
 * observable facts are visible; interpretations stay gated behind diagnostic
 * checks (`mail.analyzed`, `identity.verifiedUser`); every applied action
 * contributes a finding row. Values render as readable text, never raw JSON.
 */
export function SecurityLab({ scenario, run, onInspect, onOpenKb }: SecurityLabProps) {
  const checks = useMemo(
    () => scenario.actions.filter((a) => a.isDiagnostic),
    [scenario.actions],
  );

  const mail = (run.world.mail ?? {}) as Record<string, unknown>;
  const identity = (run.world.identity ?? {}) as Record<string, unknown>;
  const endpoint = (run.world.endpoint ?? {}) as Record<string, unknown>;

  const rows: EvidenceRow[] = [];
  if (typeof identity.failedAttempts === "number") {
    rows.push({ label: "Failed logons", detail: `Recorded: ${identity.failedAttempts}` });
  }
  if (typeof identity.signInsToday === "number") {
    rows.push({ label: "Sign-ins today", detail: `Recorded: ${identity.signInsToday}` });
  }
  if (mail.analyzed === true) {
    if (mail.senderDomain) rows.push({ label: "Sender domain", detail: String(mail.senderDomain) });
    if (mail.linkHost) rows.push({ label: "Link host", detail: String(mail.linkHost) });
  }
  if (identity.geoChecked === true && identity.geoOrigin) {
    rows.push({ label: "Sign-in origin", detail: String(identity.geoOrigin) });
  }
  if (identity.userAttestedNotMe === true) {
    rows.push({ label: "User attestation", detail: "User confirms the sign-in was not theirs" });
  }
  if (identity.sessionsRevoked === true) {
    rows.push({ label: "Sessions", detail: "Revoked — forced re-authentication" });
  }
  if (typeof endpoint.alertsOpen === "number") {
    rows.push({ label: "Open EDR alerts", detail: `Recorded: ${endpoint.alertsOpen}` });
  }
  if (endpoint.originTraced === true && endpoint.originSource) {
    rows.push({ label: "Delivery origin", detail: String(endpoint.originSource) });
  }
  if (endpoint.persistenceFound === true && endpoint.persistenceKey) {
    rows.push({ label: "Persistence", detail: String(endpoint.persistenceKey) });
  }
  if (endpoint.quarantined === true) {
    rows.push({ label: "Threat state", detail: "Quarantined — process stopped" });
  }
  for (const a of scenario.actions) {
    if (run.appliedActions.includes(a.id)) {
      rows.push({
        label: a.label ?? a.id,
        detail: a.evaluation?.evidenceGain ?? a.feedback ?? a.description ?? "Recorded.",
      });
    }
  }

  const concepts = [...new Set([...run.conceptsRevealed, ...scenario.skills])].slice(0, 8);

  return (
    <section
      className="panel overflow-y-auto"
      aria-label="Security investigation"
      data-guide-anchor="evidence-board"
    >
      <div className="panel-header">
        <span>Evidence board</span>
      </div>
      <div className="p-3 grid gap-3 md:grid-cols-2">
        <div className={`space-y-2 ${rows.length === 0 ? "md:col-span-2" : ""}`} role="status" aria-label="Diagnostic checks">
          <div className="text-xs uppercase tracking-wider text-lab-muted">Checks</div>
          {checks.map((a) => {
            const done = run.appliedActions.includes(a.id);
            return (
              <button
                key={a.id}
                type="button"
                className="btn-secondary w-full justify-start text-left"
                disabled={done}
                onClick={() => onInspect(a.id)}
                title={a.description}
              >
                <span className="truncate">{a.label}</span>
                {done && <span className="action-state-mark" title="Completed" aria-hidden="true">✓</span>}
              </button>
            );
          })}
          <div className="flex flex-wrap gap-1.5 pt-1">
            {concepts.map((c) => (
              <button
                key={c}
                type="button"
                className="chip bg-lab-panel text-lab-muted hover:text-lab-text text-[10px]"
                onClick={() =>
                  onOpenKb?.(c in CONCEPT_KB ? CONCEPT_KB[c] : "troubleshooting-method")
                }
              >
                Learn: {c}
              </button>
            ))}
          </div>
        </div>
        {rows.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs uppercase tracking-wider text-lab-muted">Evidence</div>
            <div className="rounded border border-lab-border bg-lab-bg p-3 text-xs space-y-1.5 max-h-48 overflow-auto">
              {rows.map((r, i) => (
                <div key={i} className="border-b border-lab-border/40 pb-1.5 last:border-0 last:pb-0">
                  <div className="text-lab-text">{r.label}</div>
                  <div className="text-lab-muted break-words">{r.detail}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

const CONCEPT_KB: Record<string, string> = {
  phishing: "phishing-awareness",
  "least-privilege": "least-privilege-basics",
  security: "least-privilege-basics",
  "account-lockout": "least-privilege-basics",
};
