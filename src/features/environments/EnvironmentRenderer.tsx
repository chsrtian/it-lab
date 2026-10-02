import type { GuideFocus, Scenario } from "@/content/schema";
import type { ConversationState, RunState } from "@/engine";
import { EquipmentLabView } from "./EquipmentLabView";
import { HardwareLabView } from "./HardwareLabView";
import { NetworkLab } from "./NetworkLab";
import { WindowsLab } from "./WindowsLab";
import { LinuxLab } from "./LinuxLab";
import { SupportLab } from "./SupportLab";
import { SysadminLab } from "./SysadminLab";
import { SecurityLab } from "./SecurityLab";
import { DatabaseLab } from "./DatabaseLab";
import type { SetLabContextPanel } from "./contextPanel";

export interface EnvironmentRendererProps {
  scenario: Scenario;
  run: RunState;
  conversation?: ConversationState;
  onAction: (actionId: string) => void;
  onCustomer?: (question: string) => void;
  onDiagnosis?: (text: string) => void;
  onMentorTip?: () => void;
  onExplainConcept?: (concept: string) => void;
  onOpenKb?: (articleId: string) => void;
  onContextPanel?: SetLabContextPanel;
  /** Current guided-step target + completion action — present only while the guide is open. */
  guideFocus?: GuideFocus | null;
}

/**
 * Domain-native environment routing.
 * Priority: explicit category/kind → shell fallback → support.
 *
 * Conversation no longer stacks under the primary environment (it would split
 * the dominant stage); it is rendered by ScenarioPage inside the tool dock
 * drawer instead — see `hasCustomerConversation`.
 */
export function EnvironmentRenderer({
  scenario,
  run,
  conversation,
  onAction,
  onCustomer,
  onDiagnosis,
  onMentorTip,
  onExplainConcept,
  onOpenKb,
  onContextPanel,
  guideFocus,
}: EnvironmentRendererProps) {
  const cat = scenario.category;
  const kind = scenario.environment.kind;
  const shell = scenario.environment.shell;
  const labProps = {
    scenario,
    run,
    onInspect: onAction,
    onOpenKb,
    onContextPanel,
    guideFocus,
  };
  // Remount per scenario so ephemeral lab selection never leaks across runs.
  const key = scenario.id;

  // 1. Equipment families (printer/router/switch/AP/UPS/patch) — declarative
  //    on deviceFamily/kind only, before the hardware bench catches category.
  if (kind === "equipment-bench" || scenario.environment.deviceFamily) {
    return <EquipmentLabView key={key} {...labProps} />;
  }

  // 2. Hardware bench
  if (cat === "hardware" || kind === "hardware-bench") {
    return <HardwareLabView key={key} {...labProps} />;
  }

  // 3. Networking
  if (cat === "networking") {
    return <NetworkLab key={key} {...labProps} />;
  }

  // 4. Database / app → DB environment (not Linux by mistake)
  if (cat === "database") {
    return <DatabaseLab key={key} {...labProps} />;
  }

  // 5. Windows
  if (cat === "windows" || kind === "windows-panel") {
    return <WindowsLab key={key} {...labProps} />;
  }

  // 6. Linux
  if (cat === "linux" || kind === "linux-terminal") {
    return <LinuxLab key={key} {...labProps} />;
  }

  // 7. Sysadmin: prefer shell-matching environment
  if (cat === "sysadmin") {
    // Sysadmin scenarios with conversations use the conversation workspace
    if (scenario.conversation) {
      return (
        <SysadminLab
          key={key}
          scenario={scenario}
          run={run}
          conversation={
            conversation ?? {
              messages: [],
              revealedConcepts: [],
              askedCustomerKeys: [],
              mentorTipsShown: 0,
            }
          }
          onCustomer={onCustomer ?? (() => {})}
          onDiagnosis={onDiagnosis ?? (() => {})}
          onMentorTip={onMentorTip ?? (() => {})}
          onExplainConcept={onExplainConcept}
          onOpenKb={onOpenKb}
        />
      );
    }
    const Lab = shell === "linux" ? LinuxLab : WindowsLab;
    return <Lab key={key} {...labProps} />;
  }

  // 8. Security
  if (cat === "security") {
    return <SecurityLab key={key} {...labProps} />;
  }

  // 9. Support / mixed: the conversation IS the environment here.
  if (cat === "support" || kind === "mixed") {
    return (
      <SupportLab
        key={key}
        scenario={scenario}
        run={run}
        conversation={
          conversation ?? {
            messages: [],
            revealedConcepts: [],
            askedCustomerKeys: [],
            mentorTipsShown: 0,
          }
        }
        onCustomer={onCustomer ?? (() => {})}
        onDiagnosis={onDiagnosis ?? (() => {})}
        onMentorTip={onMentorTip ?? (() => {})}
        onExplainConcept={onExplainConcept}
        onOpenKb={onOpenKb}
      />
    );
  }

  // 10. Shell-based fallbacks
  if (shell === "linux") {
    return <LinuxLab key={key} {...labProps} />;
  }
  if (shell === "windows") {
    return <WindowsLab key={key} {...labProps} />;
  }

  // 11. Final fallback: support environment
  return (
    <SupportLab
      key={key}
      scenario={scenario}
      run={run}
      conversation={
        conversation ?? {
          messages: [],
          revealedConcepts: [],
          askedCustomerKeys: [],
          mentorTipsShown: 0,
        }
      }
      onCustomer={onCustomer ?? (() => {})}
      onDiagnosis={onDiagnosis ?? (() => {})}
      onMentorTip={onMentorTip ?? (() => {})}
      onExplainConcept={onExplainConcept}
      onOpenKb={onOpenKb}
    />
  );
}
