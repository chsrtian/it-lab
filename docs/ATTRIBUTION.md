# Attribution

Scenario tickets, KB summaries, and lab copy in this repository are **original** for this project.

## External references

Links only — full documents are not copied into this repo:

| Resource | Used for | URL |
|----------|----------|-----|
| RFC Editor | Protocol references (DNS, DHCP, TCP/IP) | https://www.rfc-editor.org/ |
| Microsoft Learn — Startup Repair | Windows boot recovery topic reference | https://learn.microsoft.com/en-us/windows-server/troubleshoot/startup-repair |

KB article `references[]` arrays may include additional official docs (Microsoft Learn, RFC Editor search pages). Those are **links with notes**, not redistributed text.

## Open-source design research (UI/UX redesign)

Repository research conducted for the interactive lab redesign. Patterns only — no code copied.

| Resource | License | Purpose | Why it helps | Bundle cost | Necessary |
|----------|---------|---------|--------------|-------------|-----------|
| [PC Anatomy](https://github.com/brickshow/pc-anatomy) | MIT | Interactive 3D PC component atlas (hotspots, layered CPU explosion, component articles) | Reference for hardware-lab affordances: click-to-learn hotspots, spatially-connected inspection, component identity + plain-language explanations | N/A (pattern only; we use SVG, no 3D deps) | No — pattern reference only |
| [React Flow / xyflow](https://github.com/xyflow/xyflow) | MIT | Node-based UI library for network topology | Already installed (`@xyflow/react`); confirms custom node/edge theming, health states, Panel overlays as the right approach for infra topology redesign | 0 (already a dependency) | Yes — already in use |
| [lucide-react](https://github.com/lucide-icons/lucide) | ISC | Icon set | Status/node icons without emoji; non-color status indicators | 0 (already a dependency) | Yes — already in use |
| ui-ux-pro-max skill | local skill | Design system guidance (styles, palettes, UX guidelines, checklist) | Focus states, contrast 4.5:1, touch targets, reduced motion, progressive-disclosure patterns | N/A (guidance only) | Yes — active design resource |
| [frontend-design (Junaid-PK)](https://github.com/Junaid-PK/frontend-design-skill) | Apache-2.0 | Anti-AI-slop review criteria: one primary intent per screen, hierarchy not volume, cards only for meaningful grouping, restrained color | Design review gate for ScenarioPage/terminal/topology/hardware reconstruction | N/A (criteria applied; skill not vendored into app) | Review criteria only |
| [frontend-design (PracticalSwan)](https://github.com/PracticalSwan/agent-skills) `frontend-design/` | MIT + Apache-2.0 | Product/workspace mode router; component review rubric; anti-patterns (no default heroes/cards/gradients/glass) | Design mode selection and verification protocol for P0 foundation redesign | N/A (criteria applied) | Review criteria only |
| [agents-inc/skills](https://github.com/agents-inc/skills) | MIT | `web-3d-react-three-fiber` SKILL.md + reference consulted for Phase 9 R3F critical requirements (frame-loop refs, Suspense, shared GPU resources, stopPropagation, clamped dpr) | 3D scene implementation guidance | 0 (criteria applied) | Guidance only |
| [ky1rie1/SiliconWiki](https://github.com/ky1rie1/SiliconWiki) | **no LICENSE file** | Procedural PC-assembly 3D techniques (ATX-proportional procedural geometry, render budget/quality tiers, reduced-motion animation timeline) — read-only study | Confirms feasibility of original procedural geometry instead of model files | 0 (excluded — see decisions) | **No — excluded from copying** |

**Decisions:**
- P0: no new runtime dependencies (SVG/CSS + React Flow + lucide only). **Phase 9 supersedes this only for the lazy 3D chunk:** `three` (MIT), `@react-three/fiber` (MIT), `@react-three/drei` (MIT), `@types/three` (MIT) — installed free/open-source, loaded exclusively via code-split `React.lazy`; never in the entry chunk.
- PC Anatomy is MIT; we borrow interaction *ideas* (hotspot → inspect panel). Its `public/models/*.glb` files are **not used**: repository-level MIT does not document model provenance, and unclear provenance = do not use.
- SiliconWiki has **no license** → all rights reserved by default: no code, geometry, or assets copied. Public README documentation informed our feasibility study only (procedural ATX-scale geometry, quality tiers, reduced-motion handling).
- 3D assets: **all geometry is original procedural TSX** — no third-party GLTF/GLB downloaded or embedded. Any future import requires a clear license recorded in this file first.
- No `@react-three/postprocessing` (bloom/glow banned by mandate); no drei `Environment` presets (they fetch HDRIs from CDNs — local-only mandate); no physics engine.
- Network topology stays on React Flow (already MIT, lazy-loaded); redesign = custom node styles, health states, causal edge coloring — not a library swap.
- External frontend-design skills are **review criteria only** — SKILL.md text is not redistributed in this repository beyond the criteria summarized in `docs/UI_DESIGN_REVIEW.md`.

## Third-party licenses (dependencies)

Notable runtime deps (see `package.json` / lockfile for versions):

- React, React DOM — MIT
- Vite — MIT
- Tailwind CSS — MIT
- react-router-dom — MIT
- zustand — MIT
- zod — MIT
- idb — ISC
- @xterm/xterm — MIT
- @xyflow/react — MIT
- lucide-react — ISC

Skills: `ui-ux-pro-max` under `.opencode/skills/`; `frontend-design` + `animations` under `.agents/skills` / `.claude/skills` — local design guidance.

## Content policy

- Do not paste copyrighted vendor manuals into scenarios.
- Prefer linking official free resources.
- Keep invented company/user names and ticket IDs unique to this lab.
