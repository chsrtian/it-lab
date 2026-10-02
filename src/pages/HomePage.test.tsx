import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { getScenarios } from "@/content";
import { DOMAINS } from "@/content/domainMeta";
import { CasePreviewVisual, HomePage } from "./HomePage";

describe("workbench case preview", () => {
  it("keeps the lower discipline wall as plain station tiles", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const activeDomains = DOMAINS.filter((domain) =>
      getScenarios().some((scenario) => scenario.category === domain.id),
    );

    expect(document.querySelectorAll(".station")).toHaveLength(activeDomains.length);
    expect(document.querySelector(".station--featured .station-lead")).not.toBeNull();
    expect(document.querySelector(".station:not(.station--featured) .station-top")).not.toBeNull();
    expect(document.querySelectorAll(".station .tally").length).toBeGreaterThan(0);
  });

  it("uses the large case well as the only interactive visual", () => {
    render(
      <MemoryRouter>
        <HomePage />
      </MemoryRouter>,
    );

    const preview = screen.getByTestId("case-preview");
    expect(preview).toHaveAttribute("href", expect.stringMatching(/^\/lab\//));
    expect(preview).toHaveAttribute("data-case-preview");
    expect(preview.querySelector("canvas, iframe, video")).toBeNull();
    expect(preview.closest(".well-stage")).not.toBeNull();
    expect(preview.closest(".station")).toBeNull();

    fireEvent.focus(preview);
    fireEvent.click(preview);
  });

  it("changes the case monitor composition by scenario discipline", () => {
    const hardware = getScenarios().find((scenario) => scenario.category === "hardware")!;
    const support = getScenarios().find((scenario) => scenario.category === "support")!;

    const { rerender } = render(
      <MemoryRouter>
        <CasePreviewVisual scenario={hardware} />
      </MemoryRouter>,
    );
    const hardwarePreview = screen.getByTestId("case-preview");
    expect(hardwarePreview).toHaveAttribute("data-case-preview", "hardware");
    expect(hardwarePreview.querySelector(".cp-chassis")).not.toBeNull();
    expect(hardwarePreview.querySelector(".cp-customer")).toBeNull();

    rerender(
      <MemoryRouter>
        <CasePreviewVisual scenario={support} />
      </MemoryRouter>,
    );
    const supportPreview = screen.getByTestId("case-preview");
    expect(supportPreview).toHaveAttribute("data-case-preview", "support");
    expect(supportPreview.querySelector(".cp-customer")).not.toBeNull();
    expect(supportPreview.querySelector(".cp-chassis")).toBeNull();
  });
});
