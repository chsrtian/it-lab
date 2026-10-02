import type { ActionDef, GuidedStep, Scenario } from "@/content/schema";

export interface CommandDef {
  id: string;
  /**
   * The typed command name as the terminal parses it (first token). The
   * scenario allowlist (`environment.enabledCommands`) is checked against
   * this — not against `id`, which may carry an outcome suffix
   * ("ping-ok", "systemctl-status") used as a command record.
   */
  command: string;
  displayText: string;
  purpose: string;
  shell: "windows" | "linux" | "both";
  worldPatch?: Record<string, unknown>;
}

export const COMMAND_REGISTRY: CommandDef[] = [
  { id: "help", command: "help", displayText: "help", purpose: "List available simulated commands", shell: "both" },
  { id: "clear", command: "clear", displayText: "clear", purpose: "Clear the terminal screen", shell: "both" },
  { id: "cls", command: "cls", displayText: "cls", purpose: "Clear the terminal screen (Windows alias)", shell: "windows" },
  { id: "ipconfig", command: "ipconfig", displayText: "ipconfig", purpose: "Show Windows network adapter configuration", shell: "windows" },
  { id: "ip-a", command: "ip", displayText: "ip a", purpose: "Show Linux network interfaces and addresses", shell: "linux" },
  { id: "ping-ok", command: "ping", displayText: "ping <host>", purpose: "Test reachability to a host (gateway, DNS, internet)", shell: "both" },
  { id: "ping-fail", command: "ping", displayText: "ping <host>", purpose: "Test reachability — expected to fail per scenario fault", shell: "both" },
  { id: "nslookup-ok", command: "nslookup", displayText: "nslookup <name>", purpose: "Resolve a DNS name to an IP address", shell: "both" },
  { id: "nslookup-fail", command: "nslookup", displayText: "nslookup <name>", purpose: "DNS query — expected to fail per scenario fault", shell: "both" },
  { id: "nslookup-nxdomain", command: "nslookup", displayText: "nslookup <name>", purpose: "DNS query — name does not exist", shell: "both" },
  { id: "nslookup-wrong", command: "nslookup", displayText: "nslookup <name>", purpose: "DNS query — returns incorrect record", shell: "both" },
  { id: "tracert-ok", command: "tracert", displayText: "tracert <target>", purpose: "Trace route to target (Windows)", shell: "windows" },
  { id: "traceroute-ok", command: "traceroute", displayText: "traceroute <target>", purpose: "Trace route to target (Linux)", shell: "linux" },
  { id: "tracert-fail", command: "tracert", displayText: "tracert <target>", purpose: "Trace route — expected to fail per scenario fault", shell: "windows" },
  { id: "netstat", command: "netstat", displayText: "netstat", purpose: "Show listening sockets and connections", shell: "both" },
  { id: "ss", command: "ss", displayText: "ss", purpose: "Show listening sockets and connections (Linux)", shell: "linux" },
  { id: "tasklist", command: "tasklist", displayText: "tasklist", purpose: "List running processes (Windows)", shell: "windows" },
  { id: "systeminfo", command: "systeminfo", displayText: "systeminfo", purpose: "Show Windows system information", shell: "windows" },
  { id: "systemctl-status", command: "systemctl", displayText: "systemctl status [unit]", purpose: "Show service status (all or one unit)", shell: "linux" },
  { id: "systemctl-start", command: "systemctl", displayText: "systemctl start <unit>", purpose: "Start a systemd service", shell: "linux" },
  { id: "systemctl-stop", command: "systemctl", displayText: "systemctl stop <unit>", purpose: "Stop a systemd service", shell: "linux" },
  { id: "systemctl-restart", command: "systemctl", displayText: "systemctl restart <unit>", purpose: "Restart a systemd service", shell: "linux" },
  { id: "systemctl-enable", command: "systemctl", displayText: "systemctl enable <unit>", purpose: "Enable a systemd service at boot", shell: "linux" },
  { id: "journalctl", command: "journalctl", displayText: "journalctl [-u <unit>]", purpose: "Read systemd journal logs", shell: "linux" },
  { id: "ls", command: "ls", displayText: "ls [-l] <path>", purpose: "List directory contents", shell: "linux" },
  { id: "pwd", command: "pwd", displayText: "pwd", purpose: "Print working directory", shell: "linux" },
  { id: "cd", command: "cd", displayText: "cd <path>", purpose: "Change directory", shell: "linux" },
  { id: "cat", command: "cat", displayText: "cat <file>", purpose: "Display file contents", shell: "linux" },
  { id: "grep", command: "grep", displayText: "grep <pattern> <file>", purpose: "Search for pattern in file", shell: "linux" },
  { id: "ps", command: "ps", displayText: "ps", purpose: "List processes", shell: "linux" },
  { id: "df", command: "df", displayText: "df", purpose: "Show disk usage", shell: "linux" },
  { id: "chmod", command: "chmod", displayText: "chmod <mode> <file>", purpose: "Change file permissions", shell: "linux" },
  { id: "chown", command: "chown", displayText: "chown <user[:group]> <file>", purpose: "Change file ownership", shell: "linux" },
  { id: "whoami", command: "whoami", displayText: "whoami", purpose: "Show current user", shell: "linux" },
  { id: "id", command: "id", displayText: "id", purpose: "Show user and group IDs", shell: "linux" },
  { id: "echo", command: "echo", displayText: "echo <text>", purpose: "Print text", shell: "both" },
];

export function resolveCommandDef(commandId: string): CommandDef | undefined {
  return COMMAND_REGISTRY.find((c) => c.id === commandId);
}

export function getCommandDisplay(commandId: string, scenario: Scenario): { text: string; purpose: string } | null {
  const def = resolveCommandDef(commandId);
  if (!def) return null;
  if (def.shell !== "both" && def.shell !== scenario.environment.shell) return null;
  if (scenario.environment.enabledCommands.length > 0 && !scenario.environment.enabledCommands.includes(def.command)) return null;
  return { text: def.displayText, purpose: def.purpose };
}

export interface StepCommandDisplay {
  /** Exactly what the learner should type: a literal command line when the content authored one, otherwise the canonical shape. */
  text: string;
  purpose: string;
  /** First token as the terminal parses it. */
  command: string;
}

/**
 * Finds the literal command line authored on a terminal action: the label when
 * it is itself a runnable command ("systemctl status nginx"), otherwise the
 * first match hint that is a runnable command ("ls -l", "ss -lntp",
 * "journalctl"). Prose hints that merely start with a command word
 * ("cat the unit") are rejected so the guide never shows a line that cannot
 * run. No command string is authored twice — the registry owns the shape and
 * purpose, the action owns its own instance.
 */
function literalCommandLine(command: string, action: ActionDef | undefined): string | undefined {
  if (!action || action.kind !== "terminal") return undefined;
  const label = action.label;
  if (label === command || label.startsWith(`${command} `)) return label;
  for (const hint of action.matchHints ?? []) {
    if (hint === command) return hint;
    if (!hint.startsWith(`${command} `)) continue;
    const rest = hint.slice(command.length + 1);
    if (/[^a-zA-Z ]/.test(rest)) return hint;
  }
  return undefined;
}

/**
 * Guide COMMAND block: resolves a step's commandId against the registry
 * (shell + allowlist), then upgrades the display to the exact command line
 * the content already authored for this step's action. Returns null when the
 * commandId cannot resolve — content validation fails the step in that case.
 */
export function resolveStepCommand(step: GuidedStep, scenario: Scenario): StepCommandDisplay | null {
  const base = step.commandId ? getCommandDisplay(step.commandId, scenario) : null;
  if (!base) return null;
  const def = resolveCommandDef(step.commandId as string);
  if (!def) return null;
  const action = step.actionId
    ? scenario.actions.find((candidate) => candidate.id === step.actionId)
    : undefined;
  return {
    text: literalCommandLine(def.command, action) ?? base.text,
    purpose: base.purpose,
    command: def.command,
  };
}
