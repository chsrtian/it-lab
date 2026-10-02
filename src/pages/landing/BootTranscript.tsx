import { useEffect, useRef, useState } from "react";
import { BOOT_STAGES } from "@/features/vmlab/bootSequence";
import { VM_PROFILE } from "@/features/vmlab/vmProfile";
import { useInView, usePrefersReducedMotion } from "./motionHooks";

/**
 * VM boot transcript demo (Phase 15B.1) — PRESENTATION ONLY.
 *
 * Lines are the marker strings the real guest printed, captured in phase
 * 14B-3A (`bootSequence.ts`); the kernel line carries the profile's actual
 * version. No emulator, no WASM, no prediction — a lightweight transcript
 * that types itself out, activates the matching stage chip, then loops.
 * It runs only while on screen, and reduced motion shows the whole
 * transcript at once.
 */

const kernelVersion = VM_PROFILE.guest.kernel.replace("Linux ", "");

const BOOT_LINES: Record<string, string> = {
  firmware: BOOT_STAGES[0].marker,
  bootDevice: `${BOOT_STAGES[1].marker}...`,
  bootloader: BOOT_STAGES[2].marker,
  kernel: `Linux version ${kernelVersion}`,
  userspace: `${BOOT_STAGES[4].marker} ...`,
  ready: BOOT_STAGES[5].marker,
};

const LINE_MS = 780;
const LOOP_PAUSE_MS = 2800;

export function BootTranscript() {
  const reduced = usePrefersReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const { supported, inView } = useInView(ref, { once: false });
  const staticAll = reduced || !supported;
  const [visible, setVisible] = useState(0);

  // Auto typing only when the section is actually on screen and motion is
  // allowed; otherwise the transcript is simply complete and readable.
  useEffect(() => {
    if (staticAll || !inView) return;
    if (visible < BOOT_STAGES.length) {
      const t = setTimeout(
        () => setVisible((v) => v + 1),
        visible === 0 ? 420 : LINE_MS,
      );
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setVisible(0), LOOP_PAUSE_MS);
    return () => clearTimeout(t);
  }, [staticAll, inView, visible]);

  const shown = staticAll ? BOOT_STAGES.length : visible;
  const current = shown > 0 ? shown - 1 : -1;

  return (
    <div className="lp-vm-demo" ref={ref}>
      <ol className="lp-boot" aria-label="Boot stages">
        {BOOT_STAGES.map((stage, i) => (
          <li
            key={stage.id}
            data-active={i < shown ? "true" : "false"}
            data-current={i === current ? "true" : "false"}
            aria-current={i === current ? "step" : undefined}
          >
            {stage.label}
          </li>
        ))}
      </ol>

      <div
        className="lp-term lp-boot-term"
        role="group"
        aria-label="Boot transcript (representative output)"
      >
        {BOOT_STAGES.slice(0, shown).map((stage, i) => (
          <div className="lp-bl-line" key={stage.id}>
            <span className="lp-bl-text">{BOOT_LINES[stage.id]}</span>
            {i === current && !staticAll ? (
              <span className="lp-caret" aria-hidden />
            ) : null}
          </div>
        ))}
        {shown === 0 ? (
          <div className="lp-bl-line">
            <span className="lp-bl-text lp-bl-idle">SeaBIOS</span>
            <span className="lp-caret" aria-hidden />
          </div>
        ) : null}
      </div>
    </div>
  );
}
