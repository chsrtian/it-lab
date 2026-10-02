import { useEffect, useRef, useState } from "react";
import type { Scenario } from "@/content/schema";
import type { ConversationState, RunState, ConversationMessage } from "@/engine";
import { getConversationScript } from "@/engine";
import { getArticle } from "@/content";

const CONCEPT_KB: Record<string, string> = {
  dns: "what-is-dns",
  dhcp: "ip-addressing-basics",
  gateway: "gateway-vs-dns",
  permissions: "linux-permissions-basics",
  "least-privilege": "least-privilege-basics",
  services: "systemd-service-basics",
  systemd: "systemd-service-basics",
  "event-logs": "windows-event-logs",
  "boot-repair": "windows-boot-repair",
  phishing: "phishing-awareness",
  evidence: "troubleshooting-method",
  hypothesis: "troubleshooting-method",
  "name-resolution": "what-is-dns",
  "ip-conflict": "ip-addressing-basics",
  "disk-space": "disk-space-slow-pc",
  "database-connection": "database-connection-basics",
  "account-lockout": "least-privilege-basics",
  "system-logs": "windows-event-logs",
};

function bubbleClass(role: ConversationMessage["role"]): string {
  if (role === "learner") return "border-lab-border-strong bg-lab-panel text-lab-text";
  if (role === "mentor") return "border-emerald-500/40 bg-emerald-500/10 text-emerald-100";
  return "border-lab-border bg-lab-surface text-lab-muted";
}

export interface SupportLabProps {
  scenario: Scenario;
  run: RunState;
  conversation: ConversationState;
  onCustomer: (question: string) => void;
  onDiagnosis: (text: string) => void;
  onMentorTip: () => void;
  onExplainConcept?: (concept: string) => void;
  onOpenKb?: (articleId: string) => void;
}

export function SupportLab({
  scenario,
  run,
  conversation,
  onCustomer,
  onDiagnosis,
  onMentorTip,
  onExplainConcept,
  onOpenKb,
}: SupportLabProps) {
  const [question, setQuestion] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [conceptQuery, setConceptQuery] = useState("");
  const historyRef = useRef<HTMLDivElement>(null);
  const script = getConversationScript(scenario);
  const latestCustomer =
    [...conversation.messages].reverse().find((m) => m.role === "customer") ??
    conversation.messages[0];
  const lastMentor = [...conversation.messages]
    .reverse()
    .find((m) => m.role === "mentor");
  const lastLearnMore = [...conversation.messages]
    .reverse()
    .find((m) => m.role === "mentor" && m.evaluation);

  const ask = () => {
    const q = question.trim();
    if (!q) return;
    onCustomer(q);
    setQuestion("");
  };

  const submit = () => {
    const d = diagnosis.trim();
    if (!d) return;
    onDiagnosis(d);
    setDiagnosis("");
  };

  const explain = () => {
    const c = conceptQuery.trim();
      if (!c || !onExplainConcept) return;
      onExplainConcept(c);
      setConceptQuery("");
  };

  useEffect(() => {
    const history = historyRef.current;
    if (!history) return;
    if (typeof history.scrollTo === "function") {
      history.scrollTo({ top: history.scrollHeight });
    } else {
      history.scrollTop = history.scrollHeight;
    }
  }, [conversation.messages.length]);

  return (
    <section className="conversation-workspace" aria-label="Customer conversation">
      <header className="conversation-header">
        <span>Conversation · {script.persona}</span>
        <span className="normal-case tracking-normal font-normal">
          {scenario.ticket.channel}
        </span>
      </header>

      <section
        className="conversation-current"
        aria-label="Current customer turn"
        data-testid="current-customer-turn"
      >
        <div className="conversation-current-meta">
          <span>Current customer turn</span>
          <span>{script.persona}</span>
        </div>
        <p>{latestCustomer?.text ?? script.opening}</p>
      </section>

      <div
        className="conversation-history"
        data-testid="conversation-log"
        data-guide-anchor="customer-chat"
        ref={historyRef}
      >
        {conversation.messages.map((m) => (
          <div
            key={m.id}
            className={`conversation-bubble ${bubbleClass(m.role)}`}
          >
            <div className="conversation-bubble-meta">
              {m.role === "customer"
                ? script.persona
                : m.role === "mentor"
                  ? "Mentor"
                  : "You"}
              {m.evaluation && (
                <span className="conversation-evaluation">· {m.evaluation}</span>
              )}
            </div>
            <div className="conversation-bubble-text">{m.text}</div>
          </div>
        ))}
      </div>

      {lastMentor?.evaluation && (
        <div className="conversation-evaluation-bar">
          <div>Evaluation: <span className="text-lab-text">{lastMentor.evaluation}</span></div>
          {lastLearnMore && (
            <button
              type="button"
              className="lab-link"
              onClick={() => onOpenKb?.("troubleshooting-method")}
            >
              Learn: troubleshooting method
            </button>
          )}
        </div>
      )}

      <div className="conversation-followups">
        {script.followUpQuestions.length > 0 && (
          <>
          <div className="conversation-section-label">Follow-up questions</div>
          <div className="followup-tray" role="group" aria-label="Follow-up questions">
            {script.followUpQuestions.slice(0, 4).map((fq) => (
              <button
                key={fq}
                type="button"
                className="followup-chip"
                onClick={() => onCustomer(fq)}
              >
                {fq}
              </button>
            ))}
          </div>
          </>
        )}
      </div>

      <footer className="conversation-composer">
        <div className="composer-row">
          <label className="text-xs uppercase tracking-wider text-lab-muted" htmlFor="ask-customer">
            Ask customer
          </label>
          <div className="rail-input-row">
            <input
              id="ask-customer"
              className="conversation-input min-w-0 w-full rounded border border-lab-border bg-lab-bg px-3 py-2 text-sm"
              placeholder="e.g. When did this start?"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") ask();
              }}
            />
            <button type="button" className="btn-secondary" onClick={ask}>
              Ask
            </button>
          </div>
        </div>

        <details className="conversation-support-tools">
          <summary>Diagnosis and mentor tools</summary>
          <div className="conversation-support-grid">
            <div className="composer-row">
              <label className="text-xs uppercase tracking-wider text-lab-muted" htmlFor="diagnosis">
                State diagnosis / next step
              </label>
              <div className="rail-input-row">
                <input
                  id="diagnosis"
                  className="conversation-input min-w-0 w-full rounded border border-lab-border bg-lab-bg px-3 py-2 text-sm"
                  placeholder="e.g. Check the wall outlet first"
                  value={diagnosis}
                  onChange={(e) => setDiagnosis(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") submit();
                  }}
                />
                <button type="button" className="btn-primary" onClick={submit}>
                  Evaluate
                </button>
              </div>
            </div>

            {onExplainConcept && (
              <div className="composer-row">
                <label className="text-xs uppercase tracking-wider text-lab-muted" htmlFor="ask-concept">
                  Ask mentor a concept
                </label>
                <div className="rail-input-row">
                  <input
                    id="ask-concept"
                    className="conversation-input min-w-0 w-full rounded border border-lab-border bg-lab-bg px-3 py-2 text-sm"
                    placeholder="e.g. What is DNS?"
                    value={conceptQuery}
                    onChange={(e) => setConceptQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") explain();
                    }}
                  />
                  <button type="button" className="btn-secondary" onClick={explain}>
                    Explain
                  </button>
                </div>
                <div className="concept-chips flex flex-wrap gap-1">
                  {["dns", "evidence", "permissions", "gateway"].map((c) => {
                    const kb = CONCEPT_KB[c];
                    return (
                      <span key={c} className="flex items-center gap-1">
                        <button
                          type="button"
                          className="chip bg-lab-panel text-lab-muted hover:text-lab-text"
                          onClick={() => onExplainConcept(c)}
                        >
                          {c}
                        </button>
                        {kb && getArticle(kb) && (
                          <button
                            type="button"
                            className="lab-link text-[10px]"
                            onClick={() => onOpenKb?.(kb)}
                          >
                            Learn
                          </button>
                        )}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </details>

        <div className="composer-actions flex flex-wrap gap-2">
          <button type="button" className="btn-ghost text-xs" onClick={onMentorTip}>
            Mentor tip
          </button>
          <span className="text-xs text-lab-muted self-center">
            {run.appliedActions.length} steps applied
          </span>
        </div>
      </footer>
    </section>
  );
}
