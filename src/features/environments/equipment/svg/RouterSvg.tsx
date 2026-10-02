import { routerVisuals } from "../families/router";
import { flag, type SvgProps } from "../types";
import { HotspotG, Led } from "./shared";
import { C, selStroke, selWidth } from "./palette";

/** Edge router: WAN toward the modem, LAN toward the switch. LEDs are facts. */
export function RouterSvg({
  state,
  selected,
  onSelect,
  visible,
}: SvgProps) {
  const v = routerVisuals(state);
  const power = flag(state, "powerOk");
  const wanLinked = flag(state, "wanLink");
  const sel = (id: string) => selected === id;
  const on = (id: string | null) => onSelect(id);

  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Branch router with WAN and LAN cabling"
      data-testid="router-svg"
    >
      <rect x="0" y="0" width="420" height="280" fill={C.bg} />
      <rect x="4" y="4" width="412" height="272" rx="4" fill="none" stroke="#1a2332" />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        COMMS ROOM · IDF-2
      </text>

      {/* Shelf */}
      <rect x="0" y="216" width="420" height="64" fill="#0b111d" />
      <line x1="0" y1="216" x2="420" y2="216" stroke={C.edge} strokeWidth="2" />

      {/* WAN cable modem → router (hotspot) */}
      {visible("router-wan") && (
        <HotspotG id="router-wan" label="Router WAN" selected={selected} onSelect={on}>
          {/* ISP modem / NTD on the wall */}
          <rect x="24" y="64" width="58" height="34" rx="3" fill={C.plate} stroke={C.edge} />
          <text x="53" y="84" textAnchor="middle" fill={C.text} fontSize="7" fontFamily="monospace">
            MODEM
          </text>
          <Led
            cx={34}
            cy={72}
            tone={!flag(state, "wanChecked") ? "off" : flag(state, "upstreamOk") ? "ok" : "crit"}
            r={2.5}
          />
          <path
            d="M82 82 H130 V136 H158"
            fill="none"
            stroke={wanLinked ? C.ok : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={wanLinked ? "0" : "4 3"}
          />
          <rect x="154" y="130" width="12" height="12" rx="1" fill={C.dark} stroke={selStroke(sel("router-wan"))} strokeWidth={selWidth(sel("router-wan"))} />
          <text x="120" y="128" fill={C.muted} fontSize="6" fontFamily="monospace">
            WAN
          </text>
        </HotspotG>
      )}

      {/* Router chassis */}
      {visible("router") && (
        <HotspotG id="router" label="Router" selected={selected} onSelect={on}>
          <rect
            x="158"
            y="108"
            width="180"
            height="72"
            rx="4"
            fill={C.body}
            stroke={selStroke(sel("router"))}
            strokeWidth={selWidth(sel("router"))}
          />
          <text x="248" y="104" textAnchor="middle" fill={C.muted} fontSize="7" fontFamily="monospace">
            EDGE ROUTER · R1
          </text>
          {/* vent slots */}
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={`vent-${i}`} x1={166 + i * 8} y1={164} x2={166 + i * 8} y2={174} stroke={C.edge} strokeWidth="2" />
          ))}
          <text x="300" y="174" textAnchor="end" fill={C.muted} fontSize="6" fontFamily="monospace">
            {power ? "RUN" : "OFF"}
          </text>
        </HotspotG>
      )}

      {/* LED strip: PWR / LAN */}
      <g>
        <Led cx={176} cy={124} tone={v.powerLed} />
        <text x="184" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
          PWR
        </text>
        <Led cx={216} cy={124} tone={v.lanLed} />
        <text x="224" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
          LAN
        </text>
        <Led cx={256} cy={124} tone={v.internetLed} />
        <text x="264" y="127" fill={C.muted} fontSize="6" fontFamily="monospace">
          WAN
        </text>
      </g>

      {/* DHCP LED hotspot (derived effect LED) */}
      {visible("router-dhcp") && (
        <HotspotG id="router-dhcp" label="DHCP service" selected={selected} onSelect={on}>
          <rect
            x="296"
            y="116"
            width="34"
            height="18"
            rx="2"
            fill={C.dark}
            stroke={selStroke(sel("router-dhcp"))}
            strokeWidth={selWidth(sel("router-dhcp"))}
          />
          <Led cx={306} cy={125} tone={v.dhcpLed} r={3} />
          <text x="314" y="128" fill={C.text} fontSize="6" fontFamily="monospace">
            DHCP
          </text>
        </HotspotG>
      )}

      {/* NAT LED hotspot */}
      {visible("router-nat") && (
        <HotspotG id="router-nat" label="NAT service" selected={selected} onSelect={on}>
          <rect
            x="296"
            y="140"
            width="34"
            height="18"
            rx="2"
            fill={C.dark}
            stroke={selStroke(sel("router-nat"))}
            strokeWidth={selWidth(sel("router-nat"))}
          />
          <Led cx={306} cy={149} tone={v.natLed} r={3} />
          <text x="314" y="152" fill={C.text} fontSize="6" fontFamily="monospace">
            NAT
          </text>
        </HotspotG>
      )}

      {/* LAN ports + cable toward switch (hotspot) */}
      {visible("router-lan") && (
        <HotspotG id="router-lan" label="Router LAN" selected={selected} onSelect={on}>
          {[0, 1, 2, 3].map((i) => (
            <rect
              key={`lan-${i}`}
              x={172 + i * 26}
              y={140}
              width="18"
              height="14"
              rx="1"
              fill={C.dark}
              stroke={selStroke(sel("router-lan"))}
              strokeWidth={selWidth(sel("router-lan"))}
            />
          ))}
          <path
            d="M254 154 V196 H344"
            fill="none"
            stroke={flag(state, "lanLink") ? C.ok : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={flag(state, "lanLink") ? "0" : "4 3"}
          />
          <text x="352" y="199" fill={C.muted} fontSize="7" fontFamily="monospace">
            TO SWITCH
          </text>
        </HotspotG>
      )}

      <text x="12" y="268" fill="#334155" fontSize="7" fontFamily="monospace">
        {flag(state, "clientPath")
          ? "ROUTING TRAFFIC"
          : wanLinked
            ? "LINK UP · NO FULL PATH"
            : "NO WAN LINK"}
      </text>
    </svg>
  );
}
