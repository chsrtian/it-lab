import { describe, expect, it } from "vitest";
import { getAuthCallbackUrl } from "./authRedirect";

describe("getAuthCallbackUrl", () => {
  it("derives from the current origin instead of a hardcoded host", () => {
    expect(getAuthCallbackUrl()).toBe(`${window.location.origin}/auth/callback`);
  });

  it("uses the active port, whatever the dev server picked", () => {
    const url = new URL(getAuthCallbackUrl());
    expect(url.origin).toBe(window.location.origin);
    expect(url.pathname).toBe("/auth/callback");
  });
});
