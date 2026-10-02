import { useEffect, useRef, useState } from "react";
import { Terminal } from "@xterm/xterm";
import { FitAddon } from "@xterm/addon-fit";
import "@xterm/xterm/css/xterm.css";
import { ChevronUp, Copy, Maximize2, Minimize2, Trash2 } from "lucide-react";
import type { Scenario } from "@/content/schema";
import { executeSimulatedCommand } from "@/engine";
import { consumeTerminalInput, type TerminalLineState } from "./lineEditor";

export interface SimTerminalProps {
  scenario: Scenario;
  world: Record<string, unknown>;
  onCommand: (commandId: string, summary: string, worldPatch?: Record<string, unknown>) => void;
  /** Controlled open/closed from parent (optional). */
  expanded?: boolean;
  onToggleExpand?: () => void;
  /** Dock-mounted mode: parent owns the open toggle; hide the built-in trigger. */
  hideTrigger?: boolean;
}

type BodyState = "closed" | "open" | "expanded";

/**
 * Simulated terminal dock: collapsed by default (trigger only).
 * open ≈ 220px; expanded ≈ min(420px, 50vh). Allowlist-only.
 * Returns null when shell is none.
 *
 * Open/closed is controlled by parent (`expanded`); height mode (open vs expanded)
 * is local. Falls back to internal open state if parent does not control.
 */
export function SimTerminal({
  scenario,
  world,
  onCommand,
  expanded: controlledOpen,
  onToggleExpand,
  hideTrigger = false,
}: SimTerminalProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const termRef = useRef<Terminal | null>(null);
  const fitRef = useRef<FitAddon | null>(null);
  const lineRef = useRef<TerminalLineState>({ value: "", cursor: 0 });
  const startedRef = useRef(false);
  const worldRef = useRef(world);
  const onCommandRef = useRef(onCommand);
  const scenarioRef = useRef(scenario);
  const historyRef = useRef<string[]>([]);
  const [internalOpen, setInternalOpen] = useState(false);
  const [tall, setTall] = useState(false);

  const isControlled = controlledOpen !== undefined;
  const bodyOpen = isControlled ? controlledOpen : internalOpen;
  const bodyState: BodyState = !bodyOpen ? "closed" : tall ? "expanded" : "open";

  const toggleDock = () => {
    if (bodyOpen) {
      setTall(false);
      if (!isControlled) setInternalOpen(false);
    } else {
      setTall(false);
      if (!isControlled) setInternalOpen(true);
    }
    onToggleExpand?.();
  };

  const toggleExpand = () => {
    setTall((v) => !v);
  };

  useEffect(() => {
    worldRef.current = world;
  }, [world]);

  useEffect(() => {
    onCommandRef.current = onCommand;
  }, [onCommand]);

  useEffect(() => {
    scenarioRef.current = scenario;
  }, [scenario]);

  useEffect(() => {
    if (!bodyOpen || !hostRef.current || startedRef.current) return;
    startedRef.current = true;

    // Single source of truth is the CSS token; xterm needs a literal colour.
    const instrumentBg =
      getComputedStyle(document.documentElement)
        .getPropertyValue("--color-lab-instrument")
        .trim() || "#0b1220";

    const term = new Terminal({
      convertEol: true,
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "Cascadia Code, Consolas, monospace",
      theme: {
        background: instrumentBg,
        foreground: "#e2e8f0",
        cursor: "#38bdf8",
        selectionBackground: "#38bdf840",
      },
      allowProposedApi: true,
      scrollback: 1000,
    });
    const fit = new FitAddon();
    term.loadAddon(fit);
    term.open(hostRef.current);
    const input = hostRef.current.querySelector("textarea");
    input?.setAttribute("data-guide-anchor", "terminal-input");
    try {
      fit.fit();
    } catch {
      /* ignore layout race */
    }
    termRef.current = term;
    fitRef.current = fit;

    const prompt = () => {
      const shell = scenarioRef.current.environment.shell;
      return shell === "windows" ? "C:\\lab> " : shell === "linux" ? "learner@lab:~$ " : "> ";
    };

    term.writeln("IT Lab simulated shell — allowlist only, safe to type.");
    term.writeln("Type 'help' for available simulated commands.\r\n");
    term.write(prompt());

    const renderLine = (state: TerminalLineState) => {
      term.write(`\r\x1b[2K${prompt()}${state.value}`);
      const tail = state.value.length - state.cursor;
      if (tail > 0) term.write(`\x1b[${tail}D`);
    };

    const submitLine = (line: string) => {
      term.write("\r\n");
      if (line.trim()) {
        historyRef.current.push(line);
        const result = executeSimulatedCommand(
          {
            scenario: scenarioRef.current,
            world: worldRef.current,
            shell: scenarioRef.current.environment.shell,
          },
          line,
        );
        if (result.output[0] === "__CLEAR__") {
          term.clear();
        } else {
          for (const out of result.output) {
            if (result.error) term.write(`\x1b[31m${out}\x1b[0m\r\n`);
            else term.write(`${out}\r\n`);
          }
        }
        if (result.commandId) {
          onCommandRef.current(result.commandId, line, result.worldPatch);
        }
      }
      term.write(prompt());
    };

    const dataDisposable = term.onData((data) => {
      const next = consumeTerminalInput(lineRef.current, data);
      lineRef.current = next.state;
      for (const event of next.events) {
        if (event.type === "render") renderLine(event.state);
        if (event.type === "interrupt") {
          term.write("^C\r\n");
          term.write(prompt());
        }
        if (event.type === "submit") submitLine(event.value);
      }
    });

    const resize = () => {
      try {
        fit.fit();
      } catch {
        /* ignore */
      }
    };
    const ro = new ResizeObserver(resize);
    ro.observe(hostRef.current);
    window.addEventListener("resize", resize);

    return () => {
      dataDisposable.dispose();
      ro.disconnect();
      window.removeEventListener("resize", resize);
      term.dispose();
      lineRef.current = { value: "", cursor: 0 };
      termRef.current = null;
      fitRef.current = null;
      startedRef.current = false;
    };
  }, [bodyOpen]);

  useEffect(() => {
    if (!bodyOpen) return;
    const id = requestAnimationFrame(() => {
      try {
        fitRef.current?.fit();
      } catch {
        /* ignore */
      }
      termRef.current?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [bodyOpen, bodyState]);

  const clearTerminal = () => {
    termRef.current?.clear();
    termRef.current?.focus();
  };

  const copyOutput = async () => {
    const term = termRef.current;
    if (!term) return;
    try {
      const text = term.buffer.active
        ? Array.from({ length: term.buffer.active.length }, (_, i) => {
            const line = term.buffer.active.getLine(i);
            return line ? line.translateToString(true) : "";
          }).join("\n")
        : "";
      await navigator.clipboard.writeText(text);
    } catch {
      /* clipboard may be unavailable */
    }
  };

  if (scenario.environment.shell === "none") return null;

  const shellShort =
    scenario.environment.shell === "windows"
      ? "Windows"
      : scenario.environment.shell === "linux"
        ? "Linux"
        : "Shell";

  const shellLabel =
    scenario.environment.shell === "windows"
      ? "Windows (simulated)"
      : scenario.environment.shell === "linux"
        ? "Linux (simulated)"
        : "Simulated";

  const bodyHeightClass = bodyState === "expanded" ? "h-[min(420px,50vh)]" : "h-[220px]";

  return (
    <div
      className="terminal-dock"
      data-testid="terminal-panel"
      aria-label="Simulated terminal"
      data-state={bodyState}
    >
      <div className="terminal-dock-bar">
        {hideTrigger ? (
          <span className="terminal-dock-title">
            <span aria-hidden className="terminal-dock-led" />
            Terminal — {shellShort}
          </span>
        ) : (
          <button
            type="button"
            className="terminal-dock-trigger"
            onClick={toggleDock}
            aria-expanded={bodyOpen}
            aria-controls="sim-terminal-body"
          >
            <span className="terminal-dock-title">
              <span aria-hidden className="terminal-dock-led" />
              Terminal — {shellShort}
            </span>
            <span className="terminal-dock-cta">
              {bodyState === "closed" ? "[open]" : "[close]"}
            </span>
          </button>
        )}
        {bodyOpen && (
          <div className="terminal-dock-actions">
            <span className="hidden sm:inline terminal-dock-shell">{shellLabel}</span>
            <button
              type="button"
              className="btn-ghost min-h-[28px] px-2 py-1 text-[11px]"
              onClick={clearTerminal}
              title="Clear terminal"
              aria-label="Clear terminal"
            >
              <Trash2 size={13} aria-hidden />
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[28px] px-2 py-1 text-[11px]"
              onClick={() => void copyOutput()}
              title="Copy terminal output"
              aria-label="Copy terminal output"
            >
              <Copy size={13} aria-hidden />
            </button>
            <button
              type="button"
              className="btn-ghost min-h-[28px] px-2 py-1 text-[11px]"
              onClick={toggleExpand}
              title={bodyState === "expanded" ? "Shrink terminal" : "Expand terminal"}
              aria-label={bodyState === "expanded" ? "Shrink terminal" : "Expand terminal"}
              aria-pressed={bodyState === "expanded"}
            >
              {bodyState === "expanded" ? (
                <Minimize2 size={13} aria-hidden />
              ) : (
                <Maximize2 size={13} aria-hidden />
              )}
              <span className="hidden sm:inline">
                {bodyState === "expanded" ? "Normal" : "Expand"}
              </span>
              <ChevronUp
                size={12}
                aria-hidden
                className={bodyState === "expanded" ? "rotate-180" : ""}
              />
            </button>
          </div>
        )}
      </div>
      {bodyOpen ? (
        <div
          id="sim-terminal-body"
          ref={hostRef}
          className={`terminal-dock-body ${bodyHeightClass}`}
          data-testid="sim-terminal"
          role="region"
          aria-label="Terminal session"
        />
      ) : (
        <p className="terminal-dock-hint">
          Shell ready — open for simulated commands (<code>help</code>).
        </p>
      )}
    </div>
  );
}
