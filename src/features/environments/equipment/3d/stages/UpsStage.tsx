import { upsVisuals } from "../../families/ups";
import {
  Cable,
  Interactive,
  Led,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

const OUTLET_COLS = 4;
const OUTLET_ROWS = 2;
const LOAD_SEGMENTS = 6;

/** Line-interactive UPS: front status face, rear inlet/breaker/outlets. */
export function UpsStage({
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
  const v = upsVisuals(state);
  const inputSeated = state.inputPresent === true;
  const litSegments = Math.max(0, Math.min(LOAD_SEGMENTS, Math.ceil((v.loadPct / 100) * LOAD_SEGMENTS)));

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `ups-${v.inputLed}-${v.batteryLed}-${v.outputLed}-${litSegments}-${v.breakerLed}-${v.outletsLed}`;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* Chassis, screen, load bar */}
      {visible("ups") && (
        <Interactive id="ups">
          <mesh position={[0, 0.145, 0]}>
            <boxGeometry args={[0.18, 0.25, 0.34]} />
            <meshStandardMaterial color={EC.body} roughness={0.6} metalness={0.35} />
          </mesh>
          {/* status screen */}
          <mesh position={[-0.01, 0.21, 0.171]}>
            <boxGeometry args={[0.12, 0.05, 0.004]} />
            <meshStandardMaterial color={EC.screen} roughness={0.3} />
          </mesh>
          <mesh position={[-0.01, 0.21, 0.174]}>
            <planeGeometry args={[0.108, 0.04]} />
            <meshStandardMaterial
              color={v.outputLed === "ok" ? EC.screenGlow : EC.dark}
              emissive={v.outputLed === "ok" ? EC.screenGlow : "#000000"}
              emissiveIntensity={v.outputLed === "ok" ? 0.7 : 0}
              roughness={0.4}
            />
          </mesh>
          {/* load bar */}
          {Array.from({ length: LOAD_SEGMENTS }, (_, i) => (
            <mesh key={i} position={[-0.062 + i * 0.024, 0.12, 0.172]}>
              <boxGeometry args={[0.018, 0.01, 0.004]} />
              <meshStandardMaterial
                color={i < litSegments ? (v.loadLed === "ok" ? EC.ledOk : EC.ledCrit) : EC.ledOff}
                emissive={
                  i < litSegments
                    ? v.loadLed === "ok"
                      ? EC.ledOk
                      : EC.ledCrit
                    : "#000000"
                }
                emissiveIntensity={i < litSegments ? 1.1 : 0}
                roughness={0.5}
              />
            </mesh>
          ))}
          <Led tone={v.outputLed} position={[0.055, 0.16, 0.172]} size={0.005} />
        </Interactive>
      )}

      {/* Utility input: rear inlet, mains lead, breaker, input lamp */}
      {visible("ups-input") && (
        <Interactive id="ups-input">
          <mesh position={[-0.05, 0.2, -0.171]}>
            <boxGeometry args={[0.034, 0.034, 0.006]} />
            <meshStandardMaterial color={EC.port} roughness={0.8} />
          </mesh>
          <Cable
            from={[-0.05, 0.2, -0.176]}
            to={[-0.14, 0.012, -0.42]}
            seated={inputSeated}
            sag={0.03}
            color={EC.cableJacket}
          />
          {/* breaker button */}
          <mesh position={[0.03, 0.2, -0.173]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.011, 0.011, 0.01, 16]} />
            <meshStandardMaterial
              color={v.breakerLed === "crit" ? EC.ledCrit : EC.metal}
              emissive={v.breakerLed === "crit" ? EC.ledCrit : "#000000"}
              emissiveIntensity={v.breakerLed === "crit" ? 0.8 : 0}
              roughness={0.5}
            />
          </mesh>
          <Led tone={v.inputLed} position={[-0.075, 0.16, 0.172]} size={0.005} />
        </Interactive>
      )}

      {/* Outlet group on the rear */}
      {visible("ups-output") && (
        <Interactive id="ups-output">
          <mesh position={[0, 0.07, -0.171]}>
            <boxGeometry args={[0.15, 0.08, 0.005]} />
            <meshStandardMaterial color={EC.face} roughness={0.7} />
          </mesh>
          {Array.from({ length: OUTLET_ROWS * OUTLET_COLS }, (_, i) => {
            const col = i % OUTLET_COLS;
            const row = Math.floor(i / OUTLET_COLS);
            return (
              <group key={i}>
                <mesh position={[-0.052 + col * 0.035, 0.088 - row * 0.036, -0.174]}>
                  <boxGeometry args={[0.022, 0.024, 0.004]} />
                  <meshStandardMaterial color={EC.port} roughness={0.9} />
                </mesh>
                <mesh position={[-0.052 + col * 0.035, 0.088 - row * 0.036, -0.177]}>
                  <boxGeometry args={[0.012, 0.012, 0.002]} />
                  <meshStandardMaterial
                    color={
                      v.outletsLed === "ok"
                        ? EC.ledOk
                        : v.outletsLed === "crit"
                          ? EC.ledCrit
                          : EC.dark
                    }
                    emissive={
                      v.outletsLed === "ok"
                        ? EC.ledOk
                        : v.outletsLed === "crit"
                          ? EC.ledCrit
                          : "#000000"
                    }
                    emissiveIntensity={v.outletsLed === "off" ? 0 : 0.9}
                    roughness={0.6}
                  />
                </mesh>
              </group>
            );
          })}
        </Interactive>
      )}

      {/* Battery bay + lamp */}
      {visible("ups-battery") && (
        <Interactive id="ups-battery">
          <mesh position={[-0.01, 0.07, 0.171]}>
            <boxGeometry args={[0.13, 0.06, 0.005]} />
            <meshStandardMaterial color={EC.bodyAlt} roughness={0.65} />
          </mesh>
          <mesh position={[-0.01, 0.07, 0.175]}>
            <boxGeometry args={[0.05, 0.008, 0.004]} />
            <meshStandardMaterial color={EC.metal} roughness={0.4} metalness={0.6} />
          </mesh>
          <Led tone={v.batteryLed} position={[-0.04, 0.16, 0.172]} size={0.005} />
        </Interactive>
      )}
    </StageFrame>
  );
}
