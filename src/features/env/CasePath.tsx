import type { Scenario } from "@/content/schema";
import { canVerify, type RunState } from "@/engine";
import { Chain, ChainArrow, ChainStep, type IndicatorTone } from "./Chain";

/**
 * Case path for environments that do not own a signal chain.
 *
 * Every node is derived from run facts only — there is no authored progress
 * here and nothing is invented: reported → gathering → attempted →
 * ready/verified.
 */
export interface CasePathProps {
  scenario: Scenario;
  run: RunState;
}

export function CasePath({ scenario, run }: CasePathProps) {
  const inspected = run.actionLog.length > 0;
  const remediated = run.appliedActions.length > 0;
  const verified = run.status === "verified";
  const ready = !verified && canVerify(scenario, run);

  const steps: {
    id: string;
    label: string;
    state: string;
    tone: IndicatorTone;
    verified?: boolean;
  }[] = [
    {
      id: "symptom",
      label: "Symptom",
      state: "reported",
      tone: "info",
      verified: true,
    },
    {
      id: "evidence",
      label: "Evidence",
      state: inspected ? "gathering" : "not started",
      tone: inspected ? "ok" : "unknown",
      verified: inspected,
    },
    {
      id: "remediation",
      label: "Remediation",
      state: remediated ? "attempted" : "not started",
      tone: remediated ? "ok" : "unknown",
      verified: remediated,
    },
    {
      id: "verification",
      label: "Verification",
      state: verified ? "verified" : ready ? "ready" : "locked",
      tone: verified ? "ok" : ready ? "info" : "unknown",
      verified,
    },
  ];

  return (
    <Chain label="Case path" className="env-path">
      {steps.map((s, i) => (
        <span key={s.id} className="contents">
          <ChainStep
            id={s.id}
            label={s.label}
            state={s.state}
            tone={s.tone}
            verified={s.verified}
          />
          {i < steps.length - 1 && (
            <ChainArrow
              healthy={
                (s.tone === "ok" || s.tone === "info") &&
                (steps[i + 1]?.tone === "ok" ||
                  steps[i + 1]?.tone === "unknown" ||
                  steps[i + 1]?.tone === "info")
              }
            />
          )}
        </span>
      ))}
    </Chain>
  );
}
