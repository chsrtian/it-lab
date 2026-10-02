/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VmController } from "./VmController";

const VMLAB_SOURCES = [
  "src/features/vmlab/VmController.ts",
  "src/features/vmlab/useVmLab.ts",
  "src/features/vmlab/loadV86.ts",
  "src/features/vmlab/vmStateStorage.ts",
  "src/features/vmlab/vmProfile.ts",
  "src/features/vmlab/VmHardwareInspector.tsx",
  "src/features/vmlab/bootSequence.ts",
  "src/features/vmlab/BootSequenceExplorer.tsx",
  "src/pages/VmLabPage.tsx",
  "src/app/App.tsx",
];

const HOST_EXEC_PATTERNS: Array<[string, RegExp]> = [
  ["child process spawning", /child_process/],
  ["eval()", /\beval\s*\(/],
  ["new Function", /new\s+Function\s*\(/],
  ["node require()", /\brequire\s*\(/],
  ["shell execution", /\bexec(Sync|File)?\s*\(/],
];

describe("VM Lab — safety and isolation invariants (source level)", () => {
  it.each(VMLAB_SOURCES)("%s has no host-execution capability", (file) => {
    const src = readFileSync(file, "utf8");
    for (const [label, pattern] of HOST_EXEC_PATTERNS) {
      if (pattern.test(src)) {
        throw new Error(`${file} contains banned pattern (${label})`);
      }
    }
  });

  it("the emulator options never configure networking", async () => {
    const controller = new VmController({
      loadEmulator: async () => {
        throw new Error("not constructed");
      },
      assets: {
        wasmUrl: "w.wasm",
        biosUrl: "b.bin",
        vgaBiosUrl: "v.bin",
        cdromUrl: "c.iso",
      },
      storage: { save: async () => {}, load: async () => null, clear: async () => {} },
    });
    const options = controller.buildOptions() as Record<string, unknown>;
    expect(Object.keys(options)).not.toContain("net_device");
    expect(options.network_relay_url).toBeUndefined();
    expect(JSON.stringify(options)).not.toContain("network");
  });

  it("v86 itself is only reached through a dynamic import", () => {
    const loader = readFileSync("src/features/vmlab/loadV86.ts", "utf8");
    expect(loader).toContain('await import("v86")');
    expect(loader).not.toMatch(/import[^.]*from\s+["']v86["']/);

    const hook = readFileSync("src/features/vmlab/useVmLab.ts", "utf8");
    // Only the wasm URL (a static asset string) may be imported statically.
    expect(hook).not.toMatch(/import[^.]*from\s+["']v86["']/);
    expect(hook).toMatch(/from\s+["']v86\/build\/v86\.wasm\?url["']/);
  });

  it("the VM Lab route is code-split — never in the entry bundle", () => {
    const app = readFileSync("src/app/App.tsx", "utf8");
    expect(app).toMatch(/const\s+VmLabPage\s*=\s*lazy\(\s*\(\)\s*=>\s*import\(\s*["']@\/pages\/VmLabPage["']/);
    // No static import of the page anywhere in App.
    expect(app).not.toMatch(/from\s+["']@\/pages\/VmLabPage["']/);
    expect(app).toContain("<VmLabPage />");
  });

  it("guest disk is a read-only CD-ROM (no writable disk device in options)", () => {
    const src = readFileSync("src/features/vmlab/VmController.ts", "utf8");
    expect(src).toContain("cdrom:");
    expect(src).not.toMatch(/hda:|hdb:|fda:|ide_\d/);
  });
});
