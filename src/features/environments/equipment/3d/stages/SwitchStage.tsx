import { switchVisuals } from "../../families/switch";
import {
  Cable,
  Interactive,
  Led,
  Rj45,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

const PORT_COUNT = 8;

/** 1U access switch: port LEDs are facts; VLAN/PoE verdicts stay gated. */
export function SwitchStage({
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
  const v = switchVisuals(state);
  const uplinkSeated = state.uplinkCableSeated === true;
  const rawPorts = Array.isArray(state.ports)
    ? (state.ports as Array<Record<string, unknown>>)
    : [];

  const portX = (i: number) => 0.008 + i * 0.019;
  const chassis = (
    <mesh position={[0, 0.0375, 0]}>
      <boxGeometry args={[0.32, 0.045, 0.18]} />
      <meshStandardMaterial color={EC.body} roughness={0.6} metalness={0.4} />
    </mesh>
  );

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `switch-${v.powerLed}-${v.uplinkLed}-${uplinkSeated}-${v.portLeds.join("")}`;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* Chassis + status cluster */}
      {visible("switch") && (
        <Interactive id="switch">
          {chassis}
          <mesh position={[-0.128, 0.0375, 0.091]}>
            <boxGeometry args={[0.05, 0.03, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.5} />
          </mesh>
          <Led tone={v.powerLed} position={[-0.14, 0.048, 0.095]} size={0.004} />
          <Led tone={v.uplinkLed} position={[-0.14, 0.027, 0.095]} size={0.004} />
          {/* PoE budget lamp — only meaningful once the budget was checked */}
          {v.poeLed && (
            <Led tone={v.poeLed} position={[-0.115, 0.048, 0.095]} size={0.004} />
          )}
          {/* vent lines on the top shell */}
          {[0, 1, 2, 3].map((i) => (
            <mesh key={i} position={[-0.13 + i * 0.02, 0.061, 0]}>
              <boxGeometry args={[0.006, 0.002, 0.14]} />
              <meshStandardMaterial color={EC.dark} roughness={0.9} />
            </mesh>
          ))}
        </Interactive>
      )}

      {/* Trunk badge — VLAN membership only reads out after the trunk check */}
      {visible("switch-vlan") && (
        <Interactive id="switch-vlan">
          <mesh position={[-0.07, 0.0375, 0.091]}>
            <boxGeometry args={[0.05, 0.03, 0.004]} />
            <meshStandardMaterial color={EC.dark} roughness={0.6} />
          </mesh>
          {[0, 1, 2].map((i) => (
            <Led
              key={i}
              tone={v.trunkTone}
              position={[-0.084 + i * 0.014, 0.0375, 0.095]}
              size={0.0035}
            />
          ))}
        </Interactive>
      )}

      {/* Access port bank: one lamp pair per port, plugs follow the seed */}
      {visible("switch-port") && (
        <Interactive id="switch-port">
          {rawPorts.slice(0, PORT_COUNT).map((p, i) => {
            const seated = p.cableSeated === true;
            return (
              <group key={i}>
                <Rj45
                  position={[portX(i), 0.036, 0.092]}
                  seated={seated}
                  lamp={
                    v.portLeds[i] === "ok"
                      ? EC.ledOk
                      : v.portLeds[i] === "warn"
                        ? EC.ledWarn
                        : v.portLeds[i] === "crit"
                          ? EC.ledCrit
                          : undefined
                  }
                />
                <Led tone={v.portLeds[i]} position={[portX(i), 0.056, 0.093]} size={0.0035} />
              </group>
            );
          })}
        </Interactive>
      )}

      {/* Uplink port toward the router */}
      {visible("switch-uplink") && (
        <Interactive id="switch-uplink">
          <Rj45
            position={[0.1, 0.0375, -0.092]}
            rotation={[0, Math.PI, 0]}
            seated={uplinkSeated}
            lamp={
              v.uplinkLed === "ok"
                ? EC.ledOk
                : v.uplinkLed === "crit"
                  ? EC.ledCrit
                  : undefined
            }
          />
          <Cable
            from={[0.1, 0.0375, -0.104]}
            to={[0.18, 0.012, -0.42]}
            seated={uplinkSeated}
            sag={0.02}
          />
        </Interactive>
      )}
    </StageFrame>
  );
}
