import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { applyAction, canVerify, createRun, verify } from "@/engine";
import { getScenario } from "@/content";
import { buildBenchHotspot } from "@/features/environments/benchHotspot";
import { HardwareLab } from "@/features/environments/HardwareLab";
import { HardwareLabView } from "@/features/environments/HardwareLabView";
import { scenePartVisibility } from "@/features/environments/hardware3d/partVisibility";
import { CAMERA_PRESETS } from "@/features/environments/hardware3d/presets";

describe("hardware expansion: progressive hotspot summaries", () => {
  it("RAM fault stays hidden until the memory test runs", () => {
    const scenario = getScenario("ram-instability-crashes");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    const before = buildBenchHotspot(scenario, run, "ram");
    expect(before?.stateSummary).toBe("OK");
    expect(before?.stateTone).toBe("ok");

    run = applyAction(scenario, run, "run-memory-test");
    const after = buildBenchHotspot(scenario, run, "ram");
    expect(after?.stateSummary).toContain("Memory test failed");
    expect(after?.stateTone).toBe("crit");

    run = applyAction(scenario, run, "remove-failed-dimm");
    run = applyAction(scenario, run, "verify-stability");
    const fixed = buildBenchHotspot(scenario, run, "ram");
    expect(fixed?.stateSummary).toBe("Memory test passed");
    expect(fixed?.stateTone).toBe("ok");
  });

  it("CPU cooler reports the stopped fan, then recovery after the fix", () => {
    const scenario = getScenario("cpu-thermal-shutdown");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    const before = buildBenchHotspot(scenario, run, "cpu-cooler");
    expect(before?.stateSummary).toBe("CPU fan not spinning");
    expect(before?.stateTone).toBe("crit");
    const fanRow = before?.evidence?.find((e) => e.label === "CPU fan");
    expect(fanRow?.value).toBe("fail");

    run = applyAction(scenario, run, "inspect-cooler-fan");
    run = applyAction(scenario, run, "reseat-fan-header");
    const after = buildBenchHotspot(scenario, run, "cpu-cooler");
    expect(after?.stateSummary).toBe("Fans spinning");
    expect(after?.stateTone).toBe("ok");
  });

  it("storage walks disconnected → undetected → reachable", () => {
    const scenario = getScenario("storage-not-detected");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    const initial = buildBenchHotspot(scenario, run, "storage");
    expect(initial?.stateSummary).toBe("Data cable disconnected");
    expect(initial?.stateTone).toBe("crit");
    expect(initial?.evidence?.find((e) => e.label === "SATA data cable")?.value).toBe("fail");
    expect(initial?.evidence?.find((e) => e.label === "Firmware detects drive")?.value).toBe(
      "fail",
    );

    run = applyAction(scenario, run, "inspect-sata-cables");
    run = applyAction(scenario, run, "reseat-sata-data");
    const cabled = buildBenchHotspot(scenario, run, "storage");
    expect(cabled?.stateSummary).toBe("Not detected by firmware");

    run = applyAction(scenario, run, "check-boot-order");
    run = applyAction(scenario, run, "verify-boot");
    const fixed = buildBenchHotspot(scenario, run, "storage");
    expect(fixed?.stateSummary).toBe("Reachable after POST");
    expect(fixed?.stateTone).toBe("ok");
    expect(fixed?.evidence?.find((e) => e.label === "Firmware detects drive")?.value).toBe(
      "ok",
    );
  });

  it("existing hardware scenarios keep their original summaries", () => {
    const display = getScenario("pc-on-no-display");
    expect(display).toBeDefined();
    if (display) {
      const run = createRun(display, "guided");
      expect(buildBenchHotspot(display, run, "ram")?.stateSummary).toBe("Unseated");
      expect(buildBenchHotspot(display, run, "ram")?.stateTone).toBe("crit");
    }

    const dead = getScenario("pc-no-power");
    expect(dead).toBeDefined();
    if (dead) {
      const run = createRun(dead, "guided");
      expect(buildBenchHotspot(dead, run, "storage")?.stateSummary).toBe("Not reached yet");
      expect(buildBenchHotspot(dead, run, "storage")?.stateTone).toBe("unknown");
    }
  });
});

describe("hardware expansion: evidence-first gates", () => {
  it("SATA reseat is blocked until the cables were inspected", () => {
    const scenario = getScenario("storage-not-detected");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "reseat-sata-data");
    expect(run.appliedActions).not.toContain("reseat-sata-data");
    expect(run.lastFeedback).toMatch(/gather more evidence/i);
  });

  it("boot verification needs both the reseat AND the boot-order rule-out", () => {
    const scenario = getScenario("storage-not-detected");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    run = applyAction(scenario, run, "read-boot-error");
    run = applyAction(scenario, run, "inspect-sata-cables");
    run = applyAction(scenario, run, "reseat-sata-data");
    expect(run.appliedActions).toContain("reseat-sata-data");

    run = applyAction(scenario, run, "verify-boot");
    expect(run.appliedActions).not.toContain("verify-boot");

    run = applyAction(scenario, run, "check-boot-order");
    run = applyAction(scenario, run, "verify-boot");
    expect(run.appliedActions).toContain("verify-boot");
  });

  it("fan reseat and DIMM removal each wait for their diagnostic", () => {
    const thermal = getScenario("cpu-thermal-shutdown");
    if (thermal) {
      let run = createRun(thermal, "guided");
      run = applyAction(thermal, run, "reseat-fan-header");
      expect(run.appliedActions).not.toContain("reseat-fan-header");
      run = applyAction(thermal, run, "inspect-cooler-fan");
      run = applyAction(thermal, run, "reseat-fan-header");
      expect(run.appliedActions).toContain("reseat-fan-header");
    }

    const ram = getScenario("ram-instability-crashes");
    if (ram) {
      let run = createRun(ram, "guided");
      run = applyAction(ram, run, "remove-failed-dimm");
      expect(run.appliedActions).not.toContain("remove-failed-dimm");
      run = applyAction(ram, run, "run-memory-test");
      run = applyAction(ram, run, "remove-failed-dimm");
      expect(run.appliedActions).toContain("remove-failed-dimm");
    }
  });
});

describe("hardware expansion: golden paths verify", () => {
  it("ram-instability-crashes golden path", () => {
    const scenario = getScenario("ram-instability-crashes");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "review-crash-logs",
      "check-psu-rails",
      "run-memory-test",
      "remove-failed-dimm",
      "verify-stability",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("cpu-thermal-shutdown golden path", () => {
    const scenario = getScenario("cpu-thermal-shutdown");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "read-thermal-log",
      "inspect-cooler-fan",
      "reseat-fan-header",
      "verify-thermal-load",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });

  it("storage-not-detected golden path", () => {
    const scenario = getScenario("storage-not-detected");
    expect(scenario).toBeDefined();
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    expect(canVerify(scenario, run)).toBe(false);
    for (const id of [
      "read-boot-error",
      "inspect-sata-cables",
      "check-boot-order",
      "reseat-sata-data",
      "verify-boot",
    ]) {
      run = applyAction(scenario, run, id);
      expect(run.appliedActions, id).toContain(id);
    }
    expect(canVerify(scenario, run)).toBe(true);
    run = verify(scenario, run);
    expect(run.status).toBe("verified");
  });
});

describe("hardware expansion: 2D workbench exposes the new states", () => {
  it("shows a stopped CPU fan label for the thermal scenario", () => {
    const scenario = getScenario("cpu-thermal-shutdown");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<HardwareLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("FAN STOPPED")).toBeTruthy();
  });

  it("shows the missing-drive label for the storage scenario", () => {
    const scenario = getScenario("storage-not-detected");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<HardwareLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.getByText("NO DEVICE")).toBeTruthy();
  });

  it("does not show fault labels on a healthy bench", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(container.textContent).not.toContain("FAN STOPPED");
    expect(container.textContent).not.toContain("NO DEVICE");
  });

  it("faulty DIMM slot turns red only after the test reveals it", () => {
    const scenario = getScenario("ram-instability-crashes");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const { container, rerender } = render(
      <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(container.querySelectorAll('rect[fill="#7f1d1d"]').length).toBe(0);

    run = applyAction(scenario, run, "run-memory-test");
    rerender(<HardwareLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(container.querySelectorAll('rect[fill="#7f1d1d"]').length).toBeGreaterThan(0);
  });

  it("fault labels clear once their fix is verified", () => {
    const thermal = getScenario("cpu-thermal-shutdown");
    if (thermal) {
      let run = createRun(thermal, "guided");
      const { container, rerender } = render(
        <HardwareLab scenario={thermal} run={run} onInspect={() => {}} />,
      );
      expect(container.textContent).toContain("FAN STOPPED");
      run = applyAction(thermal, run, "inspect-cooler-fan");
      run = applyAction(thermal, run, "reseat-fan-header");
      rerender(<HardwareLab scenario={thermal} run={run} onInspect={() => {}} />);
      expect(container.textContent).not.toContain("FAN STOPPED");
    }

    const storage = getScenario("storage-not-detected");
    if (storage) {
      let run = createRun(storage, "guided");
      const { container, rerender } = render(
        <HardwareLab scenario={storage} run={run} onInspect={() => {}} />,
      );
      expect(container.textContent).toContain("NO DEVICE");
      for (const id of [
        "read-boot-error",
        "inspect-sata-cables",
        "check-boot-order",
        "reseat-sata-data",
        "verify-boot",
      ]) {
        run = applyAction(storage, run, id);
      }
      rerender(<HardwareLab scenario={storage} run={run} onInspect={() => {}} />);
      expect(container.textContent).not.toContain("NO DEVICE");
    }
  });
});

describe("hardware scenarios: declarative focus", () => {
  it("focus targets point at a listed component and a real camera preset", () => {
    const presetIds = CAMERA_PRESETS.map((p) => p.id);
    for (const id of [
      "ram-instability-crashes",
      "cpu-thermal-shutdown",
      "storage-not-detected",
    ]) {
      const scenario = getScenario(id);
      expect(scenario, id).toBeDefined();
      if (!scenario) continue;
      const focus = scenario.environment.focusTarget;
      expect(focus, id).toBeDefined();
      if (!focus) continue;
      expect(scenario.environment.components, id).toContain(focus.componentId);
      expect(presetIds, id).toContain(focus.cameraPreset);
    }
    for (const id of ["pc-no-power", "pc-on-no-display"]) {
      const scenario = getScenario(id);
      expect(scenario?.environment.focusTarget, id).toBeUndefined();
    }
  });

  it("opens the bench on the focused component with the inspector showing", () => {
    const cases = [
      ["ram-instability-crashes", "Inspecting RAM"],
      ["cpu-thermal-shutdown", "Inspecting CPU cooler"],
      ["storage-not-detected", "Inspecting Storage"],
    ] as const;
    for (const [id, aria] of cases) {
      const scenario = getScenario(id);
      if (!scenario) continue;
      const run = createRun(scenario, "guided");
      const { unmount } = render(
        <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
      );
      expect(screen.getByLabelText(aria), id).toBeInTheDocument();
      unmount();
    }
  });

  it("baseline benches open on the legend, not an inspector", () => {
    const scenario = getScenario("pc-no-power");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(<HardwareLab scenario={scenario} run={run} onInspect={() => {}} />);
    expect(screen.queryByTestId("hw-inspector")).toBeNull();
    expect(screen.getByLabelText("Component quick select")).toBeInTheDocument();
  });

  it("view wrapper feeds focus through the shared selection state", () => {
    const scenario = getScenario("storage-not-detected");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    render(
      <HardwareLabView scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(screen.getByLabelText("Inspecting Storage")).toBeInTheDocument();
    // Selection is shared chrome: clicking another part retargets the same dock.
    const psu = screen.getByLabelText("Power supply unit");
    fireEvent.click(psu);
    expect(screen.getByLabelText("Inspecting PSU")).toBeInTheDocument();
  });
});

describe("hardware scenarios: component visibility honored (2D stage)", () => {
  const byLabel = (container: HTMLElement, label: string) =>
    container.querySelector(`[aria-label="${label}"]`);

  it("ram scenario: DIMMs in; cooler, GPU, storage out", () => {
    const scenario = getScenario("ram-instability-crashes");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(byLabel(container, "RAM DIMM slots")).not.toBeNull();
    expect(byLabel(container, "CPU cooler")).toBeNull();
    expect(byLabel(container, "Graphics card")).toBeNull();
    expect(byLabel(container, "SATA storage")).toBeNull();
    expect(container.querySelector('[data-chain-step="wall"]')).toBeNull();
  });

  it("thermal scenario: cooler in; DIMMs, GPU, storage out", () => {
    const scenario = getScenario("cpu-thermal-shutdown");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(byLabel(container, "CPU cooler")).not.toBeNull();
    expect(byLabel(container, "RAM DIMM slots")).toBeNull();
    expect(byLabel(container, "Graphics card")).toBeNull();
    expect(byLabel(container, "SATA storage")).toBeNull();
  });

  it("storage scenario: storage in; DIMMs, cooler, GPU out", () => {
    const scenario = getScenario("storage-not-detected");
    if (!scenario) return;
    const run = createRun(scenario, "guided");
    const { container } = render(
      <HardwareLab scenario={scenario} run={run} onInspect={() => {}} />,
    );
    expect(byLabel(container, "SATA storage")).not.toBeNull();
    expect(byLabel(container, "RAM DIMM slots")).toBeNull();
    expect(byLabel(container, "CPU cooler")).toBeNull();
    expect(byLabel(container, "Graphics card")).toBeNull();
  });

  it("pc-no-power shows the wall strip; pc-on-no-display shows wall and GPU", () => {
    const dead = getScenario("pc-no-power");
    if (dead) {
      const run = createRun(dead, "guided");
      const { container } = render(
        <HardwareLab scenario={dead} run={run} onInspect={() => {}} />,
      );
      expect(byLabel(container, "Wall outlet and power strip")).not.toBeNull();
      expect(byLabel(container, "Graphics card")).toBeNull();
      expect(byLabel(container, "CPU cooler")).toBeNull();
    }
    const display = getScenario("pc-on-no-display");
    if (display) {
      const run = createRun(display, "guided");
      const { container } = render(
        <HardwareLab scenario={display} run={run} onInspect={() => {}} />,
      );
      expect(byLabel(container, "Wall outlet and power strip")).not.toBeNull();
      expect(byLabel(container, "Graphics card")).not.toBeNull();
      expect(byLabel(container, "RAM DIMM slots")).not.toBeNull();
    }
  });
});

describe("3D part visibility derives from the same components predicate", () => {
  const vis = (...ids: string[]) => (x: string) => ids.includes(x);

  it("gates board sub-parts per scenario, storage independently", () => {
    const p = scenePartVisibility(vis("power-supply", "motherboard", "ram"));
    expect(p.board).toBe(true);
    expect(p.psu).toBe(true);
    expect(p.dimms).toBe(true);
    expect(p.cooler).toBe(false);
    expect(p.gpu).toBe(false);
    expect(p.storage).toBe(false);
    expect(p.wall).toBe(false);

    const s = scenePartVisibility(vis("storage"));
    expect(s.storage).toBe(true);
    expect(s.board).toBe(false);
    expect(s.cooler).toBe(false);
    expect(s.dimms).toBe(false);
    expect(s.gpu).toBe(false);
  });

  it("shows every part when the components list is unrestricted", () => {
    const p = scenePartVisibility(() => true);
    for (const value of Object.values(p)) expect(value).toBe(true);
  });
});

describe("hardware scenarios: inspector related actions and evidence", () => {
  it("the focused component offers the scenario's diagnostic action", () => {
    const cases: [string, string, string][] = [
      ["ram-instability-crashes", "ram", "run-memory-test"],
      ["ram-instability-crashes", "power-supply", "check-psu-rails"],
      ["ram-instability-crashes", "motherboard", "review-crash-logs"],
      ["cpu-thermal-shutdown", "cpu-cooler", "inspect-cooler-fan"],
      ["cpu-thermal-shutdown", "motherboard", "read-thermal-log"],
      ["storage-not-detected", "storage", "inspect-sata-cables"],
      ["storage-not-detected", "motherboard", "read-boot-error"],
      ["pc-on-no-display", "gpu", "check-monitor-power"],
      ["pc-on-no-display", "ram", "listen-beeps"],
    ];
    for (const [scenarioId, comp, actionId] of cases) {
      const scenario = getScenario(scenarioId);
      if (!scenario) continue;
      const run = createRun(scenario, "guided");
      const hs = buildBenchHotspot(scenario, run, comp as never);
      expect(hs?.relatedAction?.id, `${scenarioId}/${comp}`).toBe(actionId);
      expect(hs?.relatedAction?.disabled, `${scenarioId}/${comp}`).toBe(false);
    }
  });

  it("cooler evidence carries the temperature and last power event", () => {
    const scenario = getScenario("cpu-thermal-shutdown");
    if (!scenario) return;
    let run = createRun(scenario, "guided");

    const before = buildBenchHotspot(scenario, run, "cpu-cooler");
    expect(
      before?.evidence?.find((e) => e.label === "CPU temperature °C")?.value,
    ).toBe("—");
    expect(
      before?.evidence?.find((e) => e.label === "Last power event")?.value,
    ).toBe("thermal shutdown 14:32");

    run = applyAction(scenario, run, "read-thermal-log");
    expect(
      buildBenchHotspot(scenario, run, "cpu-cooler")?.evidence?.find(
        (e) => e.label === "CPU temperature °C",
      )?.value,
    ).toBe("94");

    run = applyAction(scenario, run, "inspect-cooler-fan");
    run = applyAction(scenario, run, "reseat-fan-header");
    run = applyAction(scenario, run, "verify-thermal-load");
    expect(
      buildBenchHotspot(scenario, run, "cpu-cooler")?.evidence?.find(
        (e) => e.label === "CPU temperature °C",
      )?.value,
    ).toBe("61");
  });

  it("memory test evidence progresses unknown → fail → pass without spoiling", () => {
    const scenario = getScenario("ram-instability-crashes");
    if (!scenario) return;
    let run = createRun(scenario, "guided");
    const row = (r: typeof run) =>
      buildBenchHotspot(scenario, r, "ram")?.evidence?.find(
        (e) => e.label === "Memory test result",
      );

    expect(row(run)?.value).toBe("—");
    expect(row(run)?.tone).toBe("unknown");

    run = applyAction(scenario, run, "run-memory-test");
    expect(row(run)?.value).toBe("fail");
    expect(row(run)?.tone).toBe("crit");

    run = applyAction(scenario, run, "remove-failed-dimm");
    run = applyAction(scenario, run, "verify-stability");
    expect(row(run)?.value).toBe("ok");
    expect(row(run)?.tone).toBe("ok");
  });
});
