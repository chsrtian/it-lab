import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { LabPreview } from "./LabPreview";
import { BootTranscript } from "./BootTranscript";
import { CountUp } from "./motion";
import {
  LOOP_PAUSE_MS,
  MANUAL_HOLD_MS,
  PHASE_DURATION_MS,
  nextDemoPhase,
} from "./landingData";

/**
 * Phase 15B.1 motion contract.
 *
 * jsdom ships no IntersectionObserver, so two deterministic worlds are
 * exercised: without the observer every demo is static and fully readable
 * (that is also the jsdom test baseline), and with a stub observer the
 * autonomous loop runs on fake timers with the exact phase dwell times.
 */

class FakeIntersectionObserver {
  static instances: FakeIntersectionObserver[] = [];
  private readonly callback: IntersectionObserverCallback;
  constructor(callback: IntersectionObserverCallback) {
    this.callback = callback;
    FakeIntersectionObserver.instances.push(this);
  }
  observe(target: Element): void {
    this.callback(
      [{ isIntersecting: true, target } as IntersectionObserverEntry],
      this as unknown as IntersectionObserver,
    );
  }
  unobserve(): void {}
  disconnect(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
  root = null;
  rootMargin = "";
  thresholds: number[] = [];
}

function stubReducedMotion(): () => void {
  const original = window.matchMedia;
  window.matchMedia = ((query: string) => ({
    matches: true,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia;
  return () => {
    window.matchMedia = original;
  };
}

function previewPhase(): string | null {
  return screen.getByTestId("lab-preview").getAttribute("data-phase");
}

describe("landing motion — static where the observer cannot run", () => {
  it("renders the complete count-up value without animating", () => {
    render(<CountUp value={42} />);
    expect(screen.getByText("42")).toBeInTheDocument();
  });

  it("renders the whole boot transcript at once, no observer needed", () => {
    render(
      <MemoryRouter>
        <BootTranscript />
      </MemoryRouter>,
    );
    const lines = document.querySelectorAll(".lp-bl-line");
    expect(lines).toHaveLength(6);
    expect(screen.getByText("SeaBIOS")).toBeInTheDocument();
    expect(screen.getByText("Booting from DVD/CD...")).toBeInTheDocument();
    expect(screen.getByText("Linux version 2.6.34.14")).toBeInTheDocument();
    expect(screen.getByText("VFS: Mounted root ...")).toBeInTheDocument();
    expect(screen.getByText("/root%")).toBeInTheDocument();
    // Stage chips activate with the transcript; the last one is current.
    const chips = document.querySelectorAll(".lp-boot li");
    expect(
      Array.from(chips).filter((c) => c.getAttribute("data-active") === "true"),
    ).toHaveLength(6);
    expect(chips[5]).toHaveAttribute("aria-current", "step");
  });

  it("leaves the hero demo on its opening phase (no observer, no timer)", () => {
    vi.useFakeTimers();
    try {
      render(
        <MemoryRouter>
          <LabPreview />
        </MemoryRouter>,
      );
      expect(previewPhase()).toBe("observe");
      act(() => {
        vi.advanceTimersByTime(60_000);
      });
      expect(previewPhase()).toBe("observe");
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("landing motion — autonomous demo cycle", () => {
  beforeEach(() => {
    vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
    FakeIntersectionObserver.instances = [];
  });

  it("advances observe → trace → verify on real dwell times, then loops", () => {
    render(
      <MemoryRouter>
        <LabPreview />
      </MemoryRouter>,
    );
    expect(previewPhase()).toBe("observe");

    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.observe);
    });
    expect(previewPhase()).toBe("trace");

    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.trace);
    });
    expect(previewPhase()).toBe("verify");

    // Verify dwells its normal time, holds for the loop pause, then restarts.
    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.verify - 100);
    });
    expect(previewPhase()).toBe("verify");
    act(() => {
      vi.advanceTimersByTime(LOOP_PAUSE_MS);
    });
    expect(previewPhase()).toBe("verify");
    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(previewPhase()).toBe("observe");
  });

  it("keeps each phase dwell inside the 2.5–3.5s band from the brief", () => {
    for (const value of Object.values(PHASE_DURATION_MS)) {
      expect(value).toBeGreaterThanOrEqual(2500);
      expect(value).toBeLessThanOrEqual(3500);
    }
    expect(nextDemoPhase("observe")).toBe("trace");
    expect(nextDemoPhase("trace")).toBe("verify");
    expect(nextDemoPhase("verify")).toBe("observe");
  });

  it("pauses while hovered and resumes from the same phase", () => {
    render(
      <MemoryRouter>
        <LabPreview />
      </MemoryRouter>,
    );
    const preview = screen.getByTestId("lab-preview");

    fireEvent.mouseEnter(preview);
    act(() => {
      vi.advanceTimersByTime(20_000);
    });
    expect(previewPhase()).toBe("observe");

    fireEvent.mouseLeave(preview);
    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.observe);
    });
    expect(previewPhase()).toBe("trace");
  });

  it("lets a manual phase pick hold the demo before autonomy returns", () => {
    render(
      <MemoryRouter>
        <LabPreview />
      </MemoryRouter>,
    );
    const steps = screen.getByRole("group", { name: "Case progress" });
    fireEvent.click(steps.querySelectorAll("button")[1]);
    expect(previewPhase()).toBe("trace");

    // Past a normal dwell: the manual hold keeps the visitor in control.
    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.trace + 3000);
    });
    expect(previewPhase()).toBe("trace");

    // Hold expires → the instrument resumes its cycle from here.
    act(() => {
      vi.advanceTimersByTime(MANUAL_HOLD_MS - PHASE_DURATION_MS.trace - 3000 + 100);
    });
    expect(previewPhase()).toBe("trace");
    act(() => {
      vi.advanceTimersByTime(PHASE_DURATION_MS.trace);
    });
    expect(previewPhase()).toBe("verify");
  });

  it("stays completely static under prefers-reduced-motion", () => {
    const restore = stubReducedMotion();
    try {
      render(
        <MemoryRouter>
          <LabPreview />
        </MemoryRouter>,
      );
      act(() => {
        vi.advanceTimersByTime(120_000);
      });
      expect(previewPhase()).toBe("observe");
    } finally {
      restore();
    }
  });

  it("types the boot transcript line by line, then loops it", () => {
    render(
      <MemoryRouter>
        <BootTranscript />
      </MemoryRouter>,
    );
    expect(document.querySelectorAll(".lp-bl-line")).toHaveLength(1);

    // Each line lands on its own tick; the effect re-arms between them.
    act(() => {
      vi.advanceTimersByTime(420);
    });
    expect(screen.getByText("SeaBIOS")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(780);
    });
    expect(screen.getByText("Booting from DVD/CD...")).toBeInTheDocument();
    for (let i = 0; i < 4; i += 1) {
      act(() => {
        vi.advanceTimersByTime(780);
      });
    }
    expect(document.querySelectorAll(".lp-bl-line")).toHaveLength(6);
    expect(screen.getByText("Linux version 2.6.34.14")).toBeInTheDocument();
    expect(screen.getByText("/root%")).toBeInTheDocument();

    // Loop pause, then the transcript resets and starts typing again.
    act(() => {
      vi.advanceTimersByTime(2800);
    });
    expect(document.querySelectorAll(".lp-bl-line")).toHaveLength(1);
  });
});
