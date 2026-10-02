import { accessPointVisuals } from "../../families/accessPoint";
import {
  Cable,
  Interactive,
  Led,
  Rj45,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

/**
 * Ceiling-style AP puck on the bench: status face on top, the PoE drop
 * running through a table grommet toward the switch room.
 */
export function AccessPointStage({
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
  const v = accessPointVisuals(state);
  const dropSeated = state.poeCableSeated === true;
  const lampOf = (tone: string) =>
    tone === "ok"
      ? EC.ledOk
      : tone === "warn"
        ? EC.ledWarn
        : tone === "crit"
          ? EC.ledCrit
          : EC.ledOff;

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `ap-${v.powerLed}-${v.radioLed}-${v.upstreamLed}-${dropSeated}`;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* AP body */}
      {visible("access-point") && (
        <Interactive id="access-point">
          <mesh position={[0, 0.011, 0]}>
            <cylinderGeometry args={[0.085, 0.09, 0.022, 32]} />
            <meshStandardMaterial color={EC.body} roughness={0.5} metalness={0.2} />
          </mesh>
          <mesh position={[0, 0.0235, 0]}>
            <cylinderGeometry args={[0.078, 0.083, 0.006, 32]} />
            <meshStandardMaterial color={EC.bodyAlt} roughness={0.45} />
          </mesh>
          {/* power lamp on the status face */}
          <Led tone={v.powerLed} position={[-0.03, 0.028, 0.05]} size={0.005} />
        </Interactive>
      )}

      {/* Radio / client lamps */}
      {visible("ap-radio") && (
        <Interactive id="ap-radio">
          <Led tone={v.radioLed} position={[0, 0.028, 0.05]} size={0.005} />
          <Led tone={v.clientLed} position={[0.03, 0.028, 0.05]} size={0.005} />
        </Interactive>
      )}

      {/* PoE drop: pigtail, grommet, and the run to the serving switch */}
      {visible("ap-poe") && (
        <Interactive id="ap-poe">
          <Rj45
            position={[0, 0.02, -0.088]}
            rotation={[0, Math.PI, 0]}
            seated={dropSeated}
            lamp={lampOf(v.powerLed)}
          />
          {/* pigtail across the bench to the grommet */}
          <Cable
            from={[0, 0.02, -0.1]}
            to={[0, 0.003, -0.16]}
            seated={dropSeated}
            sag={0.004}
          />
          {/* grommet ring */}
          <mesh position={[0, 0.001, -0.16]} rotation={[-Math.PI / 2, 0, 0]}>
            <torusGeometry args={[0.018, 0.004, 8, 24]} />
            <meshStandardMaterial color={EC.dark} roughness={0.8} />
          </mesh>
          {/* drop from the grommet to the serving PoE switch (plugged at
              this end even when the AP-side pigtail is pulled) */}
          <Cable
            from={[0, 0.003, -0.16]}
            to={[0, 0.014, -0.288]}
            sag={0.008}
          />
          {/* serving switch — carries the drop's PoE, visible from the front */}
          <mesh position={[0, 0.014, -0.34]}>
            <boxGeometry args={[0.18, 0.028, 0.08]} />
            <meshStandardMaterial color={EC.body} roughness={0.6} metalness={0.35} />
          </mesh>
          <mesh position={[0, 0.014, -0.299]}>
            <boxGeometry args={[0.166, 0.02, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.6} />
          </mesh>
          <Rj45 position={[0, 0.014, -0.296]} lamp={lampOf(v.upstreamLed)} />
          <Led tone={v.upstreamLed} position={[-0.05, 0.024, -0.297]} size={0.004} />
        </Interactive>
      )}
    </StageFrame>
  );
}
