import type {
  VmEmulator,
  VmEmulatorCtor,
} from "./VmController";
import type { V86Options } from "v86";

/**
 * Test double for the v86 emulator. Never imported by application code —
 * only tests construct it, so it never ships in a bundle.
 */
export class FakeEmulator implements VmEmulator {
  readonly options: V86Options;
  running = false;
  destroyed = false;
  addCount = 0;
  removeCount = 0;
  receivedState: ArrayBuffer | null = null;
  restoreShouldFail = false;
  saveShouldFail = false;
  fullscreenCalls = 0;
  readonly typedText: string[] = [];
  private readonly listeners = new Map<string, Set<(arg: never) => void>>();

  constructor(options: V86Options) {
    this.options = options;
    if (options.autostart) {
      // Mirror v86 autostart: the emulator announces itself asynchronously,
      // after the caller has had a chance to attach listeners.
      queueMicrotask(() => {
        this.running = true;
        this.emit("emulator-started");
      });
    }
  }

  on(event: string): Set<(arg: never) => void> {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    return set;
  }

  emit(event: string, arg?: unknown): void {
    for (const fn of [...this.on(event)]) fn(arg as never);
  }

  get activeListenerCount(): number {
    let n = 0;
    for (const set of this.listeners.values()) n += set.size;
    return n;
  }

  async run(): Promise<void> {
    this.running = true;
    this.emit("emulator-started");
  }

  async stop(): Promise<void> {
    this.running = false;
    this.emit("emulator-stopped");
  }

  async destroy(): Promise<void> {
    this.destroyed = true;
    this.running = false;
  }

  async save_state(): Promise<ArrayBuffer> {
    if (this.saveShouldFail) throw new Error("save exploded");
    const buf = new ArrayBuffer(32);
    new Uint8Array(buf).fill(0x5a);
    return buf;
  }

  async restore_state(state: ArrayBuffer): Promise<void> {
    if (this.restoreShouldFail) throw new Error("restore exploded");
    this.receivedState = state;
  }

  is_running(): boolean {
    return this.running;
  }

  add_listener(event: string, fn: (arg: never) => void): void {
    this.addCount += 1;
    this.on(event).add(fn);
  }

  remove_listener(event: string, fn: (arg: never) => void): void {
    this.removeCount += 1;
    this.on(event).delete(fn);
  }

  keyboard_send_text(text: string): void {
    this.typedText.push(text);
  }

  keyboard_send_scancodes(_codes: number[]): void {
    /* not asserted directly */
  }

  screen_go_fullscreen(): void {
    this.fullscreenCalls += 1;
  }
}

export interface FakeVmHandle {
  Ctor: VmEmulatorCtor;
  instances: FakeEmulator[];
  latest(): FakeEmulator | undefined;
}

export function createFakeVm(): FakeVmHandle {
  const instances: FakeEmulator[] = [];
  // Function constructor: `new Ctor(opts)` returns the FakeEmulator object,
  // so the instance handed to the controller is the full fake.
  function FakeCtor(options: V86Options): FakeEmulator {
    const emulator = new FakeEmulator(options);
    instances.push(emulator);
    return emulator;
  }
  return {
    Ctor: FakeCtor as unknown as VmEmulatorCtor,
    instances,
    latest: () => instances[instances.length - 1],
  };
}
