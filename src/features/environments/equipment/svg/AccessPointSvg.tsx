import { accessPointVisuals } from "../families/accessPoint";
import { flag, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

/** Ceiling AP: PoE drop from the switch, radio face, association LED. */
export function AccessPointSvg({ state, selected, onSelect, visible }: SvgProps) {
  const v = accessPointVisuals(state);
  const radioUp = flag(state, "radioUp");
  const assoc = flag(state, "clientAssociated");
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Ceiling access point with PoE drop and wireless client"
      data-testid="access-point-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        OPEN OFFICE · CEILING ZONE
      </text>

      {/* Ceiling tile */}
      <rect x="0" y="34" width="420" height="14" fill="#101828" stroke={C.edge} />
      {[60, 160, 260, 360].map((x) => (
        <line key={`tile-${x}`} x1={x} y1="34" x2={x} y2="48" stroke={C.edge} strokeWidth="1" />
      ))}

      {/* PoE switch on the wall right (upstream) */}
      {visible("ap-poe") && (
        <HotspotG id="ap-poe" label="PoE drop" selected={selected} onSelect={on}>
          <rect x="352" y="96" width="48" height="40" rx="3" fill={C.plate} stroke={C.edge} />
          <text x="376" y="112" textAnchor="middle" fill={C.text} fontSize="6" fontFamily="monospace">
            PoE SW
          </text>
          <rect x="360" y="118" width="14" height="10" rx="1" fill={C.dark} stroke={selStroke(sel("ap-poe"))} strokeWidth={selWidth(sel("ap-poe"))} />
          <Led cx={382} cy={123} tone={v.upstreamLed} r={2.5} />
          {/* drop cable switch → AP */}
          <path
            d="M360 120 H300 V64 H244"
            fill="none"
            stroke={flag(state, "poeCableSeated") ? (v.powerLed === "ok" ? C.ok : C.warn) : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={flag(state, "poeCableSeated") ? "0" : "4 3"}
          />
        </HotspotG>
      )}

      {/* Radio waves (behind the body) */}
      {radioUp && (
        <g opacity="0.55" aria-hidden>
          <path d="M150 96 Q130 130 150 164" fill="none" stroke={C.info} strokeWidth="2" />
          <path d="M136 84 Q108 130 136 176" fill="none" stroke={C.info} strokeWidth="1.5" opacity="0.7" />
          <path d="M162 104 Q148 130 162 156" fill="none" stroke={C.info} strokeWidth="1.5" opacity="0.85" />
        </g>
      )}

      {/* AP body */}
      {visible("access-point") && (
        <HotspotG id="access-point" label="Access point" selected={selected} onSelect={on}>
          <rect
            x="168"
            y="76"
            width="84"
            height="56"
            rx="14"
            fill={C.body}
            stroke={selStroke(sel("access-point"))}
            strokeWidth={selWidth(sel("access-point"))}
          />
          <rect x="200" y="66" width="20" height="12" rx="2" fill={C.plate} stroke={C.edge} />
          <text x="210" y="146" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            AP-FLOOR2
          </text>
        </HotspotG>
      )}

      {/* Radio face LEDs (hotspot) */}
      {visible("ap-radio") && (
        <HotspotG id="ap-radio" label="AP radio" selected={selected} onSelect={on}>
          <rect
            x="180"
            y="90"
            width="60"
            height="28"
            rx="6"
            fill={C.dark}
            stroke={selStroke(sel("ap-radio"))}
            strokeWidth={selWidth(sel("ap-radio"))}
          />
          <Led cx={194} cy={104} tone={v.powerLed} />
          <Led cx={210} cy={104} tone={v.radioLed} />
          <Led cx={226} cy={104} tone={v.clientLed} />
          <text x="210" y={124} textAnchor="middle" fill={C.muted} fontSize="5" fontFamily="monospace">
            PWR · WIFI · CLIENT
          </text>
        </HotspotG>
      )}

      {/* Wireless client on a desk */}
      <rect x="0" y="216" width="420" height="64" fill="#0b111d" />
      <line x1="0" y1="216" x2="420" y2="216" stroke={C.edge} strokeWidth="2" />
      <g aria-hidden>
        <rect x="48" y="176" width="72" height="44" rx="3" fill={C.body} stroke={C.edge} />
        <rect x="54" y="182" width="60" height="30" rx="1" fill={C.dark} stroke={C.edge} strokeWidth="0.8" />
        <rect x="42" y="220" width="84" height="6" rx="2" fill={C.plate} stroke={C.edge} />
        <text x="84" y="246" textAnchor="middle" fill={C.muted} fontSize="7" fontFamily="monospace">
          LAPTOP-3-14
        </text>
        <Led cx={112} cy={188} tone={assoc ? "ok" : "off"} r={2.5} />
        {assoc && (
          <path d="M130 176 Q150 150 172 132" fill="none" stroke={C.info} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.7" />
        )}
      </g>

      <text x="408" y="268" textAnchor="end" fill="#334155" fontSize="7" fontFamily="monospace">
        {v.powerLed !== "ok"
          ? "NO PoE POWER"
          : !radioUp
            ? "RADIO DOWN"
            : flag(state, "pathOk")
              ? "CLIENT PASSING"
              : "CLIENT NOT PASSING"}
      </text>
    </svg>
  );
}
