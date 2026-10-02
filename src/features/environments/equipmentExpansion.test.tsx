import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { getScenario } from "@/content";
import type { DeviceFamilyId } from "@/content/schema";
import { applyAction, createRun } from "@/engine";
import { EnvironmentRenderer } from "./EnvironmentRenderer";
import { EquipmentLab } from "./EquipmentLab";
import { EquipmentLabView } from "./EquipmentLabView";
import { FAMILIES, familyState } from "./equipment/registry";
import {
  AP_PART_IDS,
  PATCH_PART_IDS,
  PRINTER_PART_IDS,
  ROUTER_PART_IDS,
  SWITCH_PART_IDS,
  UPS_PART_IDS,
} from "./equipment/3d/stages/partIds";
import { buildEquipmentHotspot } from "./equipment/hotspot";
import { AccessPointSvg } from "./equipment/svg/AccessPointSvg";
import { PrinterSvg } from "./equipment/svg/PrinterSvg";
import { RouterSvg } from "./equipment/svg/RouterSvg";
import { SwitchSvg } from "./equipment/svg/SwitchSvg";
import { UpsSvg } from "./equipment/svg/UpsSvg";
import { C, toneFill } from "./equipment/svg/palette";

const noop = () => {};

describe("equipment routing is data-driven", () => {
  it("renders the equipment lab for an equipment-bench scenario", () => {
    const scenario = getScenario("printer-queue-paused");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    render(
      <EnvironmentRenderer scenario={scenario} run={run} onAction={noop} />,
    );
    expect(screen.getByTestId("equipment-lab")).toBeInTheDocument();
    expect(screen.getByTestId("printer-svg")).toBeInTheDocument();
  });

  it("keeps the hardware bench on hardware scenarios", () => {
    const scenario = getScenario("pc-no-power");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    const run = createRun(scenario, "guided");

    render(
      <EnvironmentRenderer scenario={scenario} run={run} onAction={noop} />,
    );
    expect(screen.queryByTestId("equipment-lab")).toBeNull();
    expect(
      screen.getByLabelText("Open PC chassis on workbench with power path"),
    ).toBeInTheDocument();
  });
});

describe("2D stage honors scenario component visibility", () => {
  it("printer-queue-paused hides the toner cartridge hotspot", () => {
    const scenario = getScenario("printer-queue-paused");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );

    const hotspots = container.querySelectorAll("g.hotspot");
    expect(hotspots.length).toBe(scenario.environment.components.length);
    expect(hotspots.length).toBe(3);
    expect(screen.queryByRole("button", { name: "Toner cartridge door" })).toBeNull();
    expect(screen.getByRole("button", { name: "Printer network port" })).toBeTruthy();
  });

  it("printer-ip-conflict shows network parts only", () => {
    const scenario = getScenario("printer-ip-conflict");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );

    const hotspots = container.querySelectorAll("g.hotspot");
    expect(hotspots.length).toBe(2);
    expect(screen.queryByRole("button", { name: "Paper tray" })).toBeNull();
    expect(screen.getByRole("button", { name: "Printer network port" })).toBeTruthy();
  });

  it("full-visibility families render every family component", () => {
    const cases: Array<[string, DeviceFamilyId]> = [
      ["router-wan-misconfigured", "router"],
      ["switch-port-shutdown", "switch"],
      ["ap-drop-unplugged", "access-point"],
      ["ups-battery-expired", "ups"],
      ["patch-keystone-loose", "patch-panel"],
    ];
    for (const [id, familyId] of cases) {
      const scenario = getScenario(id);
      expect(scenario, id).toBeDefined();
      if (!scenario) continue;
      const run = createRun(scenario, "guided");
      const { container, unmount } = render(
        <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
      );
      const family = FAMILIES[familyId];
      expect(container.querySelectorAll("g.hotspot").length, id).toBe(
        family.components.length,
      );
      unmount();
    }
  });
});

describe("3D stage id parity with the family model", () => {
  it("every family's stage PART_IDS equals its component vocabulary", () => {
    const stageParts: Record<DeviceFamilyId, readonly string[]> = {
      printer: PRINTER_PART_IDS,
      router: ROUTER_PART_IDS,
      switch: SWITCH_PART_IDS,
      "access-point": AP_PART_IDS,
      ups: UPS_PART_IDS,
      "patch-panel": PATCH_PART_IDS,
    };
    for (const [id, family] of Object.entries(FAMILIES)) {
      const parts = stageParts[id as DeviceFamilyId];
      expect([...parts].sort(), id).toEqual(family.components.map((c) => c.id).sort());
    }
  });
});

describe("EquipmentLabView: capability gate and shared selection", () => {
  it("falls back to the SVG stage when WebGL is unavailable", () => {
    const scenario = getScenario("printer-queue-paused");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<EquipmentLabView scenario={scenario} run={run} onInspect={noop} />);

    expect(screen.getByTestId("printer-svg")).toBeInTheDocument();
    expect(screen.queryByTestId("equipment-stage-3d")).toBeNull();
    // jsdom has no WebGL, so the view toggle is not offered.
    expect(screen.queryByRole("button", { name: "3D" })).toBeNull();
  });

  it("opens on the declarative focus target with the inspector showing", () => {
    const scenario = getScenario("ups-battery-expired");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<EquipmentLabView scenario={scenario} run={run} onInspect={noop} />);

    expect(scenario.environment.focusTarget?.componentId).toBe("ups-battery");
    expect(screen.getByLabelText("Inspecting Battery")).toBeInTheDocument();
  });

  it("SVG hotspot clicks and legend chips drive the same selection state", () => {
    const scenario = getScenario("printer-queue-paused");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<EquipmentLabView scenario={scenario} run={run} onInspect={noop} />);

    expect(screen.getByLabelText("Inspecting Printer")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Printer network port" }));
    expect(screen.getByLabelText("Inspecting Network port")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByLabelText("Inspecting Network port")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Network port" }));
    expect(screen.getByLabelText("Inspecting Network port")).toBeInTheDocument();
  });
});

describe("family chrome: chain and status are world-driven", () => {
  it("printer queue step reads Not checked until the queue menu is opened", () => {
    const scenario = getScenario("printer-queue-paused");
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    const first = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );
    const queue = () =>
      first.container.querySelector('[data-chain-step="queue"]')?.textContent ?? "";
    expect(queue()).toContain("Not checked");

    run = applyAction(scenario, run, "check-queue");
    first.rerender(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );
    expect(queue()).toContain("Paused");
  });

  it("switch status only reports the PoE overrun after the budget check", () => {
    const scenario = getScenario("switch-poe-overload");
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    const view = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );
    const header = () =>
      view.container.querySelector(".panel-header")?.textContent ?? "";
    expect(header()).not.toContain("PoE over budget");

    run = applyAction(scenario, run, "check-poe-budget");
    view.rerender(<EquipmentLab scenario={scenario} run={run} onInspect={noop} />);
    expect(header()).toContain("PoE over budget");
  });

  it("UPS battery verdict stays neutral until the battery is checked", () => {
    const scenario = getScenario("ups-battery-expired");
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    const view = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );
    const header = () =>
      view.container.querySelector(".panel-header")?.textContent ?? "";
    expect(header()).toContain("Online");

    run = applyAction(scenario, run, "check-battery");
    view.rerender(<EquipmentLab scenario={scenario} run={run} onInspect={noop} />);
    expect(header()).toContain("Battery weak");
  });

  it("patch status walks not-traced to switch-port-down as evidence lands", () => {
    const scenario = getScenario("patch-switch-port-disabled");
    if (!scenario) return;

    let run = createRun(scenario, "guided");
    const view = render(
      <EquipmentLab scenario={scenario} run={run} onInspect={noop} />,
    );
    expect(screen.getByText("Path not fully traced")).toBeInTheDocument();

    run = applyAction(scenario, run, "trace-path");
    view.rerender(<EquipmentLab scenario={scenario} run={run} onInspect={noop} />);
    expect(screen.getByText("Switch port down")).toBeInTheDocument();
  });
});

describe("SVG gating: checked-class verdicts are invisible before the check", () => {
  it("router: MODEM lives in the WAN hotspot and its lamp waits for the WAN check", () => {
    const scenario = getScenario("router-upstream-outage");
    if (!scenario) return;
    const base = scenario.environment.initialWorld.router as Record<string, unknown>;

    const hidden = render(
      <RouterSvg
        state={base}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={(id) => id !== "router-wan"}
      />,
    );
    expect(screen.queryByText("MODEM")).toBeNull();
    hidden.unmount();

    const view = render(
      <RouterSvg state={base} statusLabel="" selected={null} onSelect={noop} visible={() => true} />,
    );
    const modem = screen.getByText("MODEM");
    expect(modem.closest("g")?.getAttribute("aria-label")).toBe("Router WAN");
    expect(view.container.querySelector('circle[cx="34"][cy="72"]')?.getAttribute("fill")).toBe(
      toneFill("off"),
    );

    view.rerender(
      <RouterSvg
        state={{ ...base, wanChecked: true }}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(view.container.querySelector('circle[cx="34"][cy="72"]')?.getAttribute("fill")).toBe(
      toneFill("crit"),
    );
  });

  it("UPS: the breaker verdict stays neutral until the breaker is inspected", () => {
    const scenario = getScenario("ups-breaker-tripped");
    if (!scenario) return;
    const base = scenario.environment.initialWorld.ups as Record<string, unknown>;

    const view = render(
      <UpsSvg
        state={base}
        statusLabel="No output"
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.queryByText("TRIP")).toBeNull();

    view.rerender(
      <UpsSvg
        state={{ ...base, breakerChecked: true }}
        statusLabel="No output"
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(screen.getByText("TRIP")).toBeInTheDocument();
    expect(screen.queryByText("—")).toBeNull();
  });

  it("UPS: outlet sockets only turn red after the dead bank is inspected", () => {
    const scenario = getScenario("ups-outlet-group-dead");
    if (!scenario) return;
    const base = scenario.environment.initialWorld.ups as Record<string, unknown>;

    const view = render(
      <UpsSvg
        state={base}
        statusLabel="No output"
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    const sockets = () => [...view.container.querySelectorAll('rect[fill="#0a0f1a"]')];
    expect(sockets().length).toBe(6);
    expect(sockets().every((r) => r.getAttribute("stroke") === C.edge)).toBe(true);

    view.rerender(
      <UpsSvg
        state={{ ...base, outletChecked: true }}
        statusLabel="No output"
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(sockets().every((r) => r.getAttribute("stroke") === C.crit)).toBe(true);
  });
});

describe("final correction: canvas verdicts wait for their evidence", () => {
  it("printer-paper-jam: the jam verdict appears only after the panel alarm is read", () => {
    const scenario = getScenario("printer-paper-jam");
    if (!scenario) return;
    const family = FAMILIES.printer;
    let run = createRun(scenario, "guided");
    const state = () => familyState(run.world, family);

    expect(family.status(state()).label).not.toBe("Jam");

    const pre = render(
      <PrinterSvg
        state={state()}
        statusLabel={family.status(state()).label}
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(screen.getByText("Not ready")).toBeInTheDocument();
    expect(screen.queryByText("PAPER JAM")).toBeNull();
    expect(pre.container.querySelector('rect[x="172"][y="136"]')?.getAttribute("stroke")).toBe(
      C.edge,
    );
    const preHs = buildEquipmentHotspot(scenario, run, "printer-paper");
    expect(preHs?.stateSummary).toBe("Alarm not read");
    expect(preHs?.stateTone).toBe("unknown");
    pre.unmount();

    const checkPanel = scenario.actions.find(
      (a) => (a.patch?.printer as Record<string, unknown> | undefined)?.alarmChecked === true,
    );
    expect(checkPanel).toBeDefined();
    if (!checkPanel) return;
    run = applyAction(scenario, run, checkPanel.id);

    expect(family.status(state()).label).toBe("Jam");
    const post = render(
      <PrinterSvg
        state={state()}
        statusLabel={family.status(state()).label}
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(screen.getByText("Jam")).toBeInTheDocument();
    expect(screen.getByText("PAPER JAM")).toBeInTheDocument();
    expect(post.container.querySelector('rect[x="172"][y="136"]')?.getAttribute("stroke")).toBe(
      C.crit,
    );
    const postHs = buildEquipmentHotspot(scenario, run, "printer-paper");
    expect(postHs?.stateSummary).toBe("Jam present");
    expect(postHs?.stateTone).toBe("crit");
    expect((postHs?.evidence ?? []).map((e) => e.label)).toContain("Jam");
  });

  it("switch-vlan-mismatch: the trunk badge prints only after the trunk check", () => {
    const scenario = getScenario("switch-vlan-mismatch");
    if (!scenario) return;
    const base = scenario.environment.initialWorld.switch as Record<string, unknown>;

    const view = render(
      <SwitchSvg
        state={base}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    const badge = () => view.container.querySelector('text[x="166"][y="146"]');
    expect(badge()?.textContent).toBe("? ? ?");
    expect(badge()?.getAttribute("fill")).toBe(C.muted);

    view.rerender(
      <SwitchSvg
        state={{ ...base, trunkChecked: true }}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(badge()?.textContent).toBe("1");
    expect(badge()?.getAttribute("fill")).toBe(C.warn);
  });

  it("ap-poe-port-disabled: the PoE SW lamp waits for the drop inspection", () => {
    const scenario = getScenario("ap-poe-port-disabled");
    if (!scenario) return;
    const base = scenario.environment.initialWorld.ap as Record<string, unknown>;

    const view = render(
      <AccessPointSvg
        state={base}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(screen.getByText("PoE SW")).toBeInTheDocument();
    const lamp = () => view.container.querySelector('circle[cx="382"][cy="123"]');
    expect(lamp()?.getAttribute("fill")).toBe(toneFill("off"));

    view.rerender(
      <AccessPointSvg
        state={{ ...base, assocChecked: true }}
        statusLabel=""
        selected={null}
        onSelect={noop}
        visible={() => true}
      />,
    );
    expect(lamp()?.getAttribute("fill")).toBe(toneFill("warn"));
  });
});
