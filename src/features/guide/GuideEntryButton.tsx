import { Compass } from "lucide-react";
import type { Scenario } from "@/content/schema";

export interface GuideEntryButtonProps {
  scenario: Scenario;
  open: boolean;
  onToggle: () => void;
}

export function GuideEntryButton({ scenario, open, onToggle }: GuideEntryButtonProps) {
  if (!scenario.guidedWalkthrough) return null;

  return (
    <button
      type="button"
      className="btn-secondary sim-btn"
      aria-label="Guided troubleshooting"
      aria-pressed={open}
      data-testid="guide-toggle"
      onClick={onToggle}
    >
      <Compass size={14} aria-hidden />
      <span className="hidden sm:inline">Guide</span>
    </button>
  );
}
