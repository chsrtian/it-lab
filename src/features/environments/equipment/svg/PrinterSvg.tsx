import { printerVisuals } from "../families/printer";
import { flag, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

/**
 * Office multifunction printer on a desk. Effect LEDs reflect world facts;
 * the LCD shows the family status (gated config words never reach it early).
 */
export function PrinterSvg({
  state,
  statusLabel,
  selected,
  onSelect,
  visible,
}: SvgProps) {
  const v = printerVisuals(state);
  const jam = flag(state, "jamPresent");
  const jamKnown = jam && flag(state, "alarmChecked");
  const printReady = flag(state, "printReady");
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Office printer with network cable and status panel"
      data-testid="printer-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        COPY ROOM · 3F
      </text>

      {/* Wall + network plate */}
      <rect x="0" y="24" width="410" height="188" fill={C.wall} />
      <rect
        x="18"
        y="112"
        width="34"
        height="30"
        rx="2"
        fill={C.plate}
        stroke={C.edge}
        strokeWidth="1"
      />
      <text x="35" y="131" textAnchor="middle" fill={C.muted} fontSize="7" fontFamily="monospace">
        RJ45
      </text>

      {/* Desk */}
      <rect x="0" y="212" width="420" height="68" fill="#0b111d" />
      <line x1="0" y1="212" x2="420" y2="212" stroke={C.edge} strokeWidth="2" />

      {/* Network cable wall → printer NIC (hotspot on top of body edge) */}
      {visible("printer-network") && (
        <HotspotG
          id="printer-network"
          label="Printer network port"
          selected={selected}
          onSelect={on}
        >
          <path
            d="M52 127 H96 V150 H150"
            fill="none"
            stroke={flag(state, "netCableSeated") && flag(state, "netLink") ? C.ok : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={flag(state, "netCableSeated") ? "0" : "4 3"}
          />
          <rect x="146" y="144" width="12" height="12" rx="1" fill={C.dark} stroke={selStroke(sel("printer-network"))} strokeWidth={selWidth(sel("printer-network"))} />
          <text x="152" y="164" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            LAN
          </text>
          <Led cx={138} cy={140} tone={v.netLed} />
        </HotspotG>
      )}

      {/* Main body — scanner + output path */}
      {visible("printer") && (
        <HotspotG id="printer" label="Printer" selected={selected} onSelect={on}>
          {/* scanner lid */}
          <rect
            x="160"
            y="62"
            width="196"
            height="30"
            rx="3"
            fill={C.body}
            stroke={selStroke(sel("printer"))}
            strokeWidth={selWidth(sel("printer"))}
          />
          {v.lidOpen && (
            <>
              <path d="M164 62 L170 50 L352 50 L356 62" fill={C.dark} stroke={C.warn} strokeWidth="1.5" />
              <text x="258" y="46" textAnchor="middle" fill={C.warn} fontSize="7" fontFamily="monospace">
                COVER OPEN
              </text>
            </>
          )}
          {/* body */}
          <rect
            x="160"
            y="92"
            width="196"
            height="76"
            rx="3"
            fill={C.body}
            stroke={selStroke(sel("printer"))}
            strokeWidth={selWidth(sel("printer"))}
          />
          {/* control panel */}
          <rect
            x="268"
            y="98"
            width="82"
            height="30"
            rx="2"
            fill={C.dark}
            stroke={C.edge}
            data-guide-anchor="printer-panel"
          />
          <text
            x="309"
            y="117"
            textAnchor="middle"
            fill={statusLabel === "Ready" ? C.ok : C.text}
            fontSize="8"
            fontFamily="monospace"
          >
            {statusLabel}
          </text>
          <Led cx={276} cy={104} tone={v.powerLed} />
          <Led cx={286} cy={104} tone={v.readyLed} />
          <Led cx={296} cy={104} tone={v.paperLed} r={2.5} />
          <Led cx={304} cy={104} tone={v.tonerLed} r={2.5} />
          <Led cx={312} cy={104} tone={v.jamLed} r={2.5} />
          {/* output tray */}
          <rect x="172" y="136" width="88" height="26" rx="2" fill={C.dark} stroke={jamKnown ? C.crit : C.edge} />
          {printReady && <rect x="176" y="150" width="80" height="9" rx="1" fill="#1c2a3f" stroke={C.edge} strokeWidth="0.5" />}
          {jamKnown && (
            <text x="216" y="132" textAnchor="middle" fill={C.crit} fontSize="7" fontFamily="monospace">
              PAPER JAM
            </text>
          )}
          <text x="330" y="162" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            MFP-3140
          </text>
        </HotspotG>
      )}

      {/* Toner door */}
      {visible("printer-cartridge") && (
        <HotspotG
          id="printer-cartridge"
          label="Toner cartridge door"
          selected={selected}
          onSelect={on}
        >
          <rect
            x="168"
            y="172"
            width="180"
            height="16"
            rx="2"
            fill={C.plate}
            stroke={selStroke(sel("printer-cartridge"))}
            strokeWidth={selWidth(sel("printer-cartridge"))}
          />
          <line x1="176" y1="180" x2="340" y2="180" stroke={C.edge} strokeDasharray="2 3" />
          <text x="258" y="183" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
            TONER
          </text>
        </HotspotG>
      )}

      {/* Paper tray */}
      {visible("printer-paper") && (
        <HotspotG id="printer-paper" label="Paper tray" selected={selected} onSelect={on}>
          <rect
            x="168"
            y="190"
            width="180"
            height="24"
            rx="2"
            fill={C.plate}
            stroke={selStroke(sel("printer-paper"))}
            strokeWidth={selWidth(sel("printer-paper"))}
          />
          <rect x="176" y="197" width="164" height="6" fill={C.dark} />
          <rect
            x="176"
            y="197"
            width={Math.round(164 * Math.min(Math.max(v.paperLevel, 0), 1))}
            height="6"
            fill={v.paperLed === "ok" ? "#1d4ed8" : C.warn}
            opacity="0.8"
          />
          <text x="336" y="211" textAnchor="end" fill={C.muted} fontSize="6" fontFamily="monospace">
            TRAY 1
          </text>
        </HotspotG>
      )}

      <text x="12" y="268" fill="#334155" fontSize="7" fontFamily="monospace">
        {printReady ? "PRINT PATH IDLE" : "PRINT PATH NOT READY"}
      </text>
    </svg>
  );
}
