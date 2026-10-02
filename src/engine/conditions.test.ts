import { describe, expect, it } from "vitest";
import { evaluateCondition, applyPatch, getByPath } from "@/engine/conditions";
import type { Condition } from "@/content/schema";

describe("getByPath", () => {
  it("reads nested paths", () => {
    expect(getByPath({ a: { b: 1 } }, "a.b")).toBe(1);
    expect(getByPath({ a: null }, "a.b")).toBeUndefined();
    expect(getByPath({ a: 1 }, "missing")).toBeUndefined();
  });
});

describe("evaluateCondition", () => {
  const ctx = {
    world: {
      bench: { posted: true },
      flags: ["x"],
      list: [1, 2],
    },
    ranCommands: new Set(["ping-ok", "ipconfig"]) as ReadonlySet<string>,
  };

  it("stateEquals", () => {
    const c: Condition = { type: "stateEquals", path: "bench.posted", value: true };
    expect(evaluateCondition(c, ctx)).toBe(true);
    expect(
      evaluateCondition({ type: "stateEquals", path: "bench.posted", value: false }, ctx),
    ).toBe(false);
  });

  it("deep equality for arrays", () => {
    expect(
      evaluateCondition({ type: "stateEquals", path: "list", value: [1, 2] }, ctx),
    ).toBe(true);
    expect(
      evaluateCondition({ type: "stateEquals", path: "list", value: [2, 1] }, ctx),
    ).toBe(false);
  });

  it("stateIn", () => {
    expect(
      evaluateCondition(
        { type: "stateIn", path: "bench.posted", values: [true, "yes"] },
        ctx,
      ),
    ).toBe(true);
  });

  it("commandRan", () => {
    expect(evaluateCondition({ type: "commandRan", commandId: "ping-ok" }, ctx)).toBe(true);
    expect(evaluateCondition({ type: "commandRan", commandId: "nope" }, ctx)).toBe(false);
  });

  it("all / any / not", () => {
    expect(
      evaluateCondition(
        {
          type: "all",
          conditions: [
            { type: "stateEquals", path: "bench.posted", value: true },
            { type: "commandRan", commandId: "ipconfig" },
          ],
        },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        {
          type: "any",
          conditions: [
            { type: "commandRan", commandId: "missing" },
            { type: "stateEquals", path: "bench.posted", value: true },
          ],
        },
        ctx,
      ),
    ).toBe(true);
    expect(
      evaluateCondition(
        { type: "not", condition: { type: "commandRan", commandId: "missing" } },
        ctx,
      ),
    ).toBe(true);
  });
});

describe("applyPatch", () => {
  it("deep merges plain objects", () => {
    const next = applyPatch({ a: { x: 1, y: 2 }, b: 1 }, { a: { y: 3 } });
    expect(next).toEqual({ a: { x: 1, y: 3 }, b: 1 });
  });

  it("replaces arrays", () => {
    const next = applyPatch({ services: [{ id: 1 }, { id: 2 }] }, { services: [{ id: 9 }] });
    expect(next.services).toEqual([{ id: 9 }]);
  });
});
