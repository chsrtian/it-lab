import { upsVisuals } from "../families/ups";
import { flag, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

const OUTLETS = 6;

/** Tower UPS: panel shows mode + load (observable), input cord status. */
export function UpsSvg({ state, statusLabel, selected, onSelect, visible }: SvgProps) {
  const v = upsVisuals(state);
  const load = Math.min(Math.max(v.loadPct, 0), 100);
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Tower UPS with input cord, battery drawer, and outlets"
      data-testid="ups-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        SERVER ROOM · UPS-A
      </text>

      {/* Floor */}
      <rect x="0" y="244" width="420" height="36" fill="#0b111d" />
      <line x1="0" y1="244" x2="420" y2="244" stroke={C.edge} strokeWidth="2" />

      {/* Wall outlet + input cord */}
      {visible("ups-input") && (
        <HotspotG id="ups-input" label="UPS mains input" selected={selected} onSelect={on}>
          <rect x="30" y="120" width="34" height="40" rx="3" fill={C.plate} stroke={C.edge} />
          <circle cx="47" cy="134" r="4" fill={C.dark} stroke={C.edge} />
          <circle cx="47" cy="148" r="4" fill={C.dark} stroke={C.edge} />
          <text x="47" y="172" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            MAINS
          </text>
          <path
            d="M64 140 H120 V210 H166"
            fill="none"
            stroke={flag(state, "inputPresent") ? C.ok : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={flag(state, "inputPresent") ? "0" : "4 3"}
          />
        </HotspotG>
      )}

      {/* UPS tower */}
      {visible("ups") && (
        <HotspotG id="ups" label="UPS" selected={selected} onSelect={on}>
          <rect
            x="170"
            y="52"
            width="120"
            height="192"
            rx="5"
            fill={C.body}
            stroke={selStroke(sel("ups"))}
            strokeWidth={selWidth(sel("ups"))}
          />
          {/* LCD */}
          <rect x="182" y="64" width="96" height="46" rx="3" fill="#08131f" stroke={C.edge} />
          <text
            x="230"
            y="84"
            textAnchor="middle"
            fill={v.mode === "online" ? C.ok : v.mode === "battery" ? C.warn : C.text}
            fontSize="11"
            fontFamily="monospace"
            fontWeight="600"
          >
            {statusLabel}
          </text>
          {/* load bar */}
          <rect x="190" y="92" width="80" height="8" rx="1" fill={C.dark} stroke={C.edge} strokeWidth="0.6" />
          <rect
            x="190"
            y="92"
            width={Math.round((load / 100) * 80)}
            height="8"
            rx="1"
            fill={v.loadLed === "ok" ? "#1d4ed8" : C.crit}
          />
          <text x="270" y="99" textAnchor="end" fill={C.text} fontSize="6" fontFamily="monospace">
            {Math.round(load)}%
          </text>
          {/* LED row */}
          <Led cx={194} cy={124} tone={v.inputLed} />
          <text x="202" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
            IN
          </text>
          <Led cx={226} cy={124} tone={v.batteryLed} />
          <text x="234" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
            BAT
          </text>
          <Led cx={266} cy={124} tone={v.outputLed} />
          <text x="274" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
            OUT
          </text>
          {/* breaker */}
          <rect
            x="182"
            y="136"
            width="30"
            height="14"
            rx="2"
            fill={C.dark}
            stroke={v.breakerLed === "crit" ? C.crit : v.breakerLed === "ok" ? C.ok : C.edge}
          />
          <text
            x="197"
            y="146"
            textAnchor="middle"
            fill={v.breakerLed === "crit" ? C.crit : v.breakerLed === "ok" ? C.ok : C.muted}
            fontSize="6"
            fontFamily="monospace"
          >
            {v.breakerLed === "crit" ? "TRIP" : v.breakerLed === "ok" ? "ON" : "—"}
          </text>
          <text x="278" y="146" textAnchor="end" fill={C.muted} fontSize="6" fontFamily="monospace">
            1500VA
          </text>
        </HotspotG>
      )}

      {/* Battery drawer */}
      {visible("ups-battery") && (
        <HotspotG id="ups-battery" label="UPS battery" selected={selected} onSelect={on}>
          <rect
            x="182"
            y="158"
            width="96"
            height="34"
            rx="3"
            fill={C.plate}
            stroke={selStroke(sel("ups-battery"))}
            strokeWidth={selWidth(sel("ups-battery"))}
          />
          <line x1="222" y1="166" x2="238" y2="166" stroke={C.edge} strokeWidth="2" />
          <text x="230" y="184" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            BATTERY CART
          </text>
        </HotspotG>
      )}

      {/* Outlet strip */}
      {visible("ups-output") && (
        <HotspotG id="ups-output" label="UPS outlets" selected={selected} onSelect={on}>
          <rect
            x="182"
            y="200"
            width="96"
            height="34"
            rx="3"
            fill={C.dark}
            stroke={selStroke(sel("ups-output"))}
            strokeWidth={selWidth(sel("ups-output"))}
          />
          {Array.from({ length: OUTLETS }).map((_, i) => (
            <rect
              key={`out-${i}`}
              x={188 + i * 15}
              y={208}
              width="11"
              height="18"
              rx="1"
              fill="#0a0f1a"
              stroke={v.outletsLed === "ok" ? C.ok : v.outletsLed === "crit" ? C.crit : C.edge}
              strokeWidth="1"
            />
          ))}
        </HotspotG>
      )}

      <text x="408" y="268" textAnchor="end" fill="#334155" fontSize="7" fontFamily="monospace">
        {v.outputLed !== "ok"
          ? "OUTPUT DEAD"
          : v.inputLed === "ok"
            ? "LOAD ON MAINS"
            : "LOAD ON BATTERY"}
      </text>
      <text x="12" y="268" fill="#334155" fontSize="7" fontFamily="monospace">
        {`load ${Math.round(load)}%`}
      </text>
    </svg>
  );
}
