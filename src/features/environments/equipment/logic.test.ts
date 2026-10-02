import { describe, expect, it } from "vitest";
import { getScenario, getScenarios } from "@/content";
import { deviceFamilySchema, environmentSchema, type Scenario } from "@/content/schema";
import { applyAction, createRun, deriveWorld, evaluateAll, type RunState } from "@/engine";
import { FAMILIES, familyState, getFamily } from "./registry";
import {
  buildEquipmentHotspot,
  equipmentFocusComponent,
  equipmentFocusPreset,
} from "./hotspot";
import { patchPanelVisuals } from "./families/patchPanel";
import { switchVisuals } from "./families/switch";
import { accessPointVisuals } from "./families/accessPoint";
import { upsVisuals } from "./families/ups";
import { routerVisuals } from "./families/router";

const equipmentScenarios = getScenarios().filter(
  (s) => s.environment.kind === "equipment-bench",
);

function familyOf(s: Scenario) {
  const f = getFamily(s.environment.deviceFamily);
  expect(f, `${s.id} has no registered family`).not.toBeNull();
  return f!;
}

/** Id of the first action that sets `namespace.key` to true. */
function patchingActionId(s: Scenario, ns: string, key: string): string {
  const act = s.actions.find((a) => {
    const nsPatch = a.patch?.[ns];
    return (
      typeof nsPatch === "object" &&
      nsPatch !== null &&
      (nsPatch as Record<string, unknown>)[key] === true
    );
  });
  expect(act, `${s.id}: no action patches ${ns}.${key}`).toBeDefined();
  return act?.id ?? "";
}

function evidenceRows(s: Scenario, run: RunState, comp: string) {
  const hs = buildEquipmentHotspot(s, run, comp);
  expect(hs, `${s.id}/${comp} produced no hotspot`).not.toBeNull();
  return hs?.evidence ?? [];
}

/** Deep-cloned scenario seed for a single family namespace. */
function seedOf(id: string, ns: string): Record<string, unknown> {
  const s = getScenario(id);
  expect(s, `missing scenario ${id}`).toBeDefined();
  const world = s!.environment.initialWorld[ns];
  expect(world, `${id}/${ns} seed missing`).toBeTypeOf("object");
  return structuredClone(world) as Record<string, unknown>;
}

describe("registry and schema stay in sync", () => {
  it("FAMILIES covers exactly the schema device families", () => {
    expect(Object.keys(FAMILIES).sort()).toEqual([...deviceFamilySchema.options].sort());
  });

  it("every family component and camera preset exists in the shared focus enums", () => {
    const focusShape = environmentSchema.shape.focusTarget.unwrap().shape;
    const componentEnum = focusShape.componentId.options as readonly string[];
    const presetEnum = focusShape.cameraPreset.options as readonly string[];

    for (const family of Object.values(FAMILIES)) {
      expect(family.label.length, family.id).toBeGreaterThan(0);
      expect(family.chainLabel.length, family.id).toBeGreaterThan(0);
      expect(family.worldKey.length, family.id).toBeGreaterThan(0);
      expect(family.components.length, family.id).toBeGreaterThanOrEqual(3);
      expect(family.cameraPresets.length, family.id).toBeGreaterThanOrEqual(3);
      for (const c of family.components) {
        expect(componentEnum.includes(c.id), `${family.id}/${c.id}`).toBe(true);
        expect(c.label.length, `${family.id}/${c.id} label`).toBeGreaterThan(0);
        expect(c.identity.length, `${family.id}/${c.id} identity`).toBeGreaterThan(0);
        expect(c.description.length, `${family.id}/${c.id} description`).toBeGreaterThan(0);
        expect(c.evidence.length, `${family.id}/${c.id} evidence`).toBeGreaterThan(0);
      }
      for (const p of family.cameraPresets) {
        expect(presetEnum.includes(p.id), `${family.id}/${p.id}`).toBe(true);
        expect([...p.pos, ...p.target].every(Number.isFinite), `${family.id}/${p.id}`).toBe(true);
      }
    }
  });
});

describe("equipment scenario catalog", () => {
  it("ships 31 scenarios across the six families (100 total)", () => {
    expect(getScenarios().length).toBe(100);
    expect(equipmentScenarios.length).toBe(31);

    const counts: Record<string, number> = {};
    for (const s of equipmentScenarios) {
      const id = s.environment.deviceFamily ?? "(none)";
      counts[id] = (counts[id] ?? 0) + 1;
    }
    expect(counts).toEqual({
      printer: 5,
      router: 6,
      switch: 5,
      "access-point": 6,
      ups: 5,
      "patch-panel": 4,
    });
  });

  it("kind and deviceFamily agree, and every scenario targets its own family", () => {
    for (const s of getScenarios()) {
      const isBench = s.environment.kind === "equipment-bench";
      expect(isBench, s.id).toBe(s.environment.deviceFamily !== undefined);
      if (!isBench) continue;

      const family = familyOf(s);
      expect(s.category, s.id).toBe("hardware");
      expect(s.environment.shell, s.id).toBe("none");
      expect(s.environment.availableTools, s.id).toEqual(
        expect.arrayContaining(["device-panel", "inspection"]),
      );

      for (const comp of s.environment.components) {
        expect(
          family.components.some((c) => c.id === comp),
          `${s.id}: component ${comp} not in ${family.id} family`,
        ).toBe(true);
      }

      expect(s.environment.focusTarget, `${s.id} missing focusTarget`).toBeDefined();
      expect(equipmentFocusComponent(s.environment), s.id).toBe(
        s.environment.focusTarget?.componentId,
      );
      expect(equipmentFocusPreset(s.environment), s.id).toBe(
        s.environment.focusTarget?.cameraPreset,
      );
    }
  });
});

describe("seeded worlds match deriveWorld (createRun does not re-derive)", () => {
  it("every scenario's initialWorld is already derived", () => {
    for (const s of getScenarios()) {
      const seeded = s.environment.initialWorld;
      expect(deriveWorld(structuredClone(seeded)), s.id).toEqual(seeded);
    }
  });
});

describe("family derivation rules", () => {
  it("printer: power, link, and print-ready cascade", () => {
    const base = {
      powerOn: true,
      powerCableSeated: true,
      netCableSeated: true,
      netPortOk: true,
      netEnabled: true,
      addressOk: true,
      paperOk: true,
      tonerOk: true,
      doorClosed: true,
      spoolerRunning: true,
      jamPresent: false,
      queuePaused: true,
    };
    const paused = deriveWorld({ printer: base }).printer as Record<string, unknown>;
    expect(paused.powerOk).toBe(true);
    expect(paused.netLink).toBe(true);
    expect(paused.printReady).toBe(false);

    const ready = deriveWorld({
      printer: { ...base, queuePaused: false },
    }).printer as Record<string, unknown>;
    expect(ready.printReady).toBe(true);

    const unplugged = deriveWorld({
      printer: { ...base, queuePaused: false, netCableSeated: false },
    }).printer as Record<string, unknown>;
    expect(unplugged.netLink).toBe(false);
    expect(unplugged.printReady).toBe(false);
  });

  it("router: WAN, DHCP, NAT, and client path cascade", () => {
    const base = {
      powerOn: true,
      wanCableSeated: true,
      wanPortOk: true,
      upstreamOk: true,
      wanConfigOk: true,
      lanCableSeated: true,
      dhcpEnabled: true,
      dhcpPoolFree: 10,
      natEnabled: true,
    };
    const up = deriveWorld({ router: base }).router as Record<string, unknown>;
    expect(up).toMatchObject({
      powerOk: true,
      wanLink: true,
      wanReachable: true,
      lanLink: true,
      dhcpServing: true,
      clientPath: true,
    });

    const empty = deriveWorld({
      router: { ...base, dhcpPoolFree: 0 },
    }).router as Record<string, unknown>;
    expect(empty.dhcpServing).toBe(false);
    expect(empty.clientPath).toBe(false);
  });

  it("switch: port link requires link conditions and powered PoE devices", () => {
    const sw = {
      powerOn: true,
      uplinkCableSeated: true,
      uplinkPortOk: true,
      trunkCarries: [1],
      ports: [
        { id: 1, cableSeated: true, poe: true, poePowered: false },
        { id: 2, cableSeated: true, poe: true },
        { id: 3, cableSeated: true, enabled: false },
        { id: 4, cableSeated: true, faulty: true },
        { id: 5, cableSeated: true, vlan: 10 },
      ],
    };
    const derived = deriveWorld({ switch: sw }).switch as Record<string, unknown>;
    const ports = derived.ports as Array<Record<string, unknown>>;
    expect(derived.powerOk).toBe(true);
    expect(derived.uplinkLink).toBe(true);
    expect(ports[0]).toMatchObject({ link: false, path: false }); // PoE PD unpowered
    expect(ports[1]).toMatchObject({ link: true, path: true }); // poePowered defaults powered
    expect(ports[2]).toMatchObject({ link: false, path: false }); // administratively down
    expect(ports[3]).toMatchObject({ link: false, path: false }); // faulty port
    expect(ports[4]).toMatchObject({ link: true, path: false }); // VLAN not on trunk
  });

  it("access point: PoE power, radio, association, and path cascade", () => {
    const base = {
      poeCableSeated: true,
      upstreamPoeCapable: true,
      radioEnabled: true,
      pskOk: true,
      channelClear: true,
      clientAssociated: true,
      clientIpOk: true,
    };
    const up = deriveWorld({ ap: base }).ap as Record<string, unknown>;
    expect(up).toMatchObject({
      poePowered: true,
      radioUp: true,
      clientLink: true,
      pathOk: true,
    });

    const noPoe = deriveWorld({
      ap: { ...base, upstreamPoeCapable: false },
    }).ap as Record<string, unknown>;
    expect(noPoe.poePowered).toBe(false);
    expect(noPoe.radioUp).toBe(false);
    expect(noPoe.pathOk).toBe(false);
  });

  it("UPS: utility, output, and load checks cascade", () => {
    const base = {
      inputPresent: true,
      breakerOk: true,
      outletsLive: true,
      mode: "online",
      loadPct: 60,
    };
    const online = deriveWorld({ ups: base }).ups as Record<string, unknown>;
    expect(online).toMatchObject({ onUtility: true, outputPresent: true, loadOk: true });

    const heavy = deriveWorld({ ups: { ...base, loadPct: 95 } }).ups as Record<
      string,
      unknown
    >;
    expect(heavy.loadOk).toBe(false);

    const onBattery = deriveWorld({
      ups: { ...base, mode: "battery", batteryOk: false },
    }).ups as Record<string, unknown>;
    expect(onBattery.onUtility).toBe(false);
    expect(onBattery.outputPresent).toBe(false);
  });

  it("patch panel: port match and end-to-end path", () => {
    const base = {
      endpointSeated: true,
      horizontalSeated: true,
      patchSeated: true,
      switchPortEnabled: true,
      horizontalPort: 12,
      patchPanelPort: 12,
    };
    const ok = deriveWorld({ patch: base }).patch as Record<string, unknown>;
    expect(ok).toMatchObject({ panelMatch: true, pathOk: true });

    const mislabelled = deriveWorld({
      patch: { ...base, patchPanelPort: 14 },
    }).patch as Record<string, unknown>;
    expect(mislabelled.panelMatch).toBe(false);
    expect(mislabelled.pathOk).toBe(false);
  });
});

describe("spoiler gating: root-cause facts stay hidden until checked", () => {
  it("printer: queue pause hidden until the queue is read", () => {
    const s = getScenarios().find((x) => x.id === "printer-queue-paused");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "printer").map((e) => e.label)).not.toContain(
      "Queue paused",
    );

    const family = familyOf(s);
    const t0 = family.chain(familyState(run.world, family)).find((c) => c.id === "queue");
    expect(t0?.state).toBe("Not checked");

    run = applyAction(s, run, patchingActionId(s, "printer", "queueChecked"));
    const rows = evidenceRows(s, run, "printer");
    const row = rows.find((e) => e.label === "Queue paused");
    expect(row).toBeDefined();
    expect(row?.value).toBe("Paused");
    expect(row?.tone).toBe("warn");
    const after = family.chain(familyState(run.world, family)).find((c) => c.id === "queue");
    expect(after?.state).toBe("Paused");
  });

  it("printer: upstream port verdict hidden until the neighbour is inspected", () => {
    const s = getScenarios().find((x) => x.id === "printer-network-unreachable");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "printer-network").map((e) => e.label)).not.toContain(
      "Upstream port",
    );

    run = applyAction(s, run, patchingActionId(s, "printer", "neighborChecked"));
    const row = evidenceRows(s, run, "printer-network").find(
      (e) => e.label === "Upstream port",
    );
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });

  it("router: WAN cable seat hidden until the uplink is checked", () => {
    const s = getScenarios().find((x) => x.id === "router-cable-loose-wan");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "router-wan").map((e) => e.label)).not.toContain(
      "WAN cable",
    );

    run = applyAction(s, run, patchingActionId(s, "router", "wanChecked"));
    const row = evidenceRows(s, run, "router-wan").find((e) => e.label === "WAN cable");
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });

  it("switch: uplink cable seat hidden until the uplink is checked", () => {
    const s = getScenarios().find((x) => x.id === "switch-uplink-down");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "switch-uplink").map((e) => e.label)).not.toContain(
      "Uplink cable",
    );

    run = applyAction(s, run, patchingActionId(s, "switch", "uplinkChecked"));
    const row = evidenceRows(s, run, "switch-uplink").find(
      (e) => e.label === "Uplink cable",
    );
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });

  it("access point: radio state hidden until association is checked", () => {
    const s = getScenarios().find((x) => x.id === "ap-radio-disabled");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "ap-radio").map((e) => e.label)).not.toContain(
      "Radio enabled",
    );

    run = applyAction(s, run, patchingActionId(s, "ap", "assocChecked"));
    const row = evidenceRows(s, run, "ap-radio").find(
      (e) => e.label === "Radio enabled",
    );
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });

  it("UPS: battery health hidden until the battery is checked", () => {
    const s = getScenarios().find((x) => x.id === "ups-battery-expired");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "ups-battery").map((e) => e.label)).not.toContain(
      "Battery",
    );

    run = applyAction(s, run, patchingActionId(s, "ups", "batteryChecked"));
    const row = evidenceRows(s, run, "ups-battery").find((e) => e.label === "Battery");
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });

  it("patch panel: switch-port enablement hidden until the path is traced", () => {
    const s = getScenarios().find((x) => x.id === "patch-switch-port-disabled");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(evidenceRows(s, run, "switch-port").map((e) => e.label)).not.toContain(
      "Port enabled",
    );

    run = applyAction(s, run, patchingActionId(s, "patch", "patchChecked"));
    const row = evidenceRows(s, run, "switch-port").find(
      (e) => e.label === "Port enabled",
    );
    expect(row).toBeDefined();
    expect(row?.value).toBe("fail");
    expect(row?.tone).toBe("crit");
  });
});

describe("world-driven fix progression (switch PoE overload)", () => {
  it("rebalancing the draw powers the unpowered ports and clears the budget", () => {
    const s = getScenarios().find((x) => x.id === "switch-poe-overload");
    expect(s).toBeDefined();
    if (!s) return;

    const seeded = familyOf(s).worldKey;
    expect(seeded).toBe("switch");

    let run = createRun(s, "guided");
    const t0 = (run.world.switch as { ports: Array<Record<string, unknown>> }).ports;
    expect(t0[2]).toMatchObject({ poePowered: false, link: false, path: false });
    expect(t0[3]).toMatchObject({ poePowered: false, link: false, path: false });

    run = applyAction(s, run, "check-poe-budget");
    run = applyAction(s, run, "move-bench-tester-to-injector");

    const ports = (run.world.switch as { ports: Array<Record<string, unknown>> }).ports;
    expect(ports[2]).toMatchObject({ poePowered: true, link: true, path: true });
    expect(ports[3]).toMatchObject({ poePowered: true, link: true, path: true });
    expect(run.world.switch).toMatchObject({ poeBudgetOk: true });
  });
});

describe("hotspot builder covers every component of every scenario", () => {
  it("produces a labelled hotspot and never throws on family derivations", () => {
    expect(equipmentScenarios.length).toBe(31);
    for (const s of equipmentScenarios) {
      const family = familyOf(s);
      const run = createRun(s, "guided");
      const state = familyState(run.world, family);

      const status = family.status(state);
      expect(status.label.length, `${s.id} status`).toBeGreaterThan(0);
      const chain = family.chain(state);
      expect(chain.length, `${s.id} chain`).toBeGreaterThanOrEqual(3);
      for (const step of chain) {
        expect(step.state.length, `${s.id}/${step.id}`).toBeGreaterThan(0);
        expect(family.components.some((c) => c.id === step.component), `${s.id}/${step.id}`).toBe(
          true,
        );
      }

      for (const comp of family.components) {
        const view = family.componentState(comp.id, state);
        expect(view.label.length, `${s.id}/${comp.id} state`).toBeGreaterThan(0);
        const hs = buildEquipmentHotspot(s, run, comp.id);
        expect(hs, `${s.id}/${comp.id}`).not.toBeNull();
        expect(hs?.label.length, `${s.id}/${comp.id} label`).toBeGreaterThan(0);
        expect(hs?.stateSummary?.length, `${s.id}/${comp.id} summary`).toBeGreaterThan(0);
      }
    }
  });
});

describe("focus helpers narrow to the scenario's own family", () => {
  it("accepts family members and rejects foreign ids", () => {
    expect(
      equipmentFocusComponent({ deviceFamily: "printer", focusTarget: { componentId: "printer" } }),
    ).toBe("printer");
    expect(
      equipmentFocusComponent({
        deviceFamily: "printer",
        focusTarget: { componentId: "motherboard" },
      }),
    ).toBeNull();
    expect(
      equipmentFocusPreset({
        deviceFamily: "router",
        focusTarget: { cameraPreset: "router-wan" },
      }),
    ).toBe("router-wan");
    expect(
      equipmentFocusPreset({
        deviceFamily: "router",
        focusTarget: { cameraPreset: "motherboard" },
      }),
    ).toBeNull();
    expect(equipmentFocusComponent({ deviceFamily: "printer" })).toBeNull();
    expect(equipmentFocusPreset({ deviceFamily: "printer" })).toBeNull();
  });

  it("familyState returns an empty object for a missing world namespace", () => {
    expect(familyState({}, FAMILIES.printer)).toEqual({});
    expect(familyState({ printer: [] }, FAMILIES.printer)).toEqual({});
  });
});

describe("P1-2 gate pairs: checked-class facts stay neutral until their check", () => {
  it("patch panel: horizontal run geometry and the disabled-port lamp need their checks", () => {
    const base = { switchPortNumber: 2, switchPortEnabled: false, horizontalPort: 5 };

    const pre = patchPanelVisuals(base);
    expect(pre.activeRunIndex).toBeNull();
    expect(pre.switchPortLeds[1]).toBe("off");

    const checked = patchPanelVisuals({ ...base, patchChecked: true });
    expect(checked.switchPortLeds[1]).toBe("warn");

    const traced = patchPanelVisuals({ ...base, horizontalTraced: true });
    expect(traced.activeRunIndex).toBe(4);
  });

  it("switch: trunk badge tone and PoE lamp need their checks", () => {
    const vlan = seedOf("switch-vlan-mismatch", "switch");
    expect(switchVisuals(vlan).trunkTone).toBe("off");
    expect(switchVisuals({ ...vlan, trunkChecked: true }).trunkTone).not.toBe("off");

    const poe = seedOf("switch-poe-overload", "switch");
    expect(switchVisuals(poe).poeLed).toBeNull();
    expect(switchVisuals({ ...poe, poeChecked: true }).poeLed).toBe("crit");
  });

  it("access point: upstream lamp stays dark until association is checked", () => {
    const seed = seedOf("ap-radio-disabled", "ap");
    expect(accessPointVisuals(seed).upstreamLed).toBe("off");
    expect(accessPointVisuals({ ...seed, assocChecked: true }).upstreamLed).not.toBe("off");
  });

  it("UPS: breaker, battery, and outlet lamps stay dark until inspected", () => {
    const trip = seedOf("ups-breaker-tripped", "ups");
    expect(upsVisuals(trip).breakerLed).toBe("off");
    expect(upsVisuals({ ...trip, breakerChecked: true }).breakerLed).toBe("crit");

    const expired = seedOf("ups-battery-expired", "ups");
    expect(upsVisuals(expired).batteryLed).toBe("off");
    expect(upsVisuals({ ...expired, batteryChecked: true }).batteryLed).toBe("crit");

    const bank = seedOf("ups-outlet-group-dead", "ups");
    expect(upsVisuals(bank).outletsLed).toBe("off");
    expect(upsVisuals({ ...bank, outletChecked: true }).outletsLed).toBe("crit");
    expect(upsVisuals({ ...bank, outputPresent: true }).outletsLed).toBe("ok");
  });

  it("router: NAT, DHCP, and internet lamps stay dark until checked", () => {
    const nat = seedOf("router-nat-disabled", "router");
    expect(routerVisuals(nat).natLed).toBe("off");
    expect(routerVisuals({ ...nat, natChecked: true }).natLed).not.toBe("off");

    const dhcp = seedOf("router-dhcp-exhausted", "router");
    expect(routerVisuals(dhcp).dhcpLed).toBe("off");
    expect(routerVisuals({ ...dhcp, dhcpChecked: true }).dhcpLed).not.toBe("off");

    const wan = seedOf("router-wan-misconfigured", "router");
    expect(routerVisuals(wan).internetLed).toBe("off");
    expect(routerVisuals({ ...wan, wanChecked: true }).internetLed).toBe("crit");
  });
});

describe("P1-1 reveal flags change what the inspector shows", () => {
  it("printer-paper: reading the panel alarm reveals the jam verdict", () => {
    const s = getScenario("printer-paper-jam");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    let hs = buildEquipmentHotspot(s, run, "printer-paper");
    expect(hs?.stateSummary).toBe("Alarm not read");
    expect(hs?.stateTone).toBe("unknown");
    expect((hs?.evidence ?? []).map((e) => e.label)).not.toContain("Jam");

    run = applyAction(s, run, patchingActionId(s, "printer", "alarmChecked"));
    hs = buildEquipmentHotspot(s, run, "printer-paper");
    expect(hs?.stateSummary).toBe("Jam present");
    expect(hs?.stateTone).toBe("crit");
    const jam = (hs?.evidence ?? []).find((e) => e.label === "Jam");
    expect(jam?.value).toBe("Present");
    expect(jam?.tone).toBe("crit");
  });

  it("printer-paper: tracing the paper path reveals the cover row", () => {
    const s = getScenario("printer-paper-jam");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(
      ((buildEquipmentHotspot(s, run, "printer-paper")?.evidence) ?? []).map((e) => e.label),
    ).not.toContain("Cover");

    run = applyAction(s, run, patchingActionId(s, "printer", "pathInspected"));
    const rows = buildEquipmentHotspot(s, run, "printer-paper")?.evidence ?? [];
    expect(rows.map((e) => e.label)).toContain("Cover");
  });

  it("printer-cartridge: the cartridge check reveals the toner verdict", () => {
    const s = getScenario("printer-low-toner");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    let hs = buildEquipmentHotspot(s, run, "printer-cartridge");
    expect(hs?.stateSummary).toBe("Not inspected");
    expect((hs?.evidence ?? []).map((e) => e.label)).not.toContain("Toner");

    run = applyAction(s, run, patchingActionId(s, "printer", "tonerChecked"));
    hs = buildEquipmentHotspot(s, run, "printer-cartridge");
    expect(hs?.stateSummary).toBe("Toner low");
    const toner = (hs?.evidence ?? []).find((e) => e.label === "Toner");
    expect(toner?.value).toBe("fail");
  });

  it("ups-input: inspecting the inlet reveals the utility verdict", () => {
    const s = getScenario("ups-input-unplugged");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    let hs = buildEquipmentHotspot(s, run, "ups-input");
    expect(hs?.stateSummary).toBe("Not checked");
    expect((hs?.evidence ?? []).map((e) => e.label)).not.toContain("Utility input");

    run = applyAction(s, run, patchingActionId(s, "ups", "inputChecked"));
    hs = buildEquipmentHotspot(s, run, "ups-input");
    expect(hs?.stateSummary).toBe("No input power");
    expect(hs?.stateTone).toBe("crit");
    const input = (hs?.evidence ?? []).find((e) => e.label === "Utility input");
    expect(input?.value).toBe("fail");
  });

  it("ups-output: inspecting the bank reveals the outlet verdict", () => {
    const s = getScenario("ups-outlet-group-dead");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    let hs = buildEquipmentHotspot(s, run, "ups-output");
    expect(hs?.stateSummary).toBe("Bank not inspected");
    expect((hs?.evidence ?? []).map((e) => e.label)).not.toContain("Outlet group");

    run = applyAction(s, run, patchingActionId(s, "ups", "outletChecked"));
    hs = buildEquipmentHotspot(s, run, "ups-output");
    expect(hs?.stateSummary).toBe("Outlets dead");
    expect(hs?.stateTone).toBe("crit");
    const outlets = (hs?.evidence ?? []).find((e) => e.label === "Outlet group");
    expect(outlets?.value).toBe("fail");
  });

  it("router-wan: the probe names the first dead hop and the fix verifies the path", () => {
    const s = getScenario("router-upstream-outage");
    expect(s).toBeDefined();
    if (!s) return;

    let run = createRun(s, "guided");
    expect(buildEquipmentHotspot(s, run, "router-wan")?.stateSummary).toBe(
      "Link up — path not checked",
    );

    run = applyAction(s, run, patchingActionId(s, "router", "wanChecked"));
    expect(buildEquipmentHotspot(s, run, "router-wan")?.stateSummary).toBe("Upstream down");

    run = applyAction(s, run, patchingActionId(s, "router", "probeDone"));
    const probed = buildEquipmentHotspot(s, run, "router-wan");
    expect(probed?.stateSummary).toBe("First ISP hop unreachable");
    expect(probed?.stateTone).toBe("crit");

    run = applyAction(s, run, patchingActionId(s, "router", "upstreamOk"));
    const fixed = buildEquipmentHotspot(s, run, "router-wan");
    expect(fixed?.stateSummary).toBe("Path verified");
    expect(fixed?.stateTone).toBe("ok");
  });
});

describe("printer-not-printing: migrated legacy seed stays stable", () => {
  it("seeds canonical printer keys only", () => {
    const s = getScenario("printer-not-printing");
    expect(s).toBeDefined();
    if (!s) return;
    const printer = s.environment.initialWorld.printer as Record<string, unknown>;
    for (const legacy of ["online", "tonerLow", "paperJam"]) {
      expect(Object.keys(printer), `legacy key ${legacy}`).not.toContain(legacy);
    }
    expect(printer).toMatchObject({
      queuePaused: true,
      verified: false,
      powerOk: true,
      netLink: true,
      printReady: false,
    });
  });

  it("deriveWorld is a no-op on the seeded world", () => {
    const s = getScenario("printer-not-printing");
    expect(s).toBeDefined();
    if (!s) return;
    const seeded = s.environment.initialWorld;
    expect(deriveWorld(structuredClone(seeded))).toEqual(seeded);
  });

  it("the documented fix sequence satisfies successConditions", () => {
    const s = getScenario("printer-not-printing");
    expect(s).toBeDefined();
    if (!s) return;

    const ctxOf = (world: Record<string, unknown>, applied: readonly string[]) => ({
      world,
      ranCommands: new Set<string>(),
      appliedActions: applied,
    });
    let run = createRun(s, "guided");
    expect(evaluateAll(s.successConditions, ctxOf(run.world, run.appliedActions))).toBe(false);

    run = applyAction(s, run, "open-queue");
    run = applyAction(s, run, "resume-queue");
    run = applyAction(s, run, "verify-page");

    expect(evaluateAll(s.successConditions, ctxOf(run.world, run.appliedActions))).toBe(true);
    expect(run.world.printer).toMatchObject({ queuePaused: false, verified: true, printReady: true });
  });
});
