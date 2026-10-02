# VM Lab (Phase 14A — Browser x86 Proof of Concept)

`/vm-lab` runs a **real x86 machine inside the browser**: the open-source
[v86](https://github.com/copy/v86) emulator (WebAssembly), booting a
Buildroot Linux image from a read-only CD-ROM. Everything executes on the
learner's machine — there is no backend, no upload, and no host command
execution. The route is experimental and intentionally separate from the
deterministic 100-scenario simulator.

## What was proven (Phase 14A scope)

| Property | Value |
| --- | --- |
| Emulator | v86 `0.5.462+g5f9a90f` (npm `v86@0.5.462`), BSD-2-Clause |
| Guest | Buildroot 2013.08.1, Linux 2.6.34.14 i686, BusyBox shell, prompt `/root%` |
| Firmware | SeaBIOS `rel-1.16.2` (`seabios.bin` 131,072 B + `vgabios.bin` 36,352 B) |
| Guest image | `linux.iso` 5,666,816 B (read-only CD-ROM) |
| RAM | 64 MiB guest memory |
| Networking | **None configured** — the guest has only a loopback interface |
| Persistence | Optional save-state in this browser only (IndexedDB, ~37.6 MB per state) |
| First boot (browser, dev build) | kernel text ≈ 5.3 s, shell ≈ 19 s wall-clock (automation overhead included) |
| Reset (destroy + cold boot) | ≈ 28 s wall-clock including capture overhead |
| Runs fully client-side | Yes — all requests are same-origin static files |

## Architecture

```
VmLabPage.tsx  (lazy route, React)
   └── useVmLab.ts          React binding: status/progress/error state,
   │                        controller created on mount, destroyed on unmount
   └── VmController.ts      The single adapter between UI and v86.
   │      - statuses: stopped / starting / running / paused / restoring / error
   │      - start(container) · pause · resume · reset (destroy + cold boot)
   │      - saveState / restoreState (RESTORE ≠ RESET)
   │      - buildOptions() — never contains `net_device` (contract-tested)
   └── loadV86.ts           The only `import("v86")` in the codebase
   └── vmStateStorage.ts    IndexedDB (`idb`) with in-memory fallback
```

Key decisions:

- **Lazy by construction.** `VmLabPage` is `React.lazy`-loaded by the router;
  v86 itself is a dynamic import inside `loadV86.ts`, executed only when the
  learner presses *Power on*. The entry bundle contains zero emulator code
  (verified by source-scans in `safety.test.ts` and by the production build
  report below).
- **Assets are plain static files.** `public/vm/{seabios.bin,vgabios.bin,
  linux.iso}` are served verbatim by Vite/Vercel. The wasm URL comes from the
  installed package (`v86/build/v86.wasm?url`) so it cannot drift from the
  dependency version.
- **Clean baseline without image copies.** The guest root filesystem is a RAM
  disk and the CD-ROM is read-only, so *every* boot is inherently clean —
  Reset simply destroys the runtime and boots again from the immutable image.
- **No networking by design.** v86 is constructed without `net_device`
  (asserted in unit tests); there is no relay/WebSocket, no bridge, and no
  backend endpoint. Verified in a live guest: `ls /sys/class/net` → `lo` only.
- **Local-only state.** Save-state is ~37.6 MB in IndexedDB under
  `itlab-vm-lab`/`vm-01`; it never leaves the browser. Deleting site data
  clears it. Restore works both on a live machine and from stopped (including
  after a full page reload).

## Bundle impact (production build)

| Asset | Size | gzip | Loading |
| --- | --- | --- | --- |
| Entry `index-*.js` (after 14A) | 2,040.68 kB | 508.55 kB | always |
| Entry (baseline before 14A) | 2,049.07 kB | 511.32 kB | always |
| `VmLabPage-*.js` | 13.97 kB | 4.65 kB | route open |
| `libv86-*.js` | 355.01 kB | 91.49 kB | first *Power on* |
| `v86.wasm` | 2,101.62 kB | 406.48 kB | first *Power on* |
| `seabios.bin` + `vgabios.bin` | 167,424 B | — | first *Power on* |
| `linux.iso` | 5,666,816 B | — | first *Power on* |

The entry bundle **shrank by 8.39 kB** (gzip −2.77 kB) — the VM feature added
nothing to first load. Total VM payload fetched on first boot ≈ 8.0 MB.

## Verification performed

Automated (all green, `npm test` → 411/411, typecheck, lint, build):

- `src/features/vmlab/VmController.test.ts` — lifecycle, intent-based status
  transitions, listener cleanup on destroy, cancelled-start abort, friendly
  errors, save/restore paths, **`net_device`/`network_relay_url` absent**.
- `src/features/vmlab/safety.test.ts` — no `child_process` / `eval(` /
  `new Function` / `require(` / `exec(` in any VM Lab source; v86 reachable
  only through dynamic import; route is code-split; options contain no
  networking; guest disk is CD-ROM only (no `hda:`/`fda:`).
- `src/features/vmlab/vmStateStorage.test.ts` — storage copy semantics and
  IndexedDB-absent fallback.
- `src/features/vmlab/vmProfile.test.ts` — (14B-2) profile schema, required
  hardware entries, no impossible-hardware claims, deep-frozen profile.
- `src/pages/VmLabPage.test.tsx` — controls reflect state, error UI with
  collapsible details, unmount destroys the emulator, plus 14B-2 inspector:
  profile-derived rendering, screen stays mounted, profile/runtime
  separation, keyboard/screen-reader access.

Live browser validation (headless Chromium via agent-browser, dev build):

1. Entry page performs **zero** VM requests; opening `/vm-lab` fetches only
   the page module; `v86.wasm`, BIOS files and `linux.iso` are fetched only
   after *Power on* (verified request log).
2. Boot sequence observed and screenshotted: SeaBIOS → iPXE → ISOLINUX →
   kernel log → `/root%` shell (screenshots `14a-02`, `14a-04`).
3. Keyboard: real key events reach the guest (`uname -a` →
   `2.6.34.14 … i686 GNU/Linux`, screenshot `14a-07`).
4. Pause → `PAUSED` (badge + overlay), Resume → `RUNNING`, controls flip
   enablement accordingly.
5. Reset → fresh SeaBIOS boot, old session output gone, clean `/root%`.
6. Save → Restore (live): screen content rolled back to the saved moment;
   Restore after a full page reload cold-boots seeded with the saved state
   (screenshots `14a-13`, `14a-23`).
7. Leaving the route removes the emulator from the DOM (effect cleanup →
   `destroy()`), no console/page errors.
8. Reopening `/vm-lab` shows a fresh *stopped* machine; *Power on* boots
   cleanly again (≈ 19 s) with no residue of previous sessions.
9. Guest networking: `ifconfig` shows no interfaces, `ls /sys/class/net` →
   `lo` only; browser request log contains **only same-origin dev-server
   requests** (no external hosts, no WebSocket).
10. Console: no errors or unhandled rejections during the whole session.

## Phase 14B-2 — VM profile & virtual hardware inspector

**VM profile** (`src/features/vmlab/vmProfile.ts`) is the single authoritative,
deep-frozen description of what the machine contains. The header tag/name, the
compact spec strip and the hardware inspector all derive their displayed facts
from it — no value is hardcoded twice in the UI. Every fact was verified
against the real guest in the 14B-1 capability inventory (headless probe of
`linux.iso`: `uname -a`, `/etc/os-release`, `/proc/cpuinfo`, `mount`, `df`,
`dmesg`, inittab, `command -v` battery).

| Profile field | Verified value |
| --- | --- |
| Machine | `VM-01` — "Linux Training Machine" |
| Guest OS | Buildroot 2013.08.1 |
| Kernel | Linux 2.6.34.14 · i686 (32-bit x86) |
| Shell | BusyBox ash (`/bin/sh`) |
| CPU | Pentium III-class (emulated) |
| RAM | 64 MiB (virtual) |
| Firmware | SeaBIOS |
| Boot order | CD-ROM (single device — no disk/floppy attached) |
| Storage | RAM disk, no persistent hard disk |
| Boot media | `linux.iso` · 5.4 MB, read-only |
| Display | Virtual VGA console (80×25 text) |
| Keyboard / mouse | Emulated PS/2 each |
| Network | No adapter — **disconnected by design** |

**Profile vs runtime state.** `VM_PROFILE` is static configuration and is
frozen; runtime state (STOPPED/STARTING/RUNNING/PAUSED/RESTORING/ERROR)
lives only in `VmController` + `useVmLab`. Pausing or resuming never mutates
the profile (tested by snapshot equality).

**Virtual hardware inspector.** A *Virtual hardware* button under the spec
strip toggles an `aside` equipment panel rendered as a **reserved grid
column** (`.vm-workspace`) next to the machine — stacked below it on narrow
screens — so the VM screen is never covered. Closed = not rendered = zero
listeners/polling/DOM. The panel lists the 9 hardware items with short
beginner explanations ("what it is and why the machine has it"), plus the
boot order and the guest-system block, in learner-facing language that says
*virtual CPU / virtual memory / emulated hardware* and states up front that
the machine runs inside the browser emulator.

14B-2 gates: `npm test` → **421/421** (411 baseline + profile tests + 2 new
safety-scan sources), typecheck, lint and build green; entry bundle unchanged
(2,040.69 kB / 508.56 kB gzip) — the profile and inspector ship inside the
lazy `VmLabPage` chunk.

## Phase 14B-3 — Boot Sequence Explorer

An educational layer wrapped **around the real boot** (presentation only —
the emulator, its controls and every 14A/14B-2 behavior are untouched). A
compact one-line timeline under the screen names each boot stage the moment
its marker is actually observed in the guest's screen output, with a
"What am I seeing?" / "Why it matters?" explanation. Nothing is simulated:
a stage the guest never produced is never claimed.

**Stages and their observed markers** (captured from the real guest, phase
14B-3A headless traces):

| Stage | Marker in the put-char stream | Observed |
| --- | --- | --- |
| Firmware | `SeaBIOS` | banner `SeaBIOS (version rel-1.16.2-…)` @ ~1.3 s |
| Boot device | `Booting from DVD/CD` | SeaBIOS hand-off to the CD @ ~1.4 s |
| Bootloader | `ISOLINUX` | ISOLINUX banner @ ~1.5 s |
| Kernel | `Linux version 2.6` | first dmesg line `[    0.000000] Linux version 2.6.34.14 …` |
| Userspace | `VFS: Mounted root` | last kernel line `[    4.667617] VFS: Mounted root …` |
| Ready | `/root%` | BusyBox ash prompt |

Uncertainty is disclosed, not hidden: this guest prints no distinct
userspace banner (no init output — inittab runs `-/bin/sh` directly), so the
honest boundary is the kernel's `VFS: Mounted root` hand-off; the prompt
follows almost immediately. The observed-emission quirks are documented too:
the shell rewrites every prompt cell twice (consecutive identical cell writes
are collapsed — they carry no new screen state), and `Booting from DVD/CD`
plus the ISOLINUX banner print within the same frame, so they can share one
paint: the stage is still recorded and shown as observed in the final
timeline even when it never gets a frame of its own.

**Architecture** (`src/features/vmlab/bootSequence.ts`):

- `createBootObserver()` — O(1)-per-char ring (1024 chars) fed by
  `VmController`'s `screen-put-char` listener (printable chars only). Each
  pending marker is tail-matched when its final character arrives; stages are
  sticky per boot. Event-driven only: no rAF, no polling, no OCR.
- `deriveBootPresentation(status, stage, restored)` — pure function mapping
  runtime status + observation to `{stopped | booting | ready | paused |
  restored}`. The explorer renders from it; it owns no emulator state and
  adds no timers.
- Restore sets `restored: true` and blocks stage claiming for that session
  ("Restored state — boot history unavailable.", every step `pending`,
  no `aria-current`) — truthful because the snapshot was not booted here.
  Reset/stop/start clears the observation; the next real boot is re-observed
  from zero. Reset remains the only fresh-boot trigger.
- Failure-boundary education is copy only (where boot stops is a clue);
  no fault injection, no scenario/verification integration in this phase.

**UI.** `BootSequenceExplorer` sits between the screen and the control deck:
header (title + Explore/Free mode), a continuous `<ol>` timeline whose
current stage carries `aria-current="step"` plus screen-reader state text
(observed / current stage / not observed yet / boot history unavailable —
state is never color-only: hollow → filled → ringed dot, bold label), a
polite live region with the stage explanation, and the failure-clue line.
*Free boot* mode (a plain toggle button, `aria-pressed`) collapses everything
except the header so the display stays dominant — presentation only. Copy
never claims stages; while a fresh boot is running with nothing observed yet
the honest fallback is shown ("Booting… The virtual machine is producing
startup output."). Pause shows the frozen stage with "— paused"; resume
returns to it. Nothing in the explorer moves focus.

**Keyboard capture fix (§19).** v86's keyboard adapter listens on `window`
while the machine runs and calls `preventDefault()` on every key not aimed
at an input — which would swallow Tab navigation and Enter/Space activation
on page controls (pre-existing since 14A). `VmLabPage` now registers a
capture-phase `window` listener that stops exactly those navigation and
activation keys before v86 sees them (they keep their native meaning and
never leak into the guest). Keys typed at the page body and anything aimed
at the guest screen keep the original v86 path — verified in the browser:
`Tab` moves focus between controls, `Enter`/`Space` toggle the mode, and
`echo`+Enter still executes in the guest shell.

14B-3 gates: `npm test` → **449/449** (observer/controller/presentation +
page tests, including the double-write and keyboard-passthrough regressions),
typecheck, lint and build green; entry bundle unchanged (2,040.69 kB /
508.53 kB gzip), `VmLabPage` chunk 26.09 kB / 8.63 kB gzip (still lazy).
Real-browser validation covered: full stage progression across two boots,
pause/resume, reset → clear → re-observe, save/restore truthful state,
Free/Explore toggle by mouse and keyboard, 420 px viewport (no horizontal
overflow), `prefers-reduced-motion` (transitions off), no focus stealing,
and screenshots `14b3-01…06`.

## Limitations (honest)

- One fixed machine only: 64 MiB RAM, one CD-ROM image, no disk images, no
  ISO upload, no snapshots library, no multiple VMs.
- No networking of any kind (by Phase 14A rule); the guest cannot reach the
  host, LAN or Internet — and has no interface to try.
- No 64-bit/multicore guest support (v86 is 32-bit x86, single core).
- Save-state is per-browser, per-device (~37.6 MB each); no sync, no export.
  Private-mode browsers without IndexedDB fall back to session-only memory.
- Boot time depends on the learner's device; measurements above are from one
  Windows machine in a headless browser.
- Fullscreen requires a user gesture and can behave differently by browser.
- The text console renders via v86's text layer at a fixed size; window
  resizing scales the display but does not reflow it.

## Manual browser checklist (for a human pass)

1. Open `/vm-lab` in Chrome/Firefox — page shows *STOPPED*, no VM traffic in
   DevTools → Network before pressing *Power on*.
2. Press *Power on* — BIOS → bootloader → kernel → `/root%` appears; Network
   shows only localhost files (`*.wasm`, `seabios.bin`, `vgabios.bin`,
   `linux.iso`).
3. Click the screen, type `uname -a` + Enter — guest answers.
4. *Pause* → badge shows `PAUSED`; CPU usage drops. *Resume* → `RUNNING`.
5. Run a command, then *Reset* — fresh BIOS boot, previous output gone.
6. *Save state*, run another command, *Restore state* — screen returns to the
   saved point.
7. Reload the page — *Restore state* remains available and boots to the saved
   state (state stored only in this browser).
8. Navigate to another page — no errors; return — machine is *STOPPED* and
   boots fresh; DevTools shows no leftover emulator workers/streams.
9. *Fullscreen* (user gesture) — display fills the screen; Esc exits.
10. With DevTools open the whole time: no requests to non-local hosts, no
    console errors.
