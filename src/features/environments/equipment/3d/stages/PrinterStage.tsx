import { printerVisuals } from "../../families/printer";
import {
  Cable,
  Interactive,
  Led,
  Rj45,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

/** A4 mono laser MFP: tray, output path, cartridge drawer, rear NIC. */
export function PrinterStage({
  state,
  visible,
  reduced,
  selected,
  hovered,
  onSelect,
  onHover,
  presets,
  preset,
  resetToken,
  guideTarget,
}: EquipmentStageProps) {
  const v = printerVisuals(state);
  const netSeated = state.netCableSeated === true;
  const paperSeated = state.paperOk === true;

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `printer-${v.lidOpen}-${v.paperLevel}-${v.jamLed}-${netSeated}`;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* Printer chassis, cover, and control panel */}
      {visible("printer") && (
        <Interactive id="printer">
          <mesh position={[0, 0.17, 0]}>
            <boxGeometry args={[0.44, 0.16, 0.4]} />
            <meshStandardMaterial color={EC.body} roughness={0.7} metalness={0.2} />
          </mesh>
          {/* top cover, hinged at the rear when the cover is open */}
          <group position={[0, 0.25, -0.18]} rotation={[v.lidOpen ? -0.24 : 0, 0, 0]}>
            <mesh position={[0, 0.015, 0.17]}>
              <boxGeometry args={[0.42, 0.03, 0.34]} />
              <meshStandardMaterial color={EC.bodyAlt} roughness={0.6} metalness={0.25} />
            </mesh>
          </group>
          {/* control panel */}
          <mesh position={[0.1, 0.283, 0.14]}>
            <boxGeometry args={[0.2, 0.01, 0.06]} />
            <meshStandardMaterial color={EC.face} roughness={0.5} />
          </mesh>
          <Led tone={v.powerLed} position={[0.02, 0.291, 0.14]} />
          <Led tone={v.readyLed} position={[0.07, 0.291, 0.14]} />
          <Led tone={v.netLed} position={[0.12, 0.291, 0.14]} />
          <mesh position={[0, 0.17, 0.201]}>
            <boxGeometry args={[0.3, 0.03, 0.004]} />
            <meshStandardMaterial color={EC.dark} roughness={0.9} />
          </mesh>
        </Interactive>
      )}

      {/* Paper path: feed tray, output sheets, jam/toner lamps */}
      {visible("printer-paper") && (
        <Interactive id="printer-paper">
          <group position={[0, paperSeated ? 0 : 0.012, paperSeated ? 0 : 0.03]}>
            <mesh position={[0, 0.05, 0.01]}>
              <boxGeometry args={[0.4, 0.07, 0.42]} />
              <meshStandardMaterial color={EC.bodyAlt} roughness={0.75} />
            </mesh>
            <mesh position={[0, 0.05, 0.222]}>
              <boxGeometry args={[0.36, 0.05, 0.01]} />
              <meshStandardMaterial color={EC.face} roughness={0.6} />
            </mesh>
            <mesh position={[0, 0.05, 0.229]}>
              <boxGeometry args={[0.12, 0.008, 0.006]} />
              <meshStandardMaterial color={EC.metal} roughness={0.4} metalness={0.6} />
            </mesh>
            {paperSeated && (
              <mesh position={[0, 0.087, 0.2]}>
                <boxGeometry args={[0.3, 0.004, 0.03]} />
                <meshStandardMaterial color={EC.paper} roughness={0.9} />
              </mesh>
            )}
          </group>
          {/* output sheets / jammed crumple */}
          {v.jamLed === "crit" ? (
            <mesh position={[0, 0.2, 0.16]} scale={[1, 0.6, 1]}>
              <sphereGeometry args={[0.03, 10, 8]} />
              <meshStandardMaterial color={EC.paper} roughness={1} flatShading />
            </mesh>
          ) : (
            <mesh position={[0, 0.205, 0.13]} rotation={[-0.12, 0, 0]}>
              <boxGeometry args={[0.26, 0.004, 0.14]} />
              <meshStandardMaterial color={EC.paper} roughness={0.95} />
            </mesh>
          )}
          <Led tone={v.paperLed} position={[0.17, 0.291, 0.14]} size={0.004} />
          <Led tone={v.jamLed} position={[0.19, 0.291, 0.14]} size={0.004} />
        </Interactive>
      )}

      {/* Cartridge drawer */}
      {visible("printer-cartridge") && (
        <Interactive id="printer-cartridge">
          <mesh position={[0.08, 0.13, 0.203]}>
            <boxGeometry args={[0.18, 0.07, 0.008]} />
            <meshStandardMaterial color={EC.bodyAlt} roughness={0.6} metalness={0.3} />
          </mesh>
          <mesh position={[0.08, 0.13, 0.209]}>
            <boxGeometry args={[0.08, 0.012, 0.006]} />
            <meshStandardMaterial color={EC.metal} roughness={0.35} metalness={0.7} />
          </mesh>
          <Led tone={v.tonerLed} position={[-0.005, 0.291, 0.14]} size={0.004} />
        </Interactive>
      )}

      {/* Rear NIC and its drop */}
      {visible("printer-network") && (
        <Interactive id="printer-network">
          <Rj45
            position={[0.14, 0.12, -0.203]}
            rotation={[0, Math.PI, 0]}
            seated={netSeated}
            lamp={v.netLed === "ok" ? EC.ledOk : v.netLed === "warn" ? EC.ledWarn : EC.ledOff}
          />
          <Cable
            from={[0.14, 0.12, -0.215]}
            to={[0.26, 0.012, -0.42]}
            seated={netSeated}
            sag={0.02}
          />
        </Interactive>
      )}
    </StageFrame>
  );
}
