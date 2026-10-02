import { describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { VmLabPage } from "./VmLabPage";
import { createFakeVm, type FakeVmHandle } from "@/features/vmlab/fakeEmulator";
import type { VmAssets } from "@/features/vmlab/VmController";
import { VM_PROFILE } from "@/features/vmlab/vmProfile";
import type { UseVmLabOverrides } from "@/features/vmlab/useVmLab";
import { BOOT_COPY, BOOT_STAGES } from "@/features/vmlab/bootSequence";

const ASSETS: VmAssets = {
  wasmUrl: "/test/v86.wasm",
  biosUrl: "/test/seabios.bin",
  vgaBiosUrl: "/test/vgabios.bin",
  cdromUrl: "/test/linux.iso",
};

function deps(overrides: Partial<UseVmLabOverrides> = {}) {
  const fake = createFakeVm();
  return {
    fake,
    overrides: {
      loadEmulator: async () => fake.Ctor,
      assets: ASSETS,
      storage: {
        save: vi.fn(async () => {}),
        load: vi.fn(async () => null),
        clear: vi.fn(async () => {}),
      },
      ...overrides,
    } satisfies UseVmLabOverrides,
  };
}

function powerOn() {
  return screen.getByRole("button", { name: /power on/i });
}

async function startMachine(ov: UseVmLabOverrides) {
  const view = render(<VmLabPage deps={ov} />);
  fireEvent.click(powerOn());
  await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());
  return view;
}

/** Emit screen put-char events for a string through the fake emulator. */
function feedScreen(fake: FakeVmHandle, text: string): void {
  const emulator = fake.latest();
  if (!emulator) throw new Error("no emulator instance");
  let col = 0;
  for (const ch of text) {
    emulator.emit("screen-put-char", [0, col % 80, ch.charCodeAt(0)]);
    col += 1;
  }
}

function feed(fake: FakeVmHandle, text: string): void {
  act(() => feedScreen(fake, text));
}

function bootSteps(): HTMLElement[] {
  const path = document.querySelector(".vm-boot__path");
  if (!path) throw new Error("boot path not rendered");
  return within(path as HTMLElement).getAllByRole("listitem");
}

function currentStepLabel(): string | null {
  return (
    document.querySelector('[aria-current="step"] .vm-boot__label')?.textContent ??
    null
  );
}

function explanationTitle(): string {
  return document.querySelector(".vm-boot__stage-label")?.textContent ?? "";
}

describe("VM Lab page", () => {
  it("uses the shared page header and shows a stopped training machine", () => {
    const { overrides } = deps();
    render(<VmLabPage deps={overrides} />);

    expect(document.querySelector(".inset.page-head")).not.toBeNull();
    expect(screen.getByRole("heading", { level: 1, name: "VM Lab" })).toBeInTheDocument();
    expect(screen.getByText("STOPPED")).toBeInTheDocument();
    expect(screen.getByTestId("vm-screen")).toHaveAttribute("data-status", "stopped");
    expect(powerOn()).toBeEnabled();

    // Controls reflect state: nothing to pause/resume/save yet.
    expect(screen.getByRole("button", { name: /pause/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /resume/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save state/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /restore state/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /fullscreen/i })).toBeDisabled();
    expect(screen.getByText(/disconnected \(by design\)/i)).toBeInTheDocument();
    expect(screen.getByText(/not on your computer/i)).toBeInTheDocument();
  });

  it("boots to RUNNING and flips every control to match the state", async () => {
    const { overrides } = deps();
    await startMachine(overrides);

    expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /power on/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /pause/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /resume/i })).toBeDisabled();
    expect(screen.getByRole("button", { name: /save state/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /reset/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /fullscreen/i })).toBeEnabled();
  });

  it("requests browser fullscreen on the machine frame and preserves the running VM", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    const vmScreen = screen.getByTestId("vm-screen");
    const fullscreenTarget = document.querySelector(".vm-machine") as HTMLElement;
    let fullscreenElement: Element | null = null;
    const requestFullscreen = vi.fn(() => {
      fullscreenElement = fullscreenTarget;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const exitFullscreen = vi.fn(() => {
      fullscreenElement = null;
      document.dispatchEvent(new Event("fullscreenchange"));
      return Promise.resolve();
    });
    const originalRequest = HTMLElement.prototype.requestFullscreen;
    const originalExit = document.exitFullscreen;
    const originalFullscreenElement = Object.getOwnPropertyDescriptor(document, "fullscreenElement");
    Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
      configurable: true,
      value: requestFullscreen,
    });
    Object.defineProperty(document, "exitFullscreen", {
      configurable: true,
      value: exitFullscreen,
    });
    Object.defineProperty(document, "fullscreenElement", {
      configurable: true,
      get: () => fullscreenElement,
    });

    try {
      fireEvent.click(screen.getByRole("button", { name: /fullscreen/i }));
      await waitFor(() => expect(requestFullscreen).toHaveBeenCalledWith());
      expect(fullscreenElement).toBe(fullscreenTarget);
      expect(fake.instances[0].fullscreenCalls).toBe(1);
      expect(screen.getByRole("button", { name: /exit fullscreen/i })).toBeEnabled();
      expect(fullscreenTarget).toHaveClass("vm-machine--fullscreen");
      expect(screen.getByTestId("vm-screen")).toBe(vmScreen);

      fireEvent.click(screen.getByRole("button", { name: /exit fullscreen/i }));
      await waitFor(() => expect(exitFullscreen).toHaveBeenCalledTimes(1));
      expect(screen.getByRole("button", { name: /^fullscreen$/i })).toBeEnabled();
      expect(screen.getByTestId("vm-screen")).toBe(vmScreen);
      expect(fake.instances[0].destroyed).toBe(false);
    } finally {
      Object.defineProperty(HTMLElement.prototype, "requestFullscreen", {
        configurable: true,
        value: originalRequest,
      });
      Object.defineProperty(document, "exitFullscreen", {
        configurable: true,
        value: originalExit,
      });
      if (originalFullscreenElement) {
        Object.defineProperty(document, "fullscreenElement", originalFullscreenElement);
      }
    }
  });

  it("pause/resume move the status badge through PAUSED and back", async () => {
    const { overrides } = deps();
    await startMachine(overrides);

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    // PAUSED appears twice while paused: status badge + screen overlay badge.
    await waitFor(() => expect(screen.getAllByText("PAUSED").length).toBeGreaterThan(1));
    expect(screen.getByRole("button", { name: /resume/i })).toBeEnabled();
    expect(screen.getByRole("button", { name: /pause/i })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());
    expect(screen.getByRole("button", { name: /pause/i })).toBeEnabled();
  });

  it("enable Save enables Restore in the same session", async () => {
    const save = vi.fn(async () => {});
    const { overrides } = deps({
      storage: { save, load: async () => null, clear: async () => {} },
    });
    await startMachine(overrides);

    fireEvent.click(screen.getByRole("button", { name: /save state/i }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /restore state/i })).toBeEnabled(),
    );
  });

  it("shows a friendly error with collapsible details when loading fails", async () => {
    const { overrides } = deps({
      loadEmulator: async () => {
        throw new Error("wasm boom");
      },
    });
    render(<VmLabPage deps={overrides} />);

    fireEvent.click(powerOn());
    await waitFor(() => expect(screen.getByText("ERROR")).toBeInTheDocument());

    expect(screen.getByText(/VM could not start/i)).toBeInTheDocument();
    const details = screen.getByText(/technical details/i);
    fireEvent.click(details);
    expect(screen.getByText(/wasm boom/)).toBeInTheDocument();

    // The machine stays recoverable.
    expect(screen.getByRole("button", { name: /try again/i })).toBeEnabled();
  });

  it("destroys the emulator when the page unmounts (no leaked instance)", async () => {
    const fake = createFakeVm();
    const { overrides } = deps({ loadEmulator: async () => fake.Ctor });
    const view = render(<VmLabPage deps={overrides} />);
    fireEvent.click(powerOn());
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());

    view.unmount();

    expect(fake.instances).toHaveLength(1);
    await waitFor(() => expect(fake.instances[0].destroyed).toBe(true));
    expect(fake.instances[0].activeListenerCount).toBe(0);
  });

  it("carries no host-execution or networking surface in the rendered page", async () => {
    const { overrides } = deps();
    const { container } = render(<VmLabPage deps={overrides} />);
    expect(container.innerHTML).not.toMatch(/net_device|child_process/);
    expect(container.textContent).toContain("Networking is disabled");
  });
});

describe("virtual hardware inspector (14B-2)", () => {
  it("shows profile-derived hardware and keeps the VM screen mounted and live", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    const vmScreen = screen.getByTestId("vm-screen");

    // Closed by default: strip facts come from the profile, no inspector.
    expect(screen.queryByTestId("vm-hardware-panel")).toBeNull();
    expect(screen.getByText("Pentium III-class (emulated)")).toBeInTheDocument();
    expect(screen.getByText("64 MiB virtual RAM")).toBeInTheDocument();
    expect(screen.getByText("Disconnected (by design)")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Virtual hardware" }));

    // Reserved-space layout: inspector is a grid sibling, never an overlay.
    const workspace = document.querySelector(".vm-workspace--hw");
    expect(workspace).not.toBeNull();
    const machine = workspace?.querySelector(".vm-machine");
    expect(machine).not.toBeNull();
    expect(machine).toContainElement(vmScreen);
    // Same DOM node before and after opening — nothing remounted or destroyed.
    expect(screen.getByTestId("vm-screen")).toBe(vmScreen);
    expect(vmScreen.getAttribute("data-status")).toBe("running");
    expect(fake.instances).toHaveLength(1);
    expect(fake.instances[0].destroyed).toBe(false);
    expect(fake.instances[0].activeListenerCount).toBeGreaterThan(0);

    // All required hardware entries with values and guest identity.
    const panel = screen.getByTestId("vm-hardware-panel");
    const list = panel.querySelector(".vm-inspector__list");
    expect(list).not.toBeNull();
    const terms = within(list as HTMLElement)
      .getAllByRole("term")
      .map((term) => term.textContent);
    expect(terms).toEqual(
      expect.arrayContaining([
        "CPU",
        "Memory (RAM)",
        "Boot firmware",
        "Storage",
        "CD-ROM (boot media)",
        "Display",
        "Keyboard",
        "Mouse",
        "Network",
      ]),
    );
    expect(terms).toHaveLength(9);
    expect(within(panel).getByText("Pentium III-class (emulated)")).toBeInTheDocument();
    expect(within(panel).getByText("64 MiB virtual RAM")).toBeInTheDocument();
    expect(within(panel).getByText("Buildroot 2013.08.1")).toBeInTheDocument();
    expect(within(panel).getByText("linux.iso · 5.4 MB, read-only")).toBeInTheDocument();
    expect(within(panel).getByText("Virtual VGA console (80×25)")).toBeInTheDocument();
    expect(within(panel).getByText("Disconnected (by design)")).toBeInTheDocument();
    expect(within(panel).getByRole("heading", { name: "BOOT ORDER" })).toBeInTheDocument();
    expect(within(panel).getByText("CD-ROM", { exact: true })).toBeInTheDocument();
    expect(within(panel).getByText("Linux 2.6.34.14")).toBeInTheDocument();
  });

  it("keeps runtime state separate from the machine profile", async () => {
    const { overrides } = deps();
    await startMachine(overrides);
    const snapshot = JSON.stringify(VM_PROFILE);

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    await waitFor(() => expect(screen.getAllByText("PAUSED").length).toBeGreaterThan(1));
    expect(JSON.stringify(VM_PROFILE)).toBe(snapshot);

    // The inspector renders profile facts only — no runtime status inside.
    fireEvent.click(screen.getByRole("button", { name: "Virtual hardware" }));
    const panel = screen.getByTestId("vm-hardware-panel");
    expect(within(panel).getByText("64 MiB virtual RAM")).toBeInTheDocument();
    expect(within(panel).queryByRole("status")).toBeNull();
    expect(JSON.stringify(VM_PROFILE)).toBe(snapshot);

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    await waitFor(() =>
      expect(document.querySelector(".vm-machine__status")?.textContent).toContain("RUNNING"),
    );
    expect(JSON.stringify(VM_PROFILE)).toBe(snapshot);
  });

  it("closes back to stage-only with the runtime unchanged", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    const vmScreen = screen.getByTestId("vm-screen");

    fireEvent.click(screen.getByRole("button", { name: "Virtual hardware" }));
    fireEvent.click(screen.getByRole("button", { name: "Close virtual hardware panel" }));

    expect(screen.queryByTestId("vm-hardware-panel")).toBeNull();
    expect(document.querySelector(".vm-workspace--hw")).toBeNull();
    expect(document.querySelector(".vm-machine")).not.toBeNull();
    expect(screen.getByTestId("vm-screen")).toBe(vmScreen);
    expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument();
    expect(fake.instances[0].destroyed).toBe(false);
    expect(fake.instances[0].activeListenerCount).toBeGreaterThan(0);
  });

  it("is reachable and readable by keyboard and screen reader", () => {
    const { overrides } = deps();
    render(<VmLabPage deps={overrides} />);

    const toggle = screen.getByRole("button", { name: "Virtual hardware" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    toggle.focus();
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(toggle).toHaveAttribute("aria-controls", "vm-hardware-panel");

    const panel = screen.getByRole("complementary", { name: "Virtual hardware" });
    expect(panel).toHaveAttribute("id", "vm-hardware-panel");
    expect(
      within(panel).getByRole("heading", { level: 2, name: "Virtual hardware" }),
    ).toBeInTheDocument();

    const close = within(panel).getByRole("button", {
      name: "Close virtual hardware panel",
    });
    close.focus();
    expect(close).toHaveFocus();
    fireEvent.click(close);
    expect(screen.queryByTestId("vm-hardware-panel")).toBeNull();

    // Reopen: explanations are plain semantic text — never color-only.
    fireEvent.click(toggle);
    const reopened = screen.getByTestId("vm-hardware-panel");
    expect(within(reopened).getByText(/computer recreated in software/i)).toBeInTheDocument();
    expect(within(reopened).getByText(/short-term working memory/i)).toBeInTheDocument();
    expect(within(reopened).getByText(/no network adapter at all/i)).toBeInTheDocument();
  });
});

describe("boot sequence explorer (14B-3)", () => {
  it("shows an honest stopped state with the full stage path and guidance", () => {
    const { overrides } = deps();
    render(<VmLabPage deps={overrides} />);

    expect(
      screen.getByRole("heading", { level: 2, name: "Boot sequence" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".vm-boot__mode-label")?.textContent).toContain(
      "Explore boot",
    );

    // Six ordered steps, none claimed while the machine is off.
    const steps = bootSteps();
    expect(steps.map((s) => s.querySelector(".vm-boot__label")?.textContent)).toEqual(
      BOOT_STAGES.map((s) => s.label),
    );
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    for (const step of steps) expect(step).toHaveAttribute("data-state", "pending");

    // Stopped copy + failure-boundary education, no fake booting claims.
    expect(screen.getByText(BOOT_COPY.stopped)).toBeInTheDocument();
    expect(screen.getByText(BOOT_COPY.clue)).toBeInTheDocument();
    expect(screen.queryByText(BOOT_COPY.observing)).toBeNull();

    // The explanation block is a polite live region.
    expect(document.querySelector(".vm-boot__explain")).toHaveAttribute(
      "aria-live",
      "polite",
    );
  });

  it("advances through observed stages only, marking current and done", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);

    // Running with no observed output yet — the honest fallback (§10).
    expect(screen.getByText(BOOT_COPY.observing)).toBeInTheDocument();
    expect(explanationTitle()).toBe("Booting");
    expect(document.querySelector('[aria-current="step"]')).toBeNull();

    feed(fake, "SeaBIOS (version rel-1.16.2-0-gea1b7a0)");
    expect(currentStepLabel()).toBe("Firmware");
    expect(explanationTitle()).toBe("Firmware");
    expect(screen.getByText(/first software to run/i)).toBeInTheDocument();
    expect(screen.getByText(/Why it matters:/i)).toBeInTheDocument();

    feed(fake, "\nBooting from DVD/CD...\nISOLINUX 5.10 2013-06-04");
    expect(currentStepLabel()).toBe("Bootloader");
    const steps = bootSteps();
    expect(steps[0]).toHaveAttribute("data-state", "done");
    expect(steps[1]).toHaveAttribute("data-state", "done");
    expect(steps[2]).toHaveAttribute("data-state", "current");
    // Done steps carry screen-reader text — state is never color-only.
    expect(steps[0].textContent).toContain("observed");

    feed(fake, "\n[    0.000000] Linux version 2.6.34.14 (fabian@eevee)");
    expect(currentStepLabel()).toBe("Kernel");

    feed(fake, "\n[    4.667617] VFS: Mounted root (ext2 filesystem) on device 1:0.");
    expect(currentStepLabel()).toBe("Userspace");
    expect(screen.getByText(/starting the first user programs/i)).toBeInTheDocument();

    feed(fake, "\n\n/root% ");
    expect(currentStepLabel()).toBe("Ready");
    expect(explanationTitle()).toBe("Ready");
    expect(document.querySelector('[aria-current="step"]')).toHaveAttribute(
      "aria-current",
      "step",
    );
    // All earlier stages remain observed.
    for (const step of bootSteps()) {
      expect(step.getAttribute("data-state")).not.toBe("pending");
    }
  });

  it("never fabricates stages before their output is observed", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);

    // Partial output only: firmware + boot device, nothing beyond.
    feed(fake, "SeaBIOS (version rel-1.16.2)\nBooting from DVD/CD...");
    expect(currentStepLabel()).toBe("Boot device");
    const steps = bootSteps();
    expect(steps[2]).toHaveAttribute("data-state", "pending");
    expect(steps[3]).toHaveAttribute("data-state", "pending");
    expect(steps[5]).toHaveAttribute("data-state", "pending");
    expect(screen.queryByText(/finished booting/i)).toBeNull();
  });

  it("pause freezes the explanation at the observed stage; resume continues", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    feed(fake, "SeaBIOS ... ISOLINUX ... Linux version 2.6.34.14");
    expect(currentStepLabel()).toBe("Kernel");

    fireEvent.click(screen.getByRole("button", { name: /pause/i }));
    await waitFor(() => expect(screen.getAllByText("PAUSED").length).toBeGreaterThan(1));
    expect(explanationTitle()).toBe("Kernel — paused");
    expect(screen.getByText(BOOT_COPY.paused)).toBeInTheDocument();
    // Stage stays exactly where it was observed — no auto-advance, no reset.
    expect(currentStepLabel()).toBe("Kernel");

    fireEvent.click(screen.getByRole("button", { name: /resume/i }));
    await waitFor(() =>
      expect(document.querySelector(".vm-machine__status")?.textContent).toContain("RUNNING"),
    );
    expect(explanationTitle()).toBe("Kernel");
    expect(screen.queryByText(BOOT_COPY.paused)).toBeNull();
  });

  it("reset clears the observed history and re-observes the fresh boot", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    feed(fake, "SeaBIOS ... ISOLINUX ... Linux version 2.6.34.14 ... /root%");
    expect(currentStepLabel()).toBe("Ready");

    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());
    await waitFor(() => expect(fake.instances).toHaveLength(2));

    // Timeline back to zero: nothing current, fallback copy showing.
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    for (const step of bootSteps()) expect(step).toHaveAttribute("data-state", "pending");
    expect(screen.getByText(BOOT_COPY.observing)).toBeInTheDocument();

    // The fresh boot observes from the beginning again.
    feed(fake, "SeaBIOS (version rel-1.16.2)");
    expect(currentStepLabel()).toBe("Firmware");
  });

  it("Free Boot collapses to the slim header and back (presentation only)", async () => {
    const { overrides, fake } = deps();
    await startMachine(overrides);
    feed(fake, "SeaBIOS (version rel-1.16.2)");

    const toggle = screen.getByRole("button", { name: "Free boot" });
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    toggle.focus();
    expect(toggle).toHaveFocus();

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "true");
    expect(document.querySelector(".vm-boot__path")).toBeNull();
    expect(document.querySelector(".vm-boot__explain")).toBeNull();
    expect(document.querySelector(".vm-boot__clue")).toBeNull();
    // Slim header stays so the mode can be switched back.
    expect(
      screen.getByRole("heading", { level: 2, name: "Boot sequence" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".vm-boot__mode-label")?.textContent).toContain(
      "Free boot",
    );
    // The machine itself is untouched by the mode switch.
    expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument();
    expect(fake.instances[0].destroyed).toBe(false);

    fireEvent.click(toggle);
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(document.querySelector(".vm-boot__path")).not.toBeNull();
    expect(currentStepLabel()).toBe("Firmware");
  });

  it("restore shows a truthful 'history unavailable' state and claims no stages", async () => {
    const { overrides, fake } = deps({
      storage: {
        save: vi.fn(async () => {}),
        load: vi.fn(async () => ({
          state: new ArrayBuffer(16),
          savedAt: 1,
          sizeBytes: 16,
        })),
        clear: vi.fn(async () => {}),
      },
    });
    render(<VmLabPage deps={overrides} />);
    await waitFor(() =>
      expect(screen.getByRole("button", { name: /restore state/i })).toBeEnabled(),
    );

    fireEvent.click(screen.getByRole("button", { name: /restore state/i }));
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());

    expect(screen.getByText(BOOT_COPY.restored)).toBeInTheDocument();
    expect(explanationTitle()).toBe("State restored");
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    for (const step of bootSteps()) {
      expect(step.textContent).toContain("boot history unavailable");
    }

    // Even a prompt on the restored screen claims nothing — history unknown.
    feed(fake, "/root%");
    expect(document.querySelector('[aria-current="step"]')).toBeNull();
    expect(screen.getByText(BOOT_COPY.restored)).toBeInTheDocument();

    // Reset is the only fresh-boot trigger: observation restarts for real.
    fireEvent.click(screen.getByRole("button", { name: /reset/i }));
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());
    await waitFor(() => expect(fake.instances).toHaveLength(2));
    expect(screen.queryByText(BOOT_COPY.restored)).toBeNull();
    feed(fake, "SeaBIOS (version rel-1.16.2)");
    expect(currentStepLabel()).toBe("Firmware");
  });

  it("keeps keyboard focus out of the way while stages change (no focus steal)", async () => {
    const { overrides, fake } = deps();
    render(<VmLabPage deps={overrides} />);
    expect(document.activeElement).toBe(document.body);

    fireEvent.click(powerOn());
    await waitFor(() => expect(screen.getByText("RUNNING", { exact: false })).toBeInTheDocument());
    feed(fake, "SeaBIOS ... Booting from DVD/CD...");
    feed(fake, "\nISOLINUX 5.10\nLinux version 2.6.34.14");
    expect(document.activeElement).toBe(document.body);
    expect(currentStepLabel()).toBe("Kernel");
  });

  it("lets Tab and Enter on page controls bypass the emulator keyboard capture", async () => {
    const { overrides } = deps();
    await startMachine(overrides);

    // Stand-in for v86: window listeners registered after power-on that
    // preventDefault every key they see (its adapter gates inputs itself).
    const v86Like = vi.fn((e: KeyboardEvent) => e.preventDefault());
    window.addEventListener("keydown", v86Like);
    window.addEventListener("keyup", v86Like);
    try {
      const toggle = screen.getByRole("button", { name: "Free boot" });

      // Navigation and activation stay with the browser — never reaching v86.
      fireEvent.keyDown(toggle, { key: "Tab" });
      fireEvent.keyDown(toggle, { key: "Enter" });
      fireEvent.keyDown(toggle, { key: " " });
      fireEvent.keyDown(document.body, { key: "Tab" });
      fireEvent.keyUp(toggle, { key: "Enter" });
      fireEvent.keyUp(toggle, { key: " " });
      expect(v86Like).not.toHaveBeenCalled();

      // Ordinary keys keep flowing to the guest — typing path unchanged.
      fireEvent.keyDown(toggle, { key: "l" });
      expect(v86Like).toHaveBeenCalledTimes(1);

      // Keys aimed at the guest screen still belong to the emulator.
      v86Like.mockClear();
      fireEvent.keyDown(screen.getByTestId("vm-screen"), { key: "Tab" });
      expect(v86Like).toHaveBeenCalledTimes(1);
    } finally {
      window.removeEventListener("keydown", v86Like);
      window.removeEventListener("keyup", v86Like);
    }
  });
});
