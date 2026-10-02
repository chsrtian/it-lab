export interface TerminalLineState {
  value: string;
  cursor: number;
}

export type TerminalLineEvent =
  | { type: "render"; state: TerminalLineState }
  | { type: "submit"; value: string }
  | { type: "interrupt" };

const KEY_SEQUENCES: Array<[string, "left" | "right" | "home" | "end" | "delete"]> = [
  ["\u001b[D", "left"],
  ["\u001b[C", "right"],
  ["\u001b[H", "home"],
  ["\u001b[1~", "home"],
  ["\u001b[F", "end"],
  ["\u001b[4~", "end"],
  ["\u001b[3~", "delete"],
];

function clampCursor(state: TerminalLineState): TerminalLineState {
  return { ...state, cursor: Math.max(0, Math.min(state.cursor, state.value.length)) };
}

/**
 * Pure editable-line model for xterm input. It understands the control
 * sequences emitted by a real keyboard and keeps the submitted line identical
 * to the line shown on screen.
 */
export function consumeTerminalInput(
  initial: TerminalLineState,
  data: string,
): { state: TerminalLineState; events: TerminalLineEvent[] } {
  let state = clampCursor(initial);
  const events: TerminalLineEvent[] = [];
  let index = 0;

  const render = () => events.push({ type: "render" as const, state: { ...state } });

  while (index < data.length) {
    const sequence = KEY_SEQUENCES.find(([token]) => data.startsWith(token, index));
    if (sequence) {
      const [token, key] = sequence;
      if (key === "left") state = { ...state, cursor: Math.max(0, state.cursor - 1) };
      if (key === "right") state = { ...state, cursor: Math.min(state.value.length, state.cursor + 1) };
      if (key === "home") state = { ...state, cursor: 0 };
      if (key === "end") state = { ...state, cursor: state.value.length };
      if (key === "delete" && state.cursor < state.value.length) {
        state = {
          value: state.value.slice(0, state.cursor) + state.value.slice(state.cursor + 1),
          cursor: state.cursor,
        };
      }
      render();
      index += token.length;
      continue;
    }

    const ch = data[index]!;
    if (ch === "\r" || ch === "\n") {
      // Browsers/xterm may provide CRLF together. Treat it as one Enter.
      if (ch === "\r" && data[index + 1] === "\n") index += 1;
      events.push({ type: "submit", value: state.value });
      state = { value: "", cursor: 0 };
    } else if (ch === "\u0003") {
      events.push({ type: "interrupt" });
      state = { value: "", cursor: 0 };
    } else if (ch === "\u0001") {
      state = { ...state, cursor: 0 };
      render();
    } else if (ch === "\b" || ch === "\u007f") {
      if (state.cursor > 0) {
        state = {
          value: state.value.slice(0, state.cursor - 1) + state.value.slice(state.cursor),
          cursor: state.cursor - 1,
        };
      }
      render();
    } else if (ch >= " " && ch !== "\u007f") {
      state = {
        value: state.value.slice(0, state.cursor) + ch + state.value.slice(state.cursor),
        cursor: state.cursor + 1,
      };
      render();
    }
    index += 1;
  }

  return { state, events };
}
