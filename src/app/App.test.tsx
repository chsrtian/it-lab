import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import App from "./App";

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <App />
    </MemoryRouter>,
  );
}

describe("route split — front door vs. workbench", () => {
  it("serves the landing page at / without app rails", () => {
    renderAt("/");

    expect(
      screen.getByRole("heading", {
        level: 1,
        name: "Practice diagnosing real IT problems — in your browser.",
      }),
    ).toBeInTheDocument();
    expect(document.querySelector(".lp-head")).not.toBeNull();
    expect(document.querySelector(".steel-rail")).toBeNull();
    expect(document.querySelector(".rail-nav")).toBeNull();
  });

  it("serves the workbench at /workbench under the shell", () => {
    renderAt("/workbench");

    expect(
      screen.getByRole("heading", { level: 1, name: "Workbench" }),
    ).toBeInTheDocument();
    expect(document.querySelector(".steel-rail--top")).not.toBeNull();

    const workbench = screen.getByRole("link", { name: "Workbench" });
    expect(workbench).toHaveAttribute("href", "/workbench");
    expect(workbench).toHaveAttribute("aria-current", "page");
  });

  it("points the shell wordmark at the workbench, not the landing", () => {
    renderAt("/workbench");

    const wordmark = document.querySelector<HTMLAnchorElement>(
      ".steel-rail--top .wordmark",
    );
    expect(wordmark?.getAttribute("href")).toBe("/workbench");
  });

  it("keeps app routes under the shell", () => {
    renderAt("/labs");

    expect(document.querySelector(".steel-rail--top")).not.toBeNull();
    expect(
      screen.getByRole("navigation", { name: "Disciplines" }),
    ).toBeInTheDocument();
  });

  it("renders the auth placeholder at /auth and /auth/callback", () => {
    renderAt("/auth");
    expect(
      screen.getByRole("heading", { level: 1, name: "Sign in" }),
    ).toBeInTheDocument();
    expect(screen.getByText(/arrives with the Supabase integration/i)).toBeInTheDocument();
    expect(document.querySelector(".steel-rail")).toBeNull();
  });

  it("renders the 404 inside the shell and routes back to the workbench", () => {
    renderAt("/definitely-not-a-route");

    expect(
      screen.getByRole("heading", { level: 1, name: "No such bench" }),
    ).toBeInTheDocument();
    const back = screen.getByRole("link", { name: "Back to workbench" });
    expect(back).toHaveAttribute("href", "/workbench");
    expect(document.querySelector(".steel-rail--top")).not.toBeNull();
  });
});
