import { switchVisuals } from "../families/switch";
import { flag, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

const PORTS = 8;

/** 1U access switch: port LEDs are facts; VLAN/admin words stay gated. */
export function SwitchSvg({ state, selected, onSelect, visible }: SvgProps) {
  const v = switchVisuals(state);
  const trunkChecked = flag(state, "trunkChecked");
  const poeTone = v.poeLed;
  const trunkTextFill =
    v.trunkTone === "ok" ? C.ok : v.trunkTone === "warn" ? C.warn : C.muted;
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Managed access switch with port LEDs and uplink"
      data-testid="switch-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        WIRING CLOSET · SW-ACCESS-1
      </text>

      {/* Rack rails */}
      <rect x="18" y="70" width="10" height="150" fill="#131b2b" stroke={C.edge} />
      <rect x="392" y="70" width="10" height="150" fill="#131b2b" stroke={C.edge} />

      {/* Uplink cable rising toward the router */}
      {visible("switch-uplink") && (
        <HotspotG id="switch-uplink" label="Switch uplink" selected={selected} onSelect={on}>
          <path
            d="M110 96 V44 H300"
            fill="none"
            stroke={flag(state, "uplinkLink") ? C.ok : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={flag(state, "uplinkCableSeated") ? "0" : "4 3"}
          />
          <rect x="104" y="96" width="14" height="12" rx="1" fill={C.dark} stroke={selStroke(sel("switch-uplink"))} strokeWidth={selWidth(sel("switch-uplink"))} />
          <text x="118" y="40" fill={C.muted} fontSize="7" fontFamily="monospace">
            UPLINK → ROUTER
          </text>
        </HotspotG>
      )}

      {/* Chassis */}
      {visible("switch") && (
        <HotspotG id="switch" label="Switch" selected={selected} onSelect={on}>
          <rect
            x="28"
            y="108"
            width="364"
            height="74"
            rx="4"
            fill={C.body}
            stroke={selStroke(sel("switch"))}
            strokeWidth={selWidth(sel("switch"))}
          />
          {/* vents */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={`v-${i}`} x1={40 + i * 6} y1={124} x2={40 + i * 6} y2={166} stroke={C.edge} strokeWidth="2" />
          ))}
          <Led cx={88} cy={126} tone={v.powerLed} />
          <text x="96" y="129" fill={C.muted} fontSize="6" fontFamily="monospace">
            PWR
          </text>
          <Led cx={88} cy={150} tone={v.uplinkLed} />
          <text x="96" y="153" fill={C.muted} fontSize="6" fontFamily="monospace">
            UP
          </text>
          <text x="70" y="176" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            SW-ACC-1
          </text>
          {/* PoE budget LED (only meaningful once checked) */}
          {poeTone && (
            <g>
              <Led cx={88} cy={166} tone={poeTone} r={2.5} />
              <text x="96" y="169" fill={C.muted} fontSize="6" fontFamily="monospace">
                PoE
              </text>
            </g>
          )}
        </HotspotG>
      )}

      {/* VLAN trunk badge — shows real path only after the trunk is checked */}
      {visible("switch-vlan") && (
        <HotspotG id="switch-vlan" label="VLAN trunk" selected={selected} onSelect={on}>
          <rect
            x="130"
            y="118"
            width="72"
            height="34"
            rx="2"
            fill={C.dark}
            stroke={selStroke(sel("switch-vlan"))}
            strokeWidth={selWidth(sel("switch-vlan"))}
          />
          <text x="166" y="132" textAnchor="middle" fill={C.text} fontSize="7" fontFamily="monospace">
            TRUNK
          </text>
          <text x="166" y={146} textAnchor="middle" fill={trunkTextFill} fontSize="7" fontFamily="monospace">
            {trunkChecked ? v.trunkCarries.join(",") : "? ? ?"}
          </text>
        </HotspotG>
      )}

      {/* Port bank */}
      {visible("switch-port") && (
        <HotspotG id="switch-port" label="Switch ports" selected={selected} onSelect={on}>
          <rect
            x="214"
            y="118"
            width="168"
            height="48"
            rx="2"
            fill={C.dark}
            stroke={selStroke(sel("switch-port"))}
            strokeWidth={selWidth(sel("switch-port"))}
          />
          {v.portLeds.slice(0, PORTS).map((tone, i) => {
            const x = 220 + i * 21;
            return (
              <g key={`port-${i}`}>
                <rect x={x} y={124} width="16" height="18" rx="1" fill="#0a0f1a" stroke={C.edge} strokeWidth="0.8" />
                <rect x={x + 3} y={128} width="10" height="4" fill="#1e293b" />
                <Led cx={x + 4} cy={150} tone={tone} r={2.5} />
                <Led cx={x + 12} cy={150} tone={tone === "off" ? "off" : "info"} r={2.5} />
                <text x={x + 8} y={163} textAnchor="middle" fill={C.muted} fontSize="5" fontFamily="monospace">
                  {i + 1}
                </text>
              </g>
            );
          })}
        </HotspotG>
      )}

      <text x="12" y="268" fill="#334155" fontSize="7" fontFamily="monospace">
        {v.powerLed !== "ok"
          ? "SWITCH OFF"
          : v.uplinkLed !== "ok"
            ? "NO UPLINK"
            : "SWITCHING FRAMES"}
      </text>
      <text x="408" y="268" textAnchor="end" fill="#334155" fontSize="7" fontFamily="monospace">
        {trunkChecked ? `trunk: ${v.trunkCarries.join(",")}` : "trunk: not checked"}
      </text>
    </svg>
  );
}
