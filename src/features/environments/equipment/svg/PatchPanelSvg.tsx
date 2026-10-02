import {
  PATCH_PANEL_PORTS,
  PATCH_SWITCH_PORTS,
  patchPanelVisuals,
} from "../families/patchPanel";
import { flag, num, str, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

const PANEL_X = 262;
const SWITCH_X = 262;
const panelPortX = (i: number) => PANEL_X + 6 + i * 11;
const switchPortX = (i: number) => SWITCH_X + 6 + i * 16;

/**
 * End-to-end copper path: desk → wall jack → horizontal run → patch panel →
 * patch lead → switch. The run's landing is only drawn once it was traced.
 */
export function PatchPanelSvg({ state, selected, onSelect, visible }: SvgProps) {
  const v = patchPanelVisuals(state);
  const traced = flag(state, "horizontalTraced");
  const jackTraced = flag(state, "jackTraced");
  const patchChecked = flag(state, "patchChecked");
  const endpointSeated = flag(state, "endpointSeated");
  const horizontalSeated = flag(state, "horizontalSeated");
  const patchSeated = flag(state, "patchSeated");
  const match = state.panelMatch === true;
  const runColor = !jackTraced ? "#334155" : horizontalSeated ? C.ok : C.crit;
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);
  const panelIdx = v.activePanelIndex;
  const switchIdx = v.activeSwitchIndex;
  const runLandX = v.activeRunIndex !== null ? panelPortX(v.activeRunIndex) : 250;

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Copper link path from desk through patch panel to switch"
      data-testid="patch-panel-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        DESK 3-14 → COMMS CABINET
      </text>

      {/* Office wall (left) with cavity */}
      <rect x="0" y="30" width="150" height="214" fill={C.wall} />
      <rect x="0" y="30" width="150" height="214" fill="none" stroke={C.edge} strokeDasharray="4 4" />
      <text x="12" y="46" fill="#334155" fontSize="6" fontFamily="monospace">
        WALL CAVITY
      </text>

      {/* Desk + laptop */}
      <rect x="0" y="216" width="150" height="64" fill="#0b111d" />
      <line x1="0" y1="216" x2="150" y2="216" stroke={C.edge} strokeWidth="2" />
      <g aria-hidden>
        <rect x="30" y="176" width="66" height="40" rx="3" fill={C.body} stroke={C.edge} />
        <rect x="36" y="182" width="54" height="28" rx="1" fill={C.dark} stroke={C.edge} strokeWidth="0.8" />
        <rect x="24" y="216" width="78" height="6" rx="2" fill={C.plate} stroke={C.edge} />
        <Led cx={92} cy={188} tone={flag(state, "endpointPowered") ? "ok" : "off"} r={2.5} />
        <text x="63" y="244" textAnchor="middle" fill={C.muted} fontSize="7" fontFamily="monospace">
          PC 3-14
        </text>
      </g>

      {/* Cabling: desk patch → jack, horizontal run, cabinet patch lead */}
      {visible("ethernet-cable") && (
        <HotspotG id="ethernet-cable" label="Cabling" selected={selected} onSelect={on}>
          {/* desk patch lead (endpoint end) */}
          <path
            d="M96 196 H116 V150 H56"
            fill="none"
            stroke={endpointSeated ? (jackTraced ? runColor : C.text) : C.crit}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={endpointSeated ? "0" : "4 3"}
          />
          {/* horizontal run inside the cavity */}
          <path
            d={`M56 140 H${runLandX} V86`}
            fill="none"
            stroke={runColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={traced && horizontalSeated ? "0" : "5 4"}
            opacity={traced ? 1 : 0.55}
            data-testid="patch-horizontal-run"
          />
          {!traced && (
            <g>
              <circle cx="244" cy="86" r="7" fill={C.dark} stroke={C.warn} strokeWidth="1.5" />
              <text x="244" y="89" textAnchor="middle" fill={C.warn} fontSize="8" fontFamily="monospace">
                ?
              </text>
            </g>
          )}
          {/* patch lead panel → switch */}
          <path
            d={`M${patchChecked || traced ? panelPortX(v.activePanelIndex) : 320} 116 C ${
              patchChecked || traced ? panelPortX(v.activePanelIndex) : 320
            } 140, ${switchPortX(switchIdx) + 6} 138, ${switchPortX(switchIdx) + 6} 168`}
            fill="none"
            stroke={!patchChecked ? "#334155" : patchSeated ? (match ? C.ok : C.warn) : C.crit}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={!patchChecked ? "5 4" : patchSeated ? "0" : "4 3"}
            opacity={!patchChecked ? 0.7 : 1}
          />
        </HotspotG>
      )}

      {/* Wall jack faceplate */}
      {visible("wall-jack") && (
        <HotspotG id="wall-jack" label="Wall jack" selected={selected} onSelect={on}>
          <rect
            x="36"
            y="126"
            width="40"
            height="30"
            rx="3"
            fill={C.plate}
            stroke={selStroke(sel("wall-jack"))}
            strokeWidth={selWidth(sel("wall-jack"))}
          />
          <rect
            x="48"
            y="134"
            width="16"
            height="12"
            rx="1"
            fill={C.dark}
            stroke={!jackTraced ? C.edge : horizontalSeated ? C.ok : C.crit}
            strokeWidth="1.2"
          />
          <text x="56" y="154" textAnchor="middle" fill={C.muted} fontSize="5" fontFamily="monospace">
            3-14
          </text>
        </HotspotG>
      )}

      {/* Comms cabinet */}
      <rect x="250" y="30" width="158" height="186" rx="4" fill="#0a101c" stroke={C.edge} />
      <text x="329" y="46" textAnchor="middle" fill="#334155" fontSize="7" fontFamily="monospace">
        CABINET · IDF-2
      </text>
      {/* rack posts */}
      <rect x="254" y="52" width="6" height="156" fill="#131b2b" />
      <rect x="398" y="52" width="6" height="156" fill="#131b2b" />

      {/* Patch panel */}
      {visible("patch-panel") && (
        <HotspotG id="patch-panel" label="Patch panel" selected={selected} onSelect={on}>
          <rect
            x={PANEL_X}
            y="56"
            width="132"
            height="60"
            rx="3"
            fill={C.body}
            stroke={selStroke(sel("patch-panel"))}
            strokeWidth={selWidth(sel("patch-panel"))}
          />
          <text x="328" y="68" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            PANEL · 12P CAT6
          </text>
          {Array.from({ length: PATCH_PANEL_PORTS }).map((_, i) => (
            <rect
              key={`pp-${i}`}
              x={panelPortX(i)}
              y={74}
              width="9"
              height="16"
              rx="1"
              fill={i === panelIdx && traced ? C.dark : "#0a0f1a"}
              stroke={i === panelIdx && traced ? C.accent : C.edge}
              strokeWidth={i === panelIdx && traced ? 1.5 : 0.8}
            />
          ))}
          {/* physical label strip */}
          <rect x="266" y="96" width="124" height="14" rx="1" fill="#101828" stroke={C.edge} strokeWidth="0.6" />
          <text x="328" y="106" textAnchor="middle" fill={C.text} fontSize="7" fontFamily="monospace">
            {`LBL: ${str(state, "labelPanelPort") ?? "?"} · PANEL P${num(state, "patchPanelPort") ?? "?"}`}
          </text>
        </HotspotG>
      )}

      {/* Switch with port LEDs */}
      {visible("switch-port") && (
        <HotspotG id="switch-port" label="Switch ports" selected={selected} onSelect={on}>
          <rect
            x={SWITCH_X}
            y="168"
            width="132"
            height="44"
            rx="3"
            fill={C.body}
            stroke={selStroke(sel("switch-port"))}
            strokeWidth={selWidth(sel("switch-port"))}
          />
          <text x="328" y="180" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            EDGE SW · 8P
          </text>
          {v.switchPortLeds.slice(0, PATCH_SWITCH_PORTS).map((tone, i) => (
            <g key={`sp-${i}`}>
              <rect
                x={switchPortX(i)}
                y={186}
                width="13"
                height="14"
                rx="1"
                fill="#0a0f1a"
                stroke={i === switchIdx ? C.accent : C.edge}
                strokeWidth={i === switchIdx ? 1.3 : 0.8}
              />
              <Led cx={switchPortX(i) + 6} cy={206} tone={tone} r={2.5} />
            </g>
          ))}
        </HotspotG>
      )}

      <text x="150" y="268" fill="#334155" fontSize="7" fontFamily="monospace">
        {flag(state, "pathOk")
          ? "END-TO-END LINK UP"
          : !endpointSeated
            ? "DESK END UNPLUGGED"
            : !traced
              ? "PATH NOT FULLY TRACED"
              : !patchChecked
                ? "PATCH LEAD NOT CHECKED"
                : "PATH BROKEN"}
      </text>
      <text x="408" y="268" textAnchor="end" fill="#334155" fontSize="7" fontFamily="monospace">
        {traced
          ? `run lands P${num(state, "horizontalPort") ?? "?"} · patched P${
              num(state, "patchPanelPort") ?? "?"
            }${match ? "" : " · MISMATCH"}`
          : "trace the run to see where it lands"}
      </text>
    </svg>
  );
}
