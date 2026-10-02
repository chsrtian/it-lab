import { describe, expect, it } from "vitest";
import { VM_HARDWARE, VM_PROFILE, type VmHardwareId } from "./vmProfile";

const EXPECTED_IDS: VmHardwareId[] = [
  "cpu",
  "memory",
  "firmware",
  "storage",
  "cdrom",
  "display",
  "keyboard",
  "mouse",
  "network",
];

/** Hardware the machine does NOT have — must never be claimed anywhere. */
const IMPOSSIBLE_HARDWARE =
  /\b(wi-?fi|wireless|bluetooth|ethernet|gpu|usb|ssd|nvme|webcam|sound card|audio device)\b/i;

describe("VM profile — machine schema (14B-2)", () => {
  it("carries the verified machine and guest identity", () => {
    expect(VM_PROFILE.id).toBe("vm-01");
    expect(VM_PROFILE.tag).toBe("VM-01");
    expect(VM_PROFILE.name).toBe("Linux Training Machine");
    expect(VM_PROFILE.guest.os).toBe("Buildroot 2013.08.1");
    expect(VM_PROFILE.guest.kernel).toMatch(/2\.6\.34\.14/);
    expect(VM_PROFILE.guest.arch).toMatch(/i686/);
    expect(VM_PROFILE.guest.shell).toMatch(/bin\/sh/);
  });

  it("lists every required hardware item with value and explanation", () => {
    expect(VM_PROFILE.hardware.map((item) => item.id)).toEqual(EXPECTED_IDS);
    expect(Object.keys(VM_HARDWARE).sort()).toEqual([...EXPECTED_IDS].sort());
    for (const item of VM_PROFILE.hardware) {
      expect(item.label.trim().length).toBeGreaterThan(0);
      expect(item.value.trim().length).toBeGreaterThan(0);
      // Beginner context: present and article-sized, never a wall of text.
      expect(item.detail.length).toBeGreaterThan(20);
      expect(item.detail.length).toBeLessThan(300);
      expect(VM_HARDWARE[item.id]).toBe(item);
    }
  });

  it("never claims hardware the machine does not have", () => {
    // Only one boot device exists: the CD image.
    expect(VM_PROFILE.boot.order).toEqual(["CD-ROM"]);
    expect(VM_PROFILE.boot.note).toMatch(/no hard disk or floppy/i);
    // Network: honestly disconnected, no adapter invented.
    expect(VM_HARDWARE.network.value).toMatch(/disconnected/i);
    expect(VM_HARDWARE.network.detail).toMatch(/no network adapter/i);
    // Storage: RAM disk only, no persistent disk invented.
    expect(VM_HARDWARE.storage.value).toMatch(/no hard disk/i);
    for (const item of VM_PROFILE.hardware) {
      expect(`${item.label} ${item.value} ${item.detail}`).not.toMatch(IMPOSSIBLE_HARDWARE);
    }
  });

  it("is deeply frozen — runtime state can never mutate the profile", () => {
    expect(Object.isFrozen(VM_PROFILE)).toBe(true);
    expect(Object.isFrozen(VM_PROFILE.guest)).toBe(true);
    expect(Object.isFrozen(VM_PROFILE.boot)).toBe(true);
    expect(Object.isFrozen(VM_PROFILE.boot.order)).toBe(true);
    expect(Object.isFrozen(VM_PROFILE.hardware)).toBe(true);
    expect(Object.isFrozen(VM_PROFILE.hardware[0])).toBe(true);
    expect(Object.isFrozen(VM_HARDWARE)).toBe(true);
    expect(() => {
      (VM_PROFILE as { name: string }).name = "mutated";
    }).toThrow(TypeError);
  });
});
