import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { GuideFocus, Scenario } from "@/content/schema";
import type { RunState } from "@/engine";
import { LabSection, Chain, ChainStep, ChainArrow, InspectDock } from "@/features/env";
import { Zap, Cpu, MemoryStick, HardDrive, Monitor, CircuitBoard, X } from "lucide-react";
import {
  HOTSPOT_CHAIN,
  type CompId,
  buildBenchHotspot,
  hardwareFocusComponent,
} from "./benchHotspot";
import type { SetLabContextPanel } from "./contextPanel";

/**
 * Accessible name for a rendered hotspot: while the guide is open the active
 * target's hotspot is named exactly what the step calls it — one semantic
 * target across card, reticle and object.
 */
function hotspotAria(
  guide: { id: string; label: string } | null | undefined,
  id: string,
  fallback: string,
): string {
  return guide && guide.id === id ? guide.label : fallback;
}

export interface HardwareLabProps {
  scenario: Scenario;
  run: RunState;
  onInspect: (actionId: string) => void;
  onOpenKb?: (articleId: string) => void;
  /** Replace the SVG chassis with an alternate primary visual (3D stage). */
  stage?: ReactNode;
  /** Extra controls shown next to the stage title (view toggle). */
  stageActions?: ReactNode;
  /** Controlled selection (shared between 2D/3D stage and shared chrome). */
  selected?: CompId | null;
  onSelect?: (id: CompId | null) => void;
  onContextPanel?: SetLabContextPanel;
  /** Current guided-step target + completion action (only while the guide is open). */
  guideFocus?: GuideFocus | null;
  /** Camera preset currently applied by the view (observability for tests). */
  cameraPreset?: string;
}

interface GroupProps {
  bench: Record<string, unknown>;
  selected: CompId | null;
  onSelect: (id: CompId) => void;
  compVisible: (id: string) => boolean;
  C: {
    chassis: string;
    chassisBorder: string;
    mb: string;
    mbBorder: string;
    psu: string;
    accent: string;
    ok: string;
    crit: string;
    warn: string;
    muted: string;
    text: string;
  };
  ledColor?: string;
  fanColor?: string;
  powerRail?: string;
  /** Active guide target — its hotspot is named with the step's label. */
  guideLabel?: { id: string; label: string } | null;
}

function MotherboardGroup({
  bench,
  selected,
  onSelect,
  compVisible,
  C,
  ledColor,
  fanColor,
  powerRail,
  guideLabel,
}: GroupProps) {
  const ledsOn = bench.ledsOn === true;
  const fansSpin = bench.fansSpin === true;
  const posted = bench.posted === true;
  const ramSeated = bench.ramSeated !== false;
  const gpuSeated = bench.gpuSeated !== false;
  const cpuFanStopped = bench.cpuFanSpinning === false;
  const cpuFanSpin = bench.cpuFanSpinning === undefined ? fansSpin : bench.cpuFanSpinning === true;
  const faultySlot =
    bench.memTestRun === true &&
    bench.memTestPass === false &&
    typeof bench.dimmFaultySlot === "string"
      ? bench.dimmFaultySlot
      : undefined;
  const dimmOut = bench.faultyDimmOut === true;
  const sataDataOk = bench.sataDataSeated === undefined ? posted : bench.sataDataSeated === true;
  const slotNames = ["A1", "A2", "B1", "B2"];
  return (
    <g>
      {/* PCB plate — ATX proportions inside chassis */}
      <g
        className="hotspot"
        data-hotspot-id="motherboard"
        onClick={() => onSelect("motherboard")}
        role="button"
        tabIndex={0}
        aria-label={hotspotAria(guideLabel, "motherboard", "Motherboard")}
        onKeyDown={(e) => {
          if (e.key === "Enter") onSelect("motherboard");
        }}
      >
        <rect
          x="168"
          y="36"
          width="200"
          height="210"
          rx="2"
          fill={C.mb}
          stroke={selected === "motherboard" ? C.accent : C.mbBorder}
          strokeWidth={selected === "motherboard" ? 2 : 1.5}
        />
        {/* mounting standoffs */}
        {[
          [176, 44],
          [356, 44],
          [176, 232],
          [356, 232],
          [266, 44],
          [266, 232],
        ].map(([cx, cy]) => (
          <circle
            key={`st-${cx}-${cy}`}
            cx={cx}
            cy={cy}
            r="2.5"
            fill="#334155"
            stroke="#64748b"
            strokeWidth="0.5"
          />
        ))}
        {/* rear I/O shield edge (left) */}
        <rect
          x="168"
          y="48"
          width="8"
          height="70"
          rx="1"
          fill="#0f172a"
          stroke="#475569"
          strokeWidth="1"
        />
        <text
          x="176"
          y="88"
          fill={C.muted}
          fontSize="6"
          fontFamily="monospace"
          transform="rotate(-90 176 88)"
        >
          I/O
        </text>
        {/* chipset heatsink */}
        <rect x="300" y="175" width="36" height="28" rx="2" fill="#1e293b" stroke="#475569" />
        {[0, 1, 2, 3].map((i) => (
          <line
            key={`fin-${i}`}
            x1={304 + i * 8}
            y1="179"
            x2={304 + i * 8}
            y2="199"
            stroke="#64748b"
            strokeWidth="1"
          />
        ))}
        {/* status LEDs (corner) */}
        <circle cx={180} cy={48} r="3" fill={ledsOn ? (ledColor ?? C.accent) : "#334155"} />
        <circle cx={190} cy={48} r="3" fill={posted ? C.ok : "#334155"} />
        <circle cx={200} cy={48} r="3" fill={fansSpin ? (fanColor ?? C.ok) : "#334155"} />
        <text x="214" y="51" fill={C.muted} fontSize="6" fontFamily="monospace">
          DBG
        </text>
        {/* 24-pin ATX connector (right edge) */}
        <rect
          x="352"
          y="88"
          width="14"
          height="42"
          rx="1"
          fill="#0f172a"
          stroke={bench.psuOutputOk ? (powerRail ?? C.ok) : "#475569"}
          strokeWidth="1.5"
        />
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <rect key={`p24-${i}`} x="354" y={91 + i * 6} width="10" height="4" fill="#1e293b" />
        ))}
        {/* CPU EPS (top edge) */}
        <rect
          x="280"
          y="36"
          width="28"
          height="10"
          rx="1"
          fill="#0f172a"
          stroke={bench.ledsOn ? C.ok : "#475569"}
        />
        {/* front panel header (bottom-right) */}
        <rect x="330" y="218" width="28" height="14" rx="1" fill="#0f172a" stroke="#475569" />
        {[
          [334, 222],
          [340, 222],
          [346, 222],
          [352, 222],
          [334, 228],
          [340, 228],
          [346, 228],
          [352, 228],
        ].map(([px, py]) => (
          <rect
            key={`fp-${px}-${py}`}
            x={px}
            y={py}
            width="3"
            height="3"
            fill={bench.frontPanelConnector ? "#4ade80" : "#f87171"}
          />
        ))}
        {/* SATA ports */}
        {[0, 1, 2].map((i) => (
          <rect
            key={`sata-${i}`}
            x={300}
            y={210 + i * 8}
            width="20"
            height="5"
            rx="1"
            fill="#1e293b"
            stroke="#475569"
          />
        ))}
        {/* PCIe slots */}
        {[0, 1, 2].map((i) => (
          <rect
            key={`pcie-${i}`}
            x={190}
            y={168 + i * 18}
            width="100"
            height="10"
            rx="1"
            fill="#0f172a"
            stroke="#475569"
          />
        ))}
        <text
          x="300"
          y="60"
          textAnchor="middle"
          fill={C.text}
          fontSize="8"
          fontWeight="600"
          fontFamily="monospace"
        >
          ATX
        </text>
      </g>

      {/* CPU socket + tower cooler (physical silhouette) */}
      {compVisible("cpu-cooler") && (
        <g
          className="hotspot"
          data-hotspot-id="cpu-cooler"
          onClick={() => onSelect("cpu-cooler")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "cpu-cooler", "CPU cooler")}
          onKeyDown={(e) => e.key === "Enter" && onSelect("cpu-cooler")}
        >
          {/* socket base under cooler */}
          <rect x="210" y="70" width="56" height="56" rx="2" fill="#1a2332" stroke="#475569" />
          <rect x="216" y="76" width="44" height="44" rx="1" fill="#0f172a" stroke="#334155" />
          {/* latch arm */}
          <path d="M214 100 h-6 v10" fill="none" stroke="#94a3b8" strokeWidth="1.5" />
          {/* heatsink base + fins */}
          <rect
            x="214"
            y="74"
            width="48"
            height="48"
            rx="3"
            fill="#1e293b"
            stroke={selected === "cpu-cooler" ? C.accent : "#64748b"}
            strokeWidth={selected === "cpu-cooler" ? 2 : 1.5}
          />
          {Array.from({ length: 7 }).map((_, i) => (
            <line
              key={`hf-${i}`}
              x1={218 + i * 6}
              y1="78"
              x2={218 + i * 6}
              y2="118"
              stroke="#475569"
              strokeWidth="1.2"
            />
          ))}
          {/* fan hub + blades hint */}
          <circle
            cx="238"
            cy="98"
            r="16"
            fill="#0f172a"
            stroke={cpuFanStopped ? C.crit : cpuFanSpin ? (fanColor ?? C.ok) : "#334155"}
            strokeWidth="2"
          />
          <circle cx="238" cy="98" r="5" fill="#334155" />
          <path
            d="M238 84 Q248 92 238 98 Q228 92 238 84"
            fill={cpuFanStopped ? "#7f1d1d" : cpuFanSpin ? (fanColor ?? C.ok) : "#1e293b"}
            opacity="0.85"
          />
          <text
            x="238"
            y="128"
            textAnchor="middle"
            fill={C.muted}
            fontSize="6"
            fontFamily="monospace"
          >
            CPU
          </text>
          {cpuFanStopped && (
            <text
              x="238"
              y="136"
              textAnchor="middle"
              fill={C.crit}
              fontSize="6"
              fontFamily="monospace"
            >
              FAN STOPPED
            </text>
          )}
        </g>
      )}

      {/* DIMM bank — latched slots */}
      {compVisible("ram") && (
        <g
          className="hotspot"
          data-hotspot-id="ram"
          onClick={() => onSelect("ram")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "ram", "RAM DIMM slots")}
          onKeyDown={(e) => e.key === "Enter" && onSelect("ram")}
        >
          {[0, 1, 2, 3].map((i) => {
            const y = 72 + i * 22;
            const filled = ramSeated && (i === 0 || i === 2);
            const slotName = slotNames[i];
            const faulty = filled && faultySlot === slotName;
            const removed = i === 2 && dimmOut;
            return (
              <g key={`dimm-${i}`}>
                <rect
                  x="278"
                  y={y}
                  width="56"
                  height="16"
                  rx="1"
                  fill="#0f172a"
                  stroke={selected === "ram" ? C.accent : "#475569"}
                  strokeWidth={selected === "ram" ? 1.5 : 1}
                />
                {/* latches */}
                <rect x="276" y={y + 2} width="4" height="12" rx="1" fill="#64748b" />
                <rect x="332" y={y + 2} width="4" height="12" rx="1" fill="#64748b" />
                {filled && !removed && (
                  <rect
                    x="280"
                    y={y + 3}
                    width="52"
                    height="10"
                    rx="1"
                    fill={faulty ? "#7f1d1d" : "#14532d"}
                    stroke={faulty ? "#f87171" : "#22c55e"}
                    strokeWidth="0.8"
                  />
                )}
                <text
                  x="344"
                  y={y + 11}
                  fill={faulty ? C.crit : C.muted}
                  fontSize="5"
                  fontFamily="monospace"
                >
                  {slotName}
                </text>
              </g>
            );
          })}
          <text
            x="306"
            y="168"
            textAnchor="middle"
            fill={C.muted}
            fontSize="6"
            fontFamily="monospace"
          >
            DIMM A/B
          </text>
        </g>
      )}

      {/* GPU — card with bracket + dual fan circles */}
      {compVisible("gpu") && (
        <g
          className="hotspot"
          data-hotspot-id="gpu"
          onClick={() => onSelect("gpu")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "gpu", "Graphics card")}
          onKeyDown={(e) => e.key === "Enter" && onSelect("gpu")}
        >
          <rect
            x="188"
            y="186"
            width="104"
            height="36"
            rx="2"
            fill="#111827"
            stroke={selected === "gpu" ? C.accent : gpuSeated ? "#475569" : C.crit}
            strokeWidth={selected === "gpu" ? 2 : 1.5}
          />
          {/* PCIe bracket (left) */}
          <rect x="184" y="184" width="6" height="48" rx="1" fill="#64748b" stroke="#94a3b8" />
          <rect x="185" y="196" width="4" height="8" fill="#0f172a" />
          <rect x="185" y="210" width="4" height="8" fill="#0f172a" />
          {/* fans on GPU */}
          <circle
            cx="216"
            cy="204"
            r="10"
            fill="#0f172a"
            stroke={fansSpin ? C.ok : "#4b5563"}
            strokeWidth="1.5"
          />
          <circle
            cx="250"
            cy="204"
            r="10"
            fill="#0f172a"
            stroke={fansSpin ? C.ok : "#4b5563"}
            strokeWidth="1.5"
          />
          {/* power connector */}
          <rect x="276" y="190" width="12" height="8" rx="1" fill="#1e293b" stroke="#475569" />
          {!gpuSeated && (
            <text
              x="240"
              y="236"
              textAnchor="middle"
              fill={C.crit}
              fontSize="7"
              fontFamily="monospace"
            >
              UNSEATED
            </text>
          )}
        </g>
      )}

      {/* Storage — 2.5" SSD with SATA loom stub */}
      {compVisible("storage") && (
        <g
          className="hotspot"
          data-hotspot-id="storage"
          onClick={() => onSelect("storage")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "storage", "SATA storage")}
          onKeyDown={(e) => e.key === "Enter" && onSelect("storage")}
        >
          <rect
            x="300"
            y="130"
            width="48"
            height="28"
            rx="2"
            fill="#1e293b"
            stroke={selected === "storage" ? C.accent : "#475569"}
            strokeWidth={selected === "storage" ? 2 : 1}
          />
          <text
            x="324"
            y="147"
            textAnchor="middle"
            fill={C.text}
            fontSize="7"
            fontFamily="monospace"
          >
            SSD
          </text>
          <path
            d="M348 144 H360"
            fill="none"
            stroke={sataDataOk ? (posted ? C.ok : "#475569") : C.crit}
            strokeWidth="2"
            strokeDasharray="3 2"
          />
          {bench.driveDetected === false && (
            <text
              x="324"
              y="166"
              textAnchor="middle"
              fill={C.crit}
              fontSize="6"
              fontFamily="monospace"
            >
              NO DEVICE
            </text>
          )}
        </g>
      )}
    </g>
  );
}

function FrontPanelGroup({ bench, selected, onSelect, C, guideLabel }: GroupProps) {
  const seated = bench.frontPanelConnector === true;
  return (
    <g
      className="hotspot"
      data-hotspot-id="front-panel"
      onClick={() => onSelect("front-panel")}
      role="button"
      tabIndex={0}
      aria-label={hotspotAria(guideLabel, "front-panel", "Front panel power button")}
      onKeyDown={(e) => {
        if (e.key === "Enter") onSelect("front-panel");
      }}
    >
      {/* case front bezel button */}
      <rect
        x="368"
        y="236"
        width="36"
        height="28"
        rx="3"
        fill="#1e293b"
        stroke={selected === "front-panel" ? C.accent : seated ? C.ok : C.crit}
        strokeWidth={selected === "front-panel" ? 2 : 1.5}
      />
      <circle
        cx="386"
        cy="250"
        r="7"
        fill="#0f172a"
        stroke={seated ? C.ok : "#475569"}
        strokeWidth="1.5"
      />
      <circle cx="386" cy="250" r="3" fill={seated ? C.ok : C.crit} />
      <text x="386" y="270" textAnchor="middle" fill={C.muted} fontSize="6" fontFamily="monospace">
        PWR
      </text>
    </g>
  );
}

interface ChassisSvgProps {
  bench: Record<string, unknown>;
  selected: CompId | null;
  onSelect: (id: CompId) => void;
  compVisible: (id: string) => boolean;
  C: GroupProps["C"];
  ledColor: string;
  fanColor: string;
  powerRail: string;
  wallColor: string;
  guideLabel?: { id: string; label: string } | null;
}

function ChassisSvg({
  bench,
  selected,
  onSelect,
  compVisible,
  C,
  ledColor,
  fanColor,
  powerRail,
  wallColor,
  guideLabel,
}: ChassisSvgProps) {
  const setSelected = onSelect;
  return (
    <svg
      viewBox="0 0 420 280"
      className="hw-bench-svg"
      role="img"
      aria-label="Open PC chassis on workbench with power path"
      data-testid="chassis-svg"
    >
      {/* Workbench mat */}
      <rect x="0" y="0" width="420" height="280" fill="#070c16" />
      <rect
        x="4"
        y="4"
        width="412"
        height="272"
        rx="4"
        fill="none"
        stroke="#1a2332"
        strokeWidth="1"
      />
      <text x="12" y="18" fill="#334155" fontSize="7" fontFamily="monospace">
        WORKBENCH
      </text>

      {/* Chassis tray (open side — side panel removed) */}
      <rect
        x="8"
        y="24"
        width="404"
        height="248"
        rx="4"
        fill={C.chassis}
        stroke={C.chassisBorder}
        strokeWidth="2"
      />
      {/* interior floor */}
      <rect
        x="14"
        y="30"
        width="392"
        height="236"
        rx="2"
        fill="#0a101c"
        stroke="#1e293b"
        strokeDasharray="3 2"
      />
      {/* rear panel (left edge of tray) */}
      <rect x="14" y="30" width="14" height="236" fill="#111827" stroke="#334155" />
      {/* rear I/O cutouts + expansion slot covers */}
      <rect x="16" y="50" width="10" height="28" rx="1" fill="#0f172a" stroke="#475569" />
      <rect x="16" y="88" width="10" height="40" rx="1" fill="#0f172a" stroke="#475569" />
      <rect x="16" y="140" width="10" height="48" rx="1" fill="#0f172a" stroke="#475569" />
      <text
        x="21"
        y="200"
        fill="#475569"
        fontSize="6"
        fontFamily="monospace"
        transform="rotate(-90 21 200)"
      >
        REAR I/O + PCIe
      </text>

      {/* Case fans (front intake right side) */}
      {[0, 1].map((i) => {
        const cy = 70 + i * 70;
        return (
          <g key={`casefan-${i}`}>
            <rect
              x="390"
              y={cy - 18}
              width="16"
              height="36"
              rx="2"
              fill="#111827"
              stroke="#334155"
            />
            <circle
              cx="398"
              cy={cy}
              r="10"
              fill="#0f172a"
              stroke={bench.fansSpin ? (fanColor ?? C.ok) : "#334155"}
              strokeWidth="1.5"
            />
            <circle cx="398" cy={cy} r="3" fill="#334155" />
          </g>
        );
      })}

      {/* Wall / strip (outside chassis, top-left desk) */}
      {compVisible("wall") && (
        <g
          className="hotspot"
          data-hotspot-id="wall"
          onClick={() => setSelected("wall")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "wall", "Wall outlet and power strip")}
          onKeyDown={(e) => e.key === "Enter" && setSelected("wall")}
        >
          <rect
            x="20"
            y="248"
            width="56"
            height="22"
            rx="3"
            fill="#1e293b"
            stroke={selected === "wall" ? C.accent : wallColor}
            strokeWidth={selected === "wall" ? 2 : 1.5}
          />
          <text x="48" y="257" textAnchor="middle" fill={C.text} fontSize="7" fontWeight="600">
            STRIP
          </text>
          <text
            x="48"
            y="266"
            textAnchor="middle"
            fill={wallColor}
            fontSize="6"
            fontFamily="monospace"
          >
            {bench.powerSwitchAtWall ? "LIVE" : "OFF"}
          </text>
          <circle cx="70" cy="259" r="3" fill={wallColor} />
        </g>
      )}

      {/* AC cable wall → PSU rear */}
      {compVisible("wall") && (
        <>
          <path
            d="M76 255 H96 V170 H108"
            fill="none"
            stroke={bench.powerCableSeated && bench.powerSwitchAtWall ? powerRail : "#475569"}
            strokeWidth="3"
            strokeLinecap="round"
            strokeDasharray={bench.powerCableSeated ? "0" : "4 3"}
          />
          <text x="88" y="210" fill={C.muted} fontSize="6" fontFamily="monospace">
            AC
          </text>
        </>
      )}

      {/* PSU — box with fan grille + rocker switch */}
      {compVisible("power-supply") && (
        <g
          className="hotspot"
          data-hotspot-id="power-supply"
          onClick={() => setSelected("power-supply")}
          role="button"
          tabIndex={0}
          aria-label={hotspotAria(guideLabel, "power-supply", "Power supply unit")}
          onKeyDown={(e) => e.key === "Enter" && setSelected("power-supply")}
        >
          <rect
            x="108"
            y="148"
            width="64"
            height="52"
            rx="2"
            fill={C.psu}
            stroke={selected === "power-supply" ? C.accent : powerRail}
            strokeWidth={selected === "power-supply" ? 2 : 1.5}
          />
          {/* fan grille */}
          <circle cx="140" cy="168" r="14" fill="#0f172a" stroke="#475569" />
          <circle cx="140" cy="168" r="9" fill="none" stroke="#334155" />
          <circle cx="140" cy="168" r="4" fill="#334155" />
          {/* rocker I/O switch */}
          <rect
            x="114"
            y="186"
            width="18"
            height="10"
            rx="1"
            fill={bench.psuToggle === false ? "#7f1d1d" : "#14532d"}
            stroke={bench.psuToggle === false ? C.crit : C.ok}
          />
          <text
            x="123"
            y="194"
            textAnchor="middle"
            fill={bench.psuToggle === false ? "#fecaca" : "#bbf7d0"}
            fontSize="6"
            fontFamily="monospace"
          >
            {bench.psuToggle === false ? "O" : "I"}
          </text>
          <text
            x="155"
            y="194"
            textAnchor="middle"
            fill={bench.psuOutputOk ? C.ok : C.crit}
            fontSize="6"
            fontFamily="monospace"
          >
            {bench.psuOutputOk ? "STBY" : "—"}
          </text>
          <text
            x="140"
            y="146"
            textAnchor="middle"
            fill={C.muted}
            fontSize="7"
            fontFamily="monospace"
          >
            PSU
          </text>
        </g>
      )}

      {/* 24-pin cable PSU → MB */}
      <path
        d="M172 160 H200 V110 H168"
        fill="none"
        stroke={bench.psuOutputOk ? powerRail : "#475569"}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={bench.psuOutputOk ? "0" : "4 3"}
      />
      <rect
        x="196"
        y="104"
        width="12"
        height="14"
        rx="1"
        fill="#1e293b"
        stroke={bench.psuOutputOk ? C.ok : "#475569"}
      />
      <text x="186" y="152" fill={C.muted} fontSize="6" fontFamily="monospace">
        24-pin
      </text>

      {/* CPU EPS cable top route */}
      <path
        d="M172 150 H190 V50 H280"
        fill="none"
        stroke={bench.ledsOn ? powerRail : "#475569"}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray={bench.ledsOn ? "0" : "4 3"}
        opacity="0.85"
      />
      <text x="220" y="48" fill={C.muted} fontSize="6" fontFamily="monospace">
        EPS 8-pin
      </text>

      {/* Motherboard assembly */}
      {compVisible("motherboard") && (
        <MotherboardGroup
          bench={bench}
          selected={selected}
          onSelect={setSelected}
          compVisible={compVisible}
          C={C}
          ledColor={ledColor}
          fanColor={fanColor}
          powerRail={powerRail}
        />
      )}

      {/* Front-panel cable header → case button */}
      {compVisible("front-panel") && (
        <FrontPanelGroup
          bench={bench}
          selected={selected}
          onSelect={setSelected}
          compVisible={compVisible}
          C={C}
          guideLabel={guideLabel}
        />
      )}
      {compVisible("front-panel") && (
        <path
          d="M344 232 V236 H368"
          fill="none"
          stroke={bench.frontPanelConnector ? ledColor : "#475569"}
          strokeWidth="2"
          strokeDasharray={bench.frontPanelConnector ? "0" : "4 3"}
        />
      )}

      {/* POST badge */}
      <rect
        x="176"
        y="248"
        width="56"
        height="16"
        rx="2"
        fill={bench.posted ? "#052e16" : "#450a0a"}
        stroke={bench.posted ? C.ok : C.crit}
      />
      <text
        x="204"
        y="259"
        textAnchor="middle"
        fill={bench.posted ? "#bbf7d0" : "#fecaca"}
        fontSize="8"
        fontFamily="monospace"
        fontWeight="600"
      >
        {bench.posted ? "POST OK" : "NO POST"}
      </text>

      {Boolean(bench.beepCode) && (
        <text x="240" y="260" fill={C.warn} fontSize="7" fontFamily="monospace">
          beep: {String(bench.beepCode)}
        </text>
      )}
      {Boolean(bench.lastPowerEvent) && (
        <text x="300" y="260" fill={C.muted} fontSize="7" fontFamily="monospace">
          {String(bench.lastPowerEvent)}
        </text>
      )}
    </svg>
  );
}

/**
 * Virtual hardware workbench: interactive chassis SVG where the power chain
 * IS the visual environment. Component click → InspectDock; states from world.bench.
 */
export function HardwareLab({
  scenario,
  run,
  onInspect,
  onOpenKb,
  stage,
  stageActions,
  selected: selectedProp,
  onSelect: onSelectProp,
  onContextPanel,
  guideFocus,
  cameraPreset,
}: HardwareLabProps) {
  // Declarative per-scenario focus: the bench opens on its target part.
  const [internalSelected, setInternalSelected] = useState<CompId | null>(() =>
    hardwareFocusComponent(scenario.environment),
  );
  const selected = selectedProp !== undefined ? selectedProp : internalSelected;
  const setSelected = useCallback((id: CompId | null): void => {
    if (onSelectProp) onSelectProp(id);
    else setInternalSelected(id);
  }, [onSelectProp]);
  const activateComponent = useCallback((id: CompId | null): void => {
    if (id && guideFocus?.componentId === id && guideFocus.actionId) {
      const hotspot = buildBenchHotspot(scenario, run, id);
      const action = hotspot?.actions?.find((candidate) => candidate.id === guideFocus.actionId);
      if (action && !action.applied && !action.disabled) {
        onInspect(action.id);
        return;
      }
    }
    setSelected(id);
  }, [guideFocus, onInspect, run, scenario, setSelected]);

  const world = run.world;
  const bench = (world.bench ?? {}) as Record<string, unknown>;
  const components = scenario.environment.components as string[];

  const overallTone: "ok" | "warn" | "crit" = bench.posted
    ? "ok"
    : bench.ledsOn || bench.fansSpin
      ? "warn"
      : "crit";
  const overallLabel = bench.posted
    ? "POST OK"
    : bench.ledsOn || bench.fansSpin
      ? "Partial power"
      : "No power";

  /** Stages the learner has actually worked (their diagnostic action applied). */
  const verifiedStages = new Set(
    Object.values(HOTSPOT_CHAIN).filter((comp) => {
      const hotspot = buildBenchHotspot(scenario, run, comp);
      return hotspot?.relatedAction?.applied === true;
    }),
  );

  // Power path steps derived from world
  const chainSteps: {
    id: string;
    label: string;
    state: string;
    tone: "ok" | "warn" | "crit" | "unknown";
    verified: boolean;
    onClick?: () => void;
  }[] = [
    {
      id: "wall",
      label: "Wall",
      state: bench.powerSwitchAtWall ? "Live" : "Off",
      tone: bench.powerSwitchAtWall ? "ok" : "crit",
      verified: verifiedStages.has("wall"),
      onClick: () => activateComponent("wall"),
    },
    {
      id: "cable",
      label: "Cable",
      state: bench.powerCableSeated ? "Seated" : "Loose",
      tone: bench.powerCableSeated ? "ok" : "crit",
      verified: verifiedStages.has("power-supply"),
      onClick: () => activateComponent("power-supply"),
    },
    {
      id: "psu-sw",
      label: "PSU sw",
      state: bench.psuToggle === false ? "OFF" : "ON",
      tone: bench.psuToggle === false ? "crit" : "ok",
      verified: verifiedStages.has("power-supply"),
      onClick: () => activateComponent("power-supply"),
    },
    {
      id: "standby",
      label: "Standby",
      state: bench.psuOutputOk ? "Present" : "Absent",
      tone: bench.psuOutputOk ? "ok" : "crit",
      verified: verifiedStages.has("power-supply"),
      onClick: () => activateComponent("power-supply"),
    },
    {
      id: "mb",
      label: "Board",
      state: bench.ledsOn ? "LEDs on" : "No LEDs",
      tone: bench.ledsOn ? "ok" : "crit",
      verified: verifiedStages.has("motherboard"),
      onClick: () => activateComponent("motherboard"),
    },
    {
      id: "fp",
      label: "Front panel",
      state: bench.frontPanelConnector ? "Seated" : "Loose",
      tone: bench.frontPanelConnector ? "ok" : "crit",
      verified: verifiedStages.has("front-panel"),
      onClick: () => activateComponent("front-panel"),
    },
    {
      id: "post",
      label: "POST",
      state: bench.posted ? "OK" : "No POST",
      tone: bench.posted ? "ok" : "crit",
      verified: verifiedStages.has("motherboard"),
      onClick: () => activateComponent("motherboard"),
    },
  ];

  const selectedHotspot = useMemo(
    () => (selected ? buildBenchHotspot(scenario, run, selected) : null),
    [scenario, run, selected],
  );
  const inspectorPanel = useMemo(
    () =>
      selectedHotspot
        ? {
            id: `hardware:${selectedHotspot.id}`,
            title: "Component inspector",
            componentId: selectedHotspot.id,
            onClose: () => setSelected(null),
            body: (
              <InspectDock selected={selectedHotspot} onAction={onInspect} onOpenKb={onOpenKb}>
                <button
                  type="button"
                  className="btn-ghost w-full justify-center text-xs mt-1"
                  onClick={() => setSelected(null)}
                >
                  <X size={12} aria-hidden /> Close
                </button>
              </InspectDock>
            ),
          }
        : null,
    [onInspect, onOpenKb, selectedHotspot, setSelected],
  );
  const inspectorKey = selectedHotspot
    ? JSON.stringify({
        id: selectedHotspot.id,
        state: selectedHotspot.stateSummary,
        evidence: selectedHotspot.evidence?.map((e) => [e.label, e.value, e.tone]),
        actions: selectedHotspot.actions?.map((a) => [a.id, a.applied, a.disabled]),
      })
    : "none";
  const lastContextKey = useRef<string | null>(null);
  useEffect(() => {
    if (!onContextPanel) return;
    if (lastContextKey.current === inspectorKey) return;
    lastContextKey.current = inspectorKey;
    onContextPanel?.(inspectorPanel);
  }, [inspectorKey, inspectorPanel, onContextPanel]);
  useEffect(() => () => onContextPanel?.(null), [onContextPanel]);
  /** Guide target for accessible naming: card, reticle and object agree. */
  const guideLabel = guideFocus
    ? { id: guideFocus.componentId, label: guideFocus.label }
    : null;

  const compVisible = (id: string): boolean => components.length === 0 || components.includes(id);

  // Colors for SVG
  const C = {
    chassis: "#12151a",
    chassisBorder: "#3a4048",
    mb: "#171b22",
    mbBorder: "#4a515b",
    psu: "#1c2027",
    accent: "#e2560f",
    ok: "#22c55e",
    crit: "#f87171",
    warn: "#fbbf24",
    muted: "#8b929b",
    text: "#cbd0d6",
  };

  const powerRail = bench.psuOutputOk ? C.ok : C.crit;
  const ledColor = bench.ledsOn ? (bench.posted ? "#4ade80" : "#fbbf24") : "#3a4048";
  const fanColor = bench.fansSpin ? C.ok : "#3a4048";
  const wallColor = bench.powerSwitchAtWall ? C.ok : C.crit;

  return (
    <>
      {/* Signal path — workspace band above the environment (Phase 12F:
          case header → path → environment, never a card inside a card). */}
      <Chain label="Power path" className="env-path">
        {chainSteps.map((s, i) => {
          if (!compVisible(HOTSPOT_CHAIN[s.id])) return null;
          return (
            <span key={s.id} className="contents">
              <ChainStep
                id={s.id}
                label={s.label}
                state={s.state}
                tone={s.tone}
                verified={s.verified}
                active={selected !== null && HOTSPOT_CHAIN[s.id] === selected}
                onClick={s.onClick}
              />
              {i < chainSteps.length - 1 && (
                <ChainArrow
                  healthy={
                    chainSteps[i].tone === "ok" &&
                    (chainSteps[i + 1]?.tone === "ok" || chainSteps[i + 1]?.tone === "unknown")
                  }
                />
              )}
            </span>
          );
        })}
      </Chain>

      <LabSection
        aria-label="Hardware workbench"
        data-testid="hardware-lab"
        title={
          <span className="inline-flex items-center gap-1.5">
            <CircuitBoard size={14} aria-hidden className="text-lab-warn" />
            Hardware workbench
          </span>
        }
        status={{ tone: overallTone, label: overallLabel }}
        actions={
          <>
            {stageActions}
            <span className="hidden md:inline text-lab-muted">
              {scenario.environment.availableTools.join(" · ") || "bench"}
            </span>
          </>
        }
      >
        <div
          className="hw-body"
          data-guide-focus={guideFocus?.componentId ?? ""}
          data-camera-preset={cameraPreset ?? ""}
        >
          {/* Stage — the dominant surface (3D when available, SVG fallback) */}
          <div className="hw-stage-wrap">
            {stage ?? (
              <div className="hw-svg-wrap">
                <ChassisSvg
                  bench={bench}
                  selected={selected}
                  onSelect={activateComponent}
                  compVisible={compVisible}
                  C={C}
                  ledColor={ledColor}
                  fanColor={fanColor}
                  powerRail={powerRail}
                  wallColor={wallColor}
                  guideLabel={guideLabel}
                />
              </div>
            )}
            {selectedHotspot && !onContextPanel ? (
              <aside
                className="hw-inspector"
                aria-label="Component inspector"
                data-testid="hw-inspector"
                data-inspector-component={selected ?? ""}
              >
                <InspectDock selected={selectedHotspot} onAction={onInspect} onOpenKb={onOpenKb}>
                  <button
                    type="button"
                    className="btn-ghost w-full justify-center text-xs mt-1"
                    onClick={() => setSelected(null)}
                  >
                    <X size={12} aria-hidden /> Close
                  </button>
                </InspectDock>
              </aside>
            ) : !selectedHotspot ? (
              <div className="hw-legend" role="group" aria-label="Component quick select">
                {(
                  [
                    ["power-supply", <Zap key="z" size={11} aria-hidden />],
                    ["motherboard", <CircuitBoard key="m" size={11} aria-hidden />],
                    ["cpu-cooler", <Cpu key="c" size={11} aria-hidden />],
                    ["ram", <MemoryStick key="r" size={11} aria-hidden />],
                    ["gpu", <Monitor key="g" size={11} aria-hidden />],
                    ["storage", <HardDrive key="s" size={11} aria-hidden />],
                    ["front-panel", <Zap key="f" size={11} aria-hidden />],
                  ] as const
                ).map(([id, icon]) => {
                  if (!compVisible(id)) return null;
                  return (
                    <button
                      key={id}
                      type="button"
                      className="chip bg-lab-panel/90 text-lab-muted hover:text-lab-text"
                      onClick={() => activateComponent(id as CompId)}
                      aria-pressed={selected === id}
                    >
                      {icon}
                      {id.replace(/-/g, " ")}
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      </LabSection>
    </>
  );
}
