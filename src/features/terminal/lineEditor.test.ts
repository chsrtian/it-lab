import { describe, expect, it } from "vitest";
import { consumeTerminalInput, type TerminalLineState } from "./lineEditor";

function edit(sequence: string, initial: TerminalLineState = { value: "", cursor: 0 }) {
  return consumeTerminalInput(initial, sequence);
}

describe("terminal line editor", () => {
  it("supports Backspace as both BS and DEL", () => {
    expect(edit("pingm\u007f").state).toEqual({ value: "ping", cursor: 4 });
    expect(edit("pingm\b").state).toEqual({ value: "ping", cursor: 4 });
  });

  it("edits at the cursor with arrows and Delete", () => {
    const result = edit("pinmg\u001b[D\u001b[D\u001b[3~");
    expect(result.state).toEqual({ value: "ping", cursor: 3 });
  });

  it("supports Home, End, and Ctrl+A insertion", () => {
    let result = edit("ing\u001b[H" + "p");
    expect(result.state).toEqual({ value: "ping", cursor: 1 });
    result = edit(" 8.8.8.8\u001b[Hping");
    expect(result.state.value).toBe("ping 8.8.8.8");
    result = edit("tail\u0001head-");
    expect(result.state.value).toBe("head-tail");
  });

  it("submits the exact visible edited command and resets the line", () => {
    const result = edit("pinmg\u001b[D\u007f\u001b[F 192.168.1.1\r");
    expect(result.events).toContainEqual({ type: "submit", value: "ping 192.168.1.1" });
    expect(result.state).toEqual({ value: "", cursor: 0 });
  });

  it("Ctrl+C cancels the editable line without submitting it", () => {
    const result = edit("ping 8.8.8.8\u0003");
    expect(result.events.some((event) => event.type === "submit")).toBe(false);
    expect(result.events).toContainEqual({ type: "interrupt" });
    expect(result.state).toEqual({ value: "", cursor: 0 });
  });
});
