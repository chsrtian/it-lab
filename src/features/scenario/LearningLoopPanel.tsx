import type { LearningLoopCard } from "@/engine";

export interface LearningLoopPanelProps {
  card: LearningLoopCard | null;
}

const GRADE_TONE: Record<string, { border: string; text: string }> = {
  optimal: { border: "border-emerald-500/50", text: "text-emerald-200" },
  good: { border: "border-emerald-500/35", text: "text-emerald-300" },
  reasonable: { border: "border-lab-border-strong", text: "text-lab-text" },
  "low-value": { border: "border-amber-500/50", text: "text-amber-200" },
  premature: { border: "border-amber-500/50", text: "text-amber-200" },
  unnecessary: { border: "border-lab-border", text: "text-lab-muted" },
  unknown: { border: "border-lab-border", text: "text-lab-muted" },
  risky: { border: "border-amber-500/60", text: "text-amber-200" },
  wrong: { border: "border-orange-500/60", text: "text-orange-200" },
  harmful: { border: "border-red-500/60", text: "text-red-200" },
};

/** Inline feedback strip under the environment — not a peer card. */
export function LearningLoopPanel({ card }: LearningLoopPanelProps) {
  if (!card) return null;
  const tone = GRADE_TONE[card.evaluation] ?? {
    border: "border-lab-border",
    text: "text-lab-text",
  };
  const result = card.evidenceGain || card.rationale;
  const next =
    card.nextOptions[0] ??
    (card.stillUnknown.length > 0 ? `Resolve: ${card.stillUnknown[0]}` : "Continue with the evidence path.");

  return (
    <section
      className={`feedback-strip ${tone.border}`}
      aria-label="Learning feedback"
      data-testid="learning-loop"
    >
      <div className="feedback-strip-head">
        <span className="text-lab-muted">Action review</span>
        <span className={`capitalize ${tone.text}`}>{card.evaluation}</span>
      </div>
      <div className="feedback-strip-body">
        <p>
          <span className="feedback-strip-label">Result</span>
          <strong>{card.actionLabel}</strong>
          <span>{result}</span>
        </p>
        <p>
          <span className="feedback-strip-label">Next</span>
          <span>{next}</span>
        </p>
      </div>
    </section>
  );
}
