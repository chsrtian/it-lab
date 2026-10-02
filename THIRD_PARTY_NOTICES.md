# Third-Party Notices

This project (IT Problem-Solving Simulator) is distributed under its own
license. This file lists the third-party components that are bundled with or
served alongside the app, and where their license texts live.

## VM Lab components (Phase 14A)

The `/vm-lab` route loads the components below **lazily** — none of them are
part of the entry bundle or fetched until a learner presses *Power on*.

### 1. v86 (x86 emulator, WebAssembly)

- Project: https://github.com/copy/v86
- Version: `0.5.462` (upstream build `0.5.462+g5f9a90f`, commit `5f9a90f`)
- Installed as: npm dependency `v86`
- Files shipped in the browser bundle: `build/libv86.mjs` (lazy chunk),
  `build/v86.wasm` (fetched on first boot)
- License: **BSD-2-Clause**
- License text: [`docs/licenses/v86-BSD-2-Clause.txt`](docs/licenses/v86-BSD-2-Clause.txt)

### 2. SeaBIOS firmware (`seabios.bin`) and VGA BIOS (`vgabios.bin`)

- Project: https://www.seabios.org (source: https://github.com/coreboot/seabios)
- Version: `rel-1.16.2` — exactly the binaries produced by v86's
  `bios/fetch-and-build-seabios.sh`, fetched unmodified from
  `https://raw.githubusercontent.com/copy/v86/master/bios/`
  (the same commit line as the emulator above)
- Files: `public/vm/seabios.bin` (131,072 bytes), `public/vm/vgabios.bin`
  (36,352 bytes)
- The boot screen reports `SeaBIOS (version rel-1.16.2-0-g5f9a90f)`.
- License: SeaBIOS is distributed under **GPL-3.0** together with its
  **LGPL-3.0** linking exception for option ROMs (the project ships `COPYING`
  and `COPYING.LESSER` together; binaries are distributed under the LGPL-3.0
  terms that apply to them)
- License texts:
  - [`docs/licenses/SeaBIOS-GPL-3.0.txt`](docs/licenses/SeaBIOS-GPL-3.0.txt)
  - [`docs/licenses/LGPL-3.0.txt`](docs/licenses/LGPL-3.0.txt)
- The SeaBIOS option ROM build also contains **iPXE** (PXE boot ROM,
  visible as `iPXE (http://ipxe.org)` during boot); iPXE is
  **GPL-2.0 with the IPXE-EXCEPTION** — https://ipxe.org/legal

### 3. Guest image (`linux.iso`)

- Project: https://github.com/copy/images (small bootable images for copy.sh)
- File: `public/vm/linux.iso` (5,666,816 bytes), fetched from
  `https://raw.githubusercontent.com/copy/images/master/linux.iso`
- Contents: Linux kernel **2.6.34.14** (i686) + **Buildroot 2013.08.1**
  userland (BusyBox shell/utilities), root filesystem is a RAM disk
- License: **GPL-2.0** for the kernel, Buildroot tree, and BusyBox
- License text: [`docs/licenses/GPL-2.0.txt`](docs/licenses/GPL-2.0.txt)
- Corresponding source (as required by the GPL):
  - Kernel: https://cdn.kernel.org/pub/linux/kernel/v2.6/linux-2.6.34.14.tar.xz
  - Buildroot 2013.08.1: https://buildroot.org (release archive)
  - BusyBox: https://busybox.net/downloads/

### 4. WASM firmware module

- `v86.wasm` is the compiled core of v86 itself — covered by the v86
  BSD-2-Clause license above.

## Simulator core

The rest of the application (scenario engine, labs, UI) depends only on the
packages listed in `package.json`; each of those ships its own `LICENSE` /
`package.json` license field inside `node_modules`. The simulator itself
executes **no host commands**: terminal input is matched against a per-lab
allowlist in-process (see `docs/VERIFICATION.md`).
