import type { Scenario } from "@/content/schema";
import { COMMAND_REGISTRY, resolveCommandDef, type CommandDef } from "./commandRegistry";

export interface ParsedCommand {
  name: string;
  args: string[];
}

export interface CommandResult {
  output: string[];
  commandId?: string;
  error?: boolean;
  worldPatch?: Record<string, unknown>;
}

export type ShellKind = "windows" | "linux" | "none";

export interface TerminalHost {
  scenario: Scenario;
  world: Record<string, unknown>;
  shell: ShellKind;
}

function splitArgs(input: string): ParsedCommand {
  const trimmed = input.trim();
  if (!trimmed) return { name: "", args: [] };
  const parts = trimmed.split(/\s+/);
  return { name: parts[0].toLowerCase(), args: parts.slice(1) };
}

function getHost(world: Record<string, unknown>): Record<string, unknown> | null {
  const hosts = world.hosts;
  if (Array.isArray(hosts) && hosts.length > 0) {
    return hosts[0] as Record<string, unknown>;
  }
  return null;
}

function formatIpConfig(host: Record<string, unknown> | null): string[] {
  if (!host) return ["No network adapter found."];
  const ips = Array.isArray(host.ips) ? (host.ips as string[]) : [];
  const gateway = String(host.gateway ?? "");
  const dns = Array.isArray(host.dns) ? (host.dns as string[]) : [];
  const mac = String(host.mac ?? "");
  const lines = [
    "Ethernet adapter Ethernet:",
    "",
    "   Connection-specific DNS Suffix  . : lab.local",
    `   Physical Address. . . . . . . . . : ${mac}`,
  ];
  ips.forEach((ip, i) => {
    lines.push(`   IPv4 Address. . . . . . . . . . : ${ip}`);
    if (i === 0) lines.push(`   Subnet Mask . . . . . . . . . . : 255.255.255.0`);
  });
  lines.push(`   Default Gateway . . . . . . . . : ${gateway || "(none)"}`);
  dns.forEach((d) => lines.push(`   DNS Servers . . . . . . . . . . : ${d}`));
  return lines;
}

function formatIpLinux(host: Record<string, unknown> | null): string[] {
  if (!host) return ["No interfaces."];
  const ips = Array.isArray(host.ips) ? (host.ips as string[]) : [];
  const mac = String(host.mac ?? "");
  const lines = ["1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536", "    inet 127.0.0.1/8 scope host lo"];
  lines.push(`2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500`);
  lines.push(`    link/ether ${mac}`);
  ips.forEach((ip) => {
    const addr = ip.includes("/") ? ip : `${ip}/24`;
    lines.push(`    inet ${addr} scope global eth0`);
  });
  return lines;
}

function resolvePingTarget(
  world: Record<string, unknown>,
  target: string,
): { ok: boolean; lines: string[] } {
  const hosts = world.hosts;
  const primary = Array.isArray(hosts) && hosts.length ? (hosts[0] as Record<string, unknown>) : null;
  const gateway = String(primary?.gateway ?? "");
  const dns = Array.isArray(primary?.dns) ? (primary!.dns as string[]) : [];
  const network = world.network as Record<string, unknown> | undefined;
  const faults = (network?.faults ?? {}) as Record<string, unknown>;

  const isGateway = target === gateway || target === "gateway";
  const isDnsServer = dns.includes(target);
  const isPublicIp = target.startsWith("8.8.") || target.startsWith("1.1.") || target === "internet";

  if (faults.gatewayDown && isGateway) {
    return { ok: false, lines: ["Request timed out.", "Request timed out.", "Request timed out."] };
  }
  if (faults.gatewayMisconfigured && (isPublicIp || isDnsServer)) {
    return {
      ok: false,
      lines: ["Destination host unreachable.", "Destination host unreachable."],
    };
  }
  if (faults.noInternet && isPublicIp) {
    return { ok: false, lines: ["Request timed out.", "Request timed out."] };
  }
  // DNS service down: ICMP to the router still works when gateway === DNS IP.
  if (faults.dnsServerDown && isDnsServer && !isGateway) {
    return { ok: false, lines: ["Request timed out.", "Request timed out."] };
  }

  if (isGateway || isDnsServer || isPublicIp || target === "127.0.0.1") {
    return {
      ok: true,
      lines: [
        `Reply from ${target}: bytes=32 time<1ms TTL=64`,
        `Reply from ${target}: bytes=32 time<1ms TTL=64`,
        `Reply from ${target}: bytes=32 time<1ms TTL=64`,
        `Reply from ${target}: bytes=32 time<1ms TTL=64`,
      ],
    };
  }
  return { ok: false, lines: ["Ping request could not find host. Check the name and try again."] };
}

function lookupDnsRecord(
  world: Record<string, unknown>,
  name: string,
): { ip: string } | null {
  const zones = world.dnsZones as Record<string, string> | undefined;
  if (zones) {
    const hit = zones[name] ?? zones[`${name}.`];
    if (hit) return { ip: hit };
  }
  return null;
}

function modeToRwx(mode: string, isDir: boolean): string {
  const m = mode.replace(/^0+/, "") || "0";
  const padded = m.padStart(3, "0").slice(-3);
  const digits = padded.split("").map((d) => Number(d) & 7);
  const perms = digits
    .map((d) => `${d & 4 ? "r" : "-"}${d & 2 ? "w" : "-"}${d & 1 ? "x" : "-"}`)
    .join("");
  return (isDir ? "d" : "-") + perms;
}

/**
 * Authored file modes are octal strings ("644", "000"); the owner-read bit
 * decides readability. An rwx-string form ("rw-r--r--") is accepted too.
 */
function modeAllowsRead(mode: string): boolean {
  const trimmed = mode.trim();
  if (/^[0-7]{3,4}$/.test(trimmed)) {
    return (parseInt(trimmed, 8) & 0o400) !== 0;
  }
  return trimmed.includes("r");
}

function formatNslookup(
  host: Record<string, unknown> | null,
  world: Record<string, unknown>,
  q: string,
): CommandResult {
  const dnsServers = Array.isArray(host?.dns) ? (host.dns as string[]) : [];
  const server = dnsServers[0] ?? "192.168.1.1";
  const network = world.network as Record<string, unknown> | undefined;
  const faults = (network?.faults ?? {}) as Record<string, unknown>;
  const header = [`Server:  ${server}`, `Address: ${server}#53`, ""];

  if (faults.dnsServerDown) {
    return {
      output: [
        ...header,
        `;; connection timed out; no servers could be reached`,
        `** server can't find ${q}: SERVFAIL`,
      ],
      commandId: "nslookup-fail",
      error: true,
    };
  }

  if (faults.gatewayMisconfigured) {
    return {
      output: [
        ...header,
        `;; connection timed out; no servers could be reached`,
        `** server can't find ${q}: connection refused`,
      ],
      commandId: "nslookup-fail",
      error: true,
    };
  }

  if (faults.dnsWrongRecord) {
    const zoneHit = lookupDnsRecord(world, q);
    if (!zoneHit && (q.includes("app") || q.includes("intranet") || q.includes("portal"))) {
      return {
        output: [...header, `** server can't find ${q}: NXDOMAIN`],
        commandId: "nslookup-nxdomain",
        error: true,
      };
    }
    if (zoneHit) {
      return {
        output: [...header, `Name: ${q}`, `Address: ${zoneHit.ip}`],
        commandId: "nslookup-ok",
      };
    }
    return {
      output: [...header, `Name: wrong.internal`, `Address: 10.9.9.9`],
      commandId: "nslookup-wrong",
      error: false,
    };
  }

  if (faults.portalOffline) {
    const zoneHit = lookupDnsRecord(world, q);
    return {
      output: [
        ...header,
        `Name: ${q}`,
        `Address: ${zoneHit?.ip ?? "93.184.216.34"}`,
        `; portal probe failed — captive portal host unreachable`,
      ],
      commandId: "nslookup-ok",
      error: false,
    };
  }

  const zoneHit = lookupDnsRecord(world, q);
  if (zoneHit) {
    return {
      output: [...header, `Name: ${q}`, `Address: ${zoneHit.ip}`],
      commandId: "nslookup-ok",
    };
  }

  if (q.includes(".") || q === "internet") {
    return {
      output: [...header, `Name: ${q}`, "Address: 93.184.216.34"],
      commandId: "nslookup-ok",
    };
  }

  return {
    output: [...header, `** server can't find ${q}: NXDOMAIN`],
    commandId: "nslookup-nxdomain",
    error: true,
  };
}

function updateService(
  world: Record<string, unknown>,
  unit: string,
  nextStatus: string,
): Record<string, unknown> | null {
  const services = world.services;
  if (!Array.isArray(services)) return null;
  const idx = services.findIndex((s) => {
    const svc = s as Record<string, unknown>;
    return svc.name === unit || svc.id === unit;
  });
  if (idx < 0) return null;
  const updated = services.map((s, i) =>
    i === idx
      ? { ...(s as Record<string, unknown>), status: nextStatus }
      : s,
  );
  return { services: updated };
}

function setFsMode(
  world: Record<string, unknown>,
  path: string,
  mode: string,
): Record<string, unknown> | null {
  const fs = world.fs as Record<string, unknown> | undefined;
  if (!fs) return null;
  const clean = path.replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  const clone = JSON.parse(JSON.stringify(fs)) as Record<string, unknown>;
  let current = clone;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const children = current.children as Record<string, unknown> | undefined;
    const next = children?.[parts[i]] as Record<string, unknown> | undefined;
    if (!next) return null;
    current = next;
  }
  const leaf = parts[parts.length - 1];
  const children = current.children as Record<string, unknown> | undefined;
  const file = children?.[leaf] as Record<string, unknown> | undefined;
  if (!file) return null;
  file.mode = mode;
  return { fs: clone };
}

function setFsOwner(
  world: Record<string, unknown>,
  path: string,
  owner: string,
  group?: string,
): Record<string, unknown> | null {
  const fs = world.fs as Record<string, unknown> | undefined;
  if (!fs) return null;
  const clean = path.replace(/^\/+/, "");
  const parts = clean.split("/").filter(Boolean);
  if (!parts.length) return null;
  const clone = JSON.parse(JSON.stringify(fs)) as Record<string, unknown>;
  let current = clone;
  for (let i = 0; i < parts.length - 1; i += 1) {
    const children = current.children as Record<string, unknown> | undefined;
    const next = children?.[parts[i]] as Record<string, unknown> | undefined;
    if (!next) return null;
    current = next;
  }
  const leaf = parts[parts.length - 1];
  const children = current.children as Record<string, unknown> | undefined;
  const file = children?.[leaf] as Record<string, unknown> | undefined;
  if (!file) return null;
  file.owner = owner;
  if (group !== undefined) file.group = group;
  return { fs: clone };
}

function runCommand(hostState: TerminalHost, parsed: ParsedCommand): CommandResult {
  const { name, args } = parsed;
  const { world, shell, scenario } = hostState;
  const enabled = scenario.environment.enabledCommands;
  const host = getHost(world);
  const network = (world.network ?? {}) as Record<string, unknown>;
  const faults = (network.faults ?? {}) as Record<string, unknown>;

  const isEnabled = (aliases: string[]) => {
    if (enabled.length === 0) return true;
    return aliases.some((a) => enabled.includes(a));
  };

  if (!name) return { output: [] };

  switch (name) {
    case "help": {
      const enabledDefs = enabled.length > 0
        ? enabled.map((e) => resolveCommandDef(e)).filter(Boolean) as CommandDef[]
        : COMMAND_REGISTRY.filter((c) => c.shell === "both" || c.shell === shell);
      return {
        output: [
          "Available simulated commands:",
          ...enabledDefs.map((c) => `  ${c.displayText.padEnd(24)} ${c.purpose}`),
          "",
          "This terminal is a safe simulation. Nothing runs on your computer.",
        ],
      };
    }
    case "clear":
    case "cls":
      return { output: ["__CLEAR__"] };

    case "ipconfig": {
      if (!isEnabled(["ipconfig"])) break;
      return { output: formatIpConfig(host), commandId: "ipconfig" };
    }
    case "ip": {
      if (!isEnabled(["ip"])) break;
      if (args[0] === "a" || args[0] === "addr" || !args.length) {
        return { output: formatIpLinux(host), commandId: "ip-a" };
      }
      break;
    }
    case "ping": {
      if (!isEnabled(["ping"])) break;
      const target = args[0];
      if (!target) return { output: ["Usage: ping <host>"], error: true };
      const resolved =
        target === "example.com" || target === "internet"
          ? (Array.isArray(host?.dns) && host.dns.length
              ? "93.184.216.34"
              : target)
          : target;
      const result = resolvePingTarget(world, resolved === target ? target : resolved);
      // Also treat name targets via DNS
      if (!result.ok && (target.includes(".") || target === "internet")) {
        const useDns = !faults.dnsServerDown && !faults.gatewayMisconfigured && !faults.noInternet;
        if (target === "example.com" || target === "internet") {
          if (!useDns) {
            return {
              output:
                shell === "windows"
                  ? [
                      `Ping request could not find host ${target}. Check the name and try again.`,
                    ]
                  : [`ping: ${target}: Name or service not known`],
              commandId: "ping-fail",
              error: true,
            };
          }
          return {
            output: [
              `Pinging ${target} [93.184.216.34] with 32 bytes of data:`,
              ...resolvePingTarget(world, "8.8.8.8").lines,
            ],
            commandId: "ping-ok",
          };
        }
      }
      if (shell === "windows") {
        return {
          output: [`Pinging ${target} with 32 bytes of data:`, ...result.lines, ""].concat(
            result.ok
              ? ["Ping statistics for " + target + ":", "    Packets: Sent = 4, Received = 4, Lost = 0 (0% loss)"]
              : ["Ping statistics for " + target + ":", "    Packets: Sent = 4, Received = 0, Lost = 4 (100% loss)"],
          ),
          commandId: result.ok ? "ping-ok" : "ping-fail",
          error: !result.ok,
        };
      }
      return {
        output: result.ok
          ? [`PING ${target} 56(84) bytes of data.`, ...result.lines]
          : result.lines,
        commandId: result.ok ? "ping-ok" : "ping-fail",
        error: !result.ok,
      };
    }
    case "nslookup": {
      if (!isEnabled(["nslookup"])) break;
      const q = args[0];
      if (!q) return { output: ["Usage: nslookup <name>"], error: true };
      return formatNslookup(host, world, q);
    }
    case "tracert":
    case "traceroute": {
      if (!isEnabled(["tracert", "traceroute"])) break;
      const target = args[0] ?? "internet";
      if (faults.gatewayMisconfigured) {
        return {
          output: [
            `Tracing route to ${target}`,
            `  1  ${host?.gateway || "192.168.1.254"}  reports: Destination net unreachable.`,
            "Trace complete.",
          ],
          commandId: "tracert-fail",
          error: true,
        };
      }
      if (faults.noInternet) {
        return {
          output: [
            `Tracing route to ${target}`,
            `  1  ${host?.gateway || "192.168.1.1"}  <1 ms`,
            "  2  * * *",
            "  3  * * *",
            "Trace complete.",
          ],
          commandId: "tracert-fail",
          error: true,
        };
      }
      return {
        output: [
          `Tracing route to ${target}`,
          `  1  ${host?.gateway || "192.168.1.1"}  <1 ms`,
          "  2  10.0.0.1  2 ms",
          "  3  93.184.216.34  12 ms",
          "Trace complete.",
        ],
        commandId: "tracert-ok",
      };
    }
    case "netstat":
    case "ss": {
      if (!isEnabled(["netstat", "ss"])) break;
      const header = "Proto Local Address        Foreign Address      State";
      // Database worlds: listener rows reflect actual world state (evidence).
      if (world.db !== undefined) {
        const db = (world.db ?? {}) as Record<string, unknown>;
        const port = String(db.port ?? "5432");
        const rows: string[] = [];
        if (db.portListening === true) {
          rows.push(
            `tcp   0.0.0.0:${port.padEnd(20)}0.0.0.0:0            LISTEN`,
          );
        }
        if (db.verified === true) {
          const host = Array.isArray(world.hosts)
            ? ((world.hosts as Record<string, unknown>[])[0]?.ips as string[] | undefined)?.[0]
            : undefined;
          rows.push(
            `tcp   ${host ?? "0.0.0.0"}:${String(db.clientPort ?? "49712").padEnd(14)}0.0.0.0:${port}            ESTABLISHED`,
          );
        }
        return {
          output: rows.length > 0 ? [header, ...rows] : [header, "(no listening sockets)"],
          commandId: name,
        };
      }
      return {
        output: [
          header,
          "tcp   0.0.0.0:445          0.0.0.0:0            LISTEN",
          "tcp   192.168.1.50:49712   93.184.216.34:443    ESTABLISHED",
        ],
        commandId: name,
      };
    }
    case "tasklist": {
      if (!isEnabled(["tasklist"])) break;
      const services = Array.isArray(world.services) ? (world.services as Record<string, unknown>[]) : [];
      return {
        output: [
          "Image Name                     PID Session Name        Mem Usage",
          "========================= ======== ================ ===========",
          "System Idle Process              0 Services               8 K",
          "explorer.exe                   4120 Console            85,212 K",
          ...services.map(
            (s) => `${String(s.name).padEnd(26)} ${String(s.pid ?? 1000).padStart(8)} Console        12,000 K`,
          ),
        ],
        commandId: "tasklist",
      };
    }
    case "systeminfo": {
      if (!isEnabled(["systeminfo"])) break;
      return {
        output: [
          "Host Name:                 LAB-PC",
          "OS Name:                   Windows 11 Pro (Simulated)",
          "System Type:               x64-based PC",
          `Network Card(s):           1 [Ethernet]`,
        ],
        commandId: "systeminfo",
      };
    }
    case "systemctl": {
      if (!isEnabled(["systemctl"])) break;
      const services = Array.isArray(world.services) ? (world.services as Record<string, unknown>[]) : [];
      const sub = args[0];
      const svcName = args[1];
      if (sub === "status" || !sub) {
        if (!svcName) {
          return {
            output: services.map((s) => `${String(s.name).padEnd(20)} ${String(s.status)}`),
            commandId: "systemctl-status",
          };
        }
        const svc = services.find((s) => s.name === svcName);
        if (!svc) return { output: [`Unit ${svcName} could not be found.`], error: true };
        return {
          output: [
            `● ${svc.name} - ${svc.description ?? "service"}`,
            `   Loaded: loaded (/lib/systemd/system/${svc.name}.service; enabled)`,
            `   Active: ${String(svc.status)}`,
            ...(Array.isArray(svc.lastError) ? (svc.lastError as string[]).map((l) => `   ${l}`) : []),
          ],
          commandId: `systemctl-status-${svcName}`,
        };
      }
      if (sub === "start" || sub === "stop" || sub === "restart" || sub === "enable") {
        if (!svcName) return { output: ["Usage: systemctl <start|stop|restart> <unit>"], error: true };
        const services = Array.isArray(world.services)
          ? (world.services as Record<string, unknown>[])
          : [];
        const svc = services.find((s) => s.name === svcName || s.id === svcName);
        if (!svc) return { output: [`Unit ${svcName} could not be found.`], error: true };

        const confOk =
          (world.svc as Record<string, unknown> | undefined)?.confReadable !== false;
        let nextStatus: string;
        if (sub === "stop") nextStatus = "inactive";
        else if (confOk || sub === "enable") nextStatus = "active (running)";
        else nextStatus = "failed";
        const patch = updateService(world, svcName, nextStatus);
        const failed = nextStatus === "failed";
        const output = failed
          ? [
              `Job for ${svcName}.service failed because the control process exited with error code.`,
              `See "systemctl status ${svcName}.service" and "journalctl -xeu ${svcName}".`,
            ]
          : [`${sub} ${svcName}: completed (simulated)`];
        return {
          output,
          commandId: `systemctl-${sub}`,
          error: failed,
          worldPatch: patch ?? undefined,
        };
      }
      break;
    }
    case "journalctl": {
      if (!isEnabled(["journalctl"])) break;
      const logs = Array.isArray(world.logs) ? (world.logs as string[]) : [];
      return { output: logs.length ? logs : ["No log entries."], commandId: "journalctl" };
    }
    case "ls": {
      if (!isEnabled(["ls"])) break;
      const fs = (world.fs ?? {}) as Record<string, unknown>;
      const path = args.find((a) => !a.startsWith("-")) ?? ".";
      const long = args.some((a) => a.startsWith("-") && a.includes("l"));
      const node = resolveFs(fs, path === "." ? String(world.cwd ?? "/") : path);
      if (!node) return { output: [`ls: cannot access '${path}': No such file or directory`], error: true };
      if (node.type === "file") {
        if (long) {
          const perm = modeToRwx(node.mode ?? "644", false);
          const owner = String(node.owner ?? "root");
          const group = String(node.group ?? "root");
          const size = String(node.size ?? ((node.content ?? "").length || 0));
          return {
            output: [`${perm} 1 ${owner} ${group} ${size} ${node.name ?? path}`],
            commandId: "ls",
          };
        }
        return { output: [String(node.name ?? path)], commandId: "ls" };
      }
      const entries = Object.entries(node.children ?? {}).map(([name, child]) => {
        const c = child as { type?: string; mode?: string; owner?: string; group?: string; content?: string; size?: string };
        const isDir = c.type === "dir";
        if (long) {
          const perm = modeToRwx(c.mode ?? (isDir ? "755" : "644"), isDir);
          const owner = String(c.owner ?? "root");
          const group = String(c.group ?? "root");
          const size = isDir ? "4096" : String(c.size ?? ((c.content ?? "").length || 0));
          return `${perm} 1 ${owner} ${group} ${size} ${name}`;
        }
        const perm = modeToRwx(c.mode ?? (isDir ? "755" : "644"), isDir);
        return `${perm}  ${String(c.owner ?? "root")} ${String(c.group ?? "root")}  ${name}`;
      });
      return { output: entries.length ? entries : ["(empty)"], commandId: "ls" };
    }
    case "pwd": {
      if (!isEnabled(["pwd"])) break;
      return { output: [String((world.cwd as string) ?? "/")], commandId: "pwd" };
    }
    case "cd": {
      if (!isEnabled(["cd"])) break;
      return { output: [], commandId: "cd" };
    }
    case "cat": {
      if (!isEnabled(["cat"])) break;
      const file = args[0];
      if (!file) return { output: ["Usage: cat <file>"], error: true };
      const fs = (world.fs ?? {}) as Record<string, unknown>;
      const node = resolveFs(fs, file);
      if (!node || node.type !== "file") {
        return { output: [`cat: ${file}: No such file or directory`], error: true };
      }
      if (node.mode && typeof node.mode === "string" && !modeAllowsRead(node.mode)) {
        return { output: [`cat: ${file}: Permission denied`], error: true };
      }
      const content = node.content;
      return {
        output: typeof content === "string" ? content.split("\n") : ["(binary)"],
        commandId: `cat:${file}`,
      };
    }
    case "grep": {
      if (!isEnabled(["grep"])) break;
      const pattern = args[0];
      const file = args[1];
      if (!pattern || !file) return { output: ["Usage: grep <pattern> <file>"], error: true };
      const fs = (world.fs ?? {}) as Record<string, unknown>;
      const node = resolveFs(fs, file);
      if (!node || typeof node.content !== "string") {
        return { output: [`grep: ${file}: No such file`], error: true };
      }
      const matches = node.content.split("\n").filter((l) => l.includes(pattern));
      return { output: matches.length ? matches : [], commandId: `grep:${pattern}` };
    }
    case "ps": {
      if (!isEnabled(["ps"])) break;
      const services = Array.isArray(world.services) ? (world.services as Record<string, unknown>[]) : [];
      const processes = Array.isArray(world.processes) ? (world.processes as unknown[]) : [];
      return {
        output: [
          "USER       PID %CPU COMMAND",
          "root         1  0.0 /sbin/init",
          ...processes.map((p) =>
            typeof p === "string"
              ? p
              : `${String((p as Record<string, unknown>).user ?? "root")} ${String(
                  (p as Record<string, unknown>).pid ?? 0,
                )} ${String((p as Record<string, unknown>).cpu ?? "0.0")} ${String(
                  (p as Record<string, unknown>).command ?? "process",
                )}`,
          ),
          ...services.map((s, i) => `root      ${100 + i}  0.1 ${s.name}`),
        ],
        commandId: "ps",
      };
    }
    case "df": {
      if (!isEnabled(["df"])) break;
      const disks = Array.isArray(world.disks) ? (world.disks as Record<string, unknown>[]) : [];
      if (!disks.length) {
        return {
          output: [
            "Filesystem     Size  Used Avail Use% Mounted on",
            "/dev/sda1       50G   48G  2.0G  96% /",
          ],
          commandId: "df",
        };
      }
      return {
        output: [
          "Filesystem     Size  Used Avail Use% Mounted on",
          ...disks.map((d) => `${d.fs ?? "/dev/sda1"}  ${d.size ?? "50G"}  ${d.used ?? "10G"}  ${d.avail ?? "40G"}  ${d.usePercent ?? "20%"}  ${d.mount ?? "/"}`),
        ],
        commandId: "df",
      };
    }
    case "chmod": {
      if (!isEnabled(["chmod"])) break;
      const mode = args[0];
      const target = args[1];
      if (!mode || !target) return { output: ["Usage: chmod <mode> <file>"], error: true };
      if (!/^[0-7]{3,4}$/.test(mode)) {
        return { output: [`chmod: invalid mode: '${mode}'`], error: true };
      }
      const patch = setFsMode(world, target, mode);
      if (!patch) {
        return { output: [`chmod: cannot access '${target}': No such file or directory`], error: true };
      }
      const perms = (world.perms ?? {}) as Record<string, unknown>;
      const extra =
        mode === "660" || mode === "664" || mode === "644" || mode === "755"
          ? { perms: { ...perms, configFixed: true } }
          : {};
      return {
        output: [],
        commandId: "chmod",
        worldPatch: { ...patch, ...extra },
      };
    }
    case "chown": {
      if (!isEnabled(["chown"])) break;
      const spec = args[0];
      const target = args[1];
      if (!spec || !target) return { output: ["Usage: chown <user[:group]> <file>"], error: true };
      const [owner, group] = spec.split(":");
      const patch = setFsOwner(world, target, owner, group);
      if (!patch) {
        return {
          output: [`chown: cannot access '${target}': No such file or directory`],
          error: true,
        };
      }
      const perms = (world.perms ?? {}) as Record<string, unknown>;
      const mode = (() => {
        const fs = world.fs as Record<string, unknown> | undefined;
        if (!fs) return undefined;
        const clean = target.replace(/^\/+/, "");
        const parts = clean.split("/").filter(Boolean);
        let cur = fs as FsNode;
        for (const p of parts) {
          if (!cur.children?.[p]) return undefined;
          cur = cur.children[p];
        }
        return cur.mode;
      })();
      const groupWritable = mode === "660" || mode === "664";
      const ownerOk = owner === "root" || owner === "devon";
      const extra =
        groupWritable && (group === "app" || group === "devon" || owner === "devon")
          ? { perms: { ...perms, configFixed: true } }
          : ownerOk && group
            ? {}
            : {};
      return {
        output: [],
        commandId: "chown",
        worldPatch: { ...patch, ...extra },
      };
    }
    case "whoami": {
      if (!isEnabled(["whoami"])) break;
      return { output: [String(world.currentUser ?? "root")], commandId: "whoami" };
    }
    case "id": {
      if (!isEnabled(["id"])) break;
      const user = String(world.currentUser ?? "root");
      const users = Array.isArray(world.users)
        ? (world.users as Record<string, unknown>[])
        : [];
      const u = users.find((x) => x.name === user || x.username === user);
      const uid = Number(u?.uid ?? (user === "root" ? 0 : 1000));
      const primaryGroup = String(u?.group ?? u?.primaryGroup ?? user);
      const gid = Number(u?.gid ?? (primaryGroup === "root" ? 0 : uid));
      const extraGroups = Array.isArray(u?.groups)
        ? (u!.groups as string[]).filter((g) => g !== primaryGroup)
        : user === "root"
          ? ["sudo"]
          : ["users"];
      const groupList = [`${gid}(${primaryGroup})`, ...extraGroups.map((g, i) => `${1000 + i}(${g})`)];
      return {
        output: [`uid=${uid}(${user}) gid=${gid}(${primaryGroup}) groups=${groupList.join(",")}`],
        commandId: "id",
      };
    }
    case "echo": {
      return { output: [args.join(" ")], commandId: "echo" };
    }
    default:
      break;
  }

  return {
    output: [
      shell === "windows"
        ? `'${name}' is not recognized as an internal or external command.`
        : `bash: ${name}: command not found`,
      "Type 'help' for simulated commands available in this lab.",
    ],
    commandId: name,
    error: true,
  };
}

interface FsNode {
  type?: string;
  name?: string;
  mode?: string;
  owner?: string;
  group?: string;
  content?: string;
  size?: string;
  children?: Record<string, FsNode>;
}

function resolveFs(fs: Record<string, unknown>, path: string): FsNode | null {
  const clean = path.replace(/^\/+/, "");
  if (!clean || clean === "." || clean === "/") {
    return (fs as FsNode) ?? null;
  }
  const parts = clean.split("/").filter(Boolean);
  let current: FsNode = fs as FsNode;
  for (const part of parts) {
    if (!current.children || !current.children[part]) return null;
    current = current.children[part];
  }
  return current;
}

export function executeSimulatedCommand(
  hostState: TerminalHost,
  input: string,
): CommandResult {
  const parsed = splitArgs(input);
  if (!parsed.name) return { output: [] };
  // Safety: never eval, never spawn — only allowlisted simulated handlers.
  return runCommand(hostState, parsed);
}
