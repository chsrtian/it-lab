import type { Condition } from "@/content/schema";

export function getByPath(obj: unknown, path: string): unknown {
  if (!path) return obj;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    if (typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== typeof b) return false;
  if (a === null || b === null) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((item, i) => deepEqual(item, b[i]));
  }
  if (typeof a === "object" && typeof b === "object") {
    const ak = Object.keys(a as object);
    const bk = Object.keys(b as object);
    if (ak.length !== bk.length) return false;
    return ak.every((k) =>
      deepEqual((a as Record<string, unknown>)[k], (b as Record<string, unknown>)[k]),
    );
  }
  return false;
}

export interface EvalContext {
  world: Record<string, unknown>;
  ranCommands: ReadonlySet<string>;
  appliedActions?: readonly string[];
}

function resolvePath(ctx: EvalContext, path: string): unknown {
  if (path === "appliedActions") return ctx.appliedActions ? [...ctx.appliedActions] : [];
  if (path === "ranCommands") return [...ctx.ranCommands];
  if (path.startsWith("appliedActions.")) {
    const rest = path.slice("appliedActions.".length);
    return getByPath({ appliedActions: ctx.appliedActions ? [...ctx.appliedActions] : [] }, `appliedActions.${rest}`);
  }
  return getByPath(ctx.world, path);
}

export function evaluateCondition(condition: Condition, ctx: EvalContext): boolean {
  switch (condition.type) {
    case "stateEquals": {
      return deepEqual(resolvePath(ctx, condition.path), condition.value);
    }
    case "stateIn": {
      const val = resolvePath(ctx, condition.path);
      return condition.values.some((v) => deepEqual(val, v));
    }
    case "commandRan": {
      return ctx.ranCommands.has(condition.commandId);
    }
    case "all": {
      return condition.conditions.every((c) => evaluateCondition(c, ctx));
    }
    case "any": {
      return condition.conditions.some((c) => evaluateCondition(c, ctx));
    }
    case "not": {
      return !evaluateCondition(condition.condition, ctx);
    }
    default: {
      const _exhaustive: never = condition;
      return _exhaustive;
    }
  }
}

export function evaluateAll(conditions: Condition[], ctx: EvalContext): boolean {
  return conditions.every((c) => evaluateCondition(c, ctx));
}

export function evaluateAny(conditions: Condition[], ctx: EvalContext): boolean {
  return conditions.some((c) => evaluateCondition(c, ctx));
}

export function applyPatch(
  world: Record<string, unknown>,
  patch: Record<string, unknown>,
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...world };
  for (const [key, value] of Object.entries(patch)) {
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      next[key] !== null &&
      typeof next[key] === "object" &&
      !Array.isArray(next[key])
    ) {
      next[key] = applyPatch(next[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      next[key] = value;
    }
  }
  return next;
}

function objOf(v: unknown): Record<string, unknown> | null {
  return v !== null && typeof v === "object" && !Array.isArray(v)
    ? (v as Record<string, unknown>)
    : null;
}

function yes(o: Record<string, unknown>, key: string): boolean {
  return o[key] === true;
}

/**
 * Equipment causality (Phase 11) — engine-owned like the bench power chain.
 * Each family derives observable effects from its world namespace; renderer
 * verdict text may additionally gate on `*Checked`/`*Traced` reveal flags so
 * config-class facts are not spoiled before a check records them.
 * Rules are documented in docs/IT_EQUIPMENT_ARCHITECTURE.md.
 */
function deriveEquipment(world: Record<string, unknown>): Record<string, unknown> {
  const out = { ...world };

  const printer = objOf(out.printer);
  if (printer) {
    const powerOk = yes(printer, "powerOn") && yes(printer, "powerCableSeated");
    const netLink =
      powerOk &&
      yes(printer, "netCableSeated") &&
      yes(printer, "netPortOk") &&
      yes(printer, "netEnabled");
    const printReady =
      powerOk &&
      netLink &&
      printer.addressOk === true &&
      yes(printer, "paperOk") &&
      yes(printer, "tonerOk") &&
      yes(printer, "doorClosed") &&
      yes(printer, "spoolerRunning") &&
      printer.jamPresent !== true &&
      printer.queuePaused !== true;
    out.printer = { ...printer, powerOk, netLink, printReady };
  }

  const router = objOf(out.router);
  if (router) {
    const powerOk = yes(router, "powerOn");
    const wanLink = powerOk && yes(router, "wanCableSeated") && yes(router, "wanPortOk");
    const wanReachable =
      wanLink && yes(router, "upstreamOk") && router.wanConfigOk === true;
    const lanLink = powerOk && yes(router, "lanCableSeated");
    const poolFree = typeof router.dhcpPoolFree === "number" ? router.dhcpPoolFree : -1;
    const dhcpServing = lanLink && yes(router, "dhcpEnabled") && poolFree > 0;
    const clientPath = wanReachable && yes(router, "natEnabled") && dhcpServing;
    out.router = { ...router, powerOk, wanLink, wanReachable, lanLink, dhcpServing, clientPath };
  }

  const sw = objOf(out.switch);
  if (sw) {
    const powerOk = yes(sw, "powerOn");
    const uplinkLink = powerOk && yes(sw, "uplinkCableSeated") && yes(sw, "uplinkPortOk");
    const trunk = Array.isArray(sw.trunkCarries)
      ? (sw.trunkCarries as unknown[]).filter((v) => typeof v === "number")
      : [1];
    const portsRaw = Array.isArray(sw.ports) ? sw.ports : [];
    const ports = portsRaw.map((p) => {
      const port = objOf(p) ?? {};
      // A PoE port only links when its powered device actually got power
      // (`poePowered`, input; defaults to powered when absent).
      const link =
        powerOk &&
        yes(port, "cableSeated") &&
        port.enabled !== false &&
        port.faulty !== true &&
        (port.poe !== true || port.poePowered !== false);
      const vlan = typeof port.vlan === "number" ? port.vlan : 1;
      const path = link && uplinkLink && (vlan === 1 || trunk.includes(vlan));
      return { ...port, link, path };
    });
    const poeBudgetOk =
      typeof sw.poeBudgetW === "number" && typeof sw.poeUsedW === "number"
        ? sw.poeUsedW <= sw.poeBudgetW
        : undefined;
    out.switch = poeBudgetOk === undefined
      ? { ...sw, powerOk, uplinkLink, ports }
      : { ...sw, powerOk, uplinkLink, ports, poeBudgetOk };
  }

  const ap = objOf(out.ap);
  if (ap) {
    const poePowered = yes(ap, "poeCableSeated") && yes(ap, "upstreamPoeCapable");
    const radioUp = poePowered && yes(ap, "radioEnabled");
    const clientLink =
      radioUp && yes(ap, "pskOk") && yes(ap, "channelClear") && yes(ap, "clientAssociated");
    const pathOk = clientLink && yes(ap, "clientIpOk");
    out.ap = { ...ap, poePowered, radioUp, clientLink, pathOk };
  }

  const ups = objOf(out.ups);
  if (ups) {
    const mode = typeof ups.mode === "string" ? ups.mode : "online";
    const onUtility = yes(ups, "inputPresent") && yes(ups, "breakerOk") && mode === "online";
    const outputPresent =
      yes(ups, "breakerOk") &&
      yes(ups, "outletsLive") &&
      (onUtility ||
        (mode === "battery" && yes(ups, "batteryOk")) ||
        (mode === "bypass" && yes(ups, "inputPresent")));
    const loadOk = typeof ups.loadPct === "number" ? ups.loadPct <= 80 : true;
    out.ups = { ...ups, onUtility, outputPresent, loadOk };
  }

  const patch = objOf(out.patch);
  if (patch) {
    const horizontalPort = typeof patch.horizontalPort === "number" ? patch.horizontalPort : -1;
    const patchPanelPort = typeof patch.patchPanelPort === "number" ? patch.patchPanelPort : -2;
    const panelMatch = horizontalPort === patchPanelPort;
    const pathOk =
      yes(patch, "endpointSeated") &&
      yes(patch, "horizontalSeated") &&
      yes(patch, "patchSeated") &&
      yes(patch, "switchPortEnabled") &&
      panelMatch;
    out.patch = { ...patch, panelMatch, pathOk };
  }

  return out;
}

/** Recompute dependent world state after a patch (hardware causality, derived flags). */
export function deriveWorld(world: Record<string, unknown>): Record<string, unknown> {
  const withEquipment = deriveEquipment(world);
  const bench = withEquipment.bench;
  if (bench && typeof bench === "object" && !Array.isArray(bench)) {
    const b = { ...(bench as Record<string, unknown>) };
    const wall = b.powerSwitchAtWall === true;
    const cable = b.powerCableSeated === true;
    const toggle = b.psuToggle !== false;
    const outputOk = wall && cable && toggle;
    b.psuOutputOk = outputOk;
    if (!outputOk) {
      b.fansSpin = false;
      b.ledsOn = false;
      b.posted = false;
    }
    if (b.fansSpin === true && b.posted !== true && b.frontPanelConnector === true) {
      b.posted = true;
    }
    if (b.posted === true && !outputOk) {
      b.posted = false;
    }
    return { ...withEquipment, bench: b };
  }
  return withEquipment;
}
