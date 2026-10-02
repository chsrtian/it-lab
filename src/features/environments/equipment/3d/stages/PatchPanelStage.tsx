import { patchPanelVisuals } from "../../families/patchPanel";
import {
  Cable,
  Interactive,
  Led,
  Rj45,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

const PANEL_PORTS = 12;
const SWITCH_PORTS = 8;

const panelPortX = (i: number) => -0.15 + i * 0.026;
const switchPortX = (i: number) => 0.245 + i * 0.019;

/**
 * End-to-end copper path: wall jack → horizontal run → patch panel →
 * patch lead → edge switch. Labels live in the chrome; the 3D shows the
 * physical landing of each cable.
 */
export function PatchPanelStage({
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
  const v = patchPanelVisuals(state);
  const endpointSeated = state.endpointSeated === true;
  const horizontalSeated = state.horizontalSeated === true;
  const patchSeated = state.patchSeated === true;

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `patch-${v.activePanelIndex}-${v.activeRunIndex}-${v.activeSwitchIndex}-${endpointSeated}-${horizontalSeated}-${patchSeated}`;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* Wall stub with the user-facing keystone jack */}
      {visible("wall-jack") && (
        <Interactive id="wall-jack">
          <mesh position={[-0.505, 0.2, 0.1]}>
            <boxGeometry args={[0.05, 0.4, 0.5]} />
            <meshStandardMaterial color={EC.wall} roughness={0.95} />
          </mesh>
          <mesh position={[-0.477, 0.06, 0.12]}>
            <boxGeometry args={[0.006, 0.05, 0.06]} />
            <meshStandardMaterial color="#d7dde5" roughness={0.7} />
          </mesh>
          <Rj45
            position={[-0.472, 0.06, 0.12]}
            rotation={[0, Math.PI / 2, 0]}
            seated={endpointSeated}
            lamp={state.endpointPowered === true ? EC.ledOk : EC.ledOff}
          />
          {/* desk-side NIC plate */}
          <mesh position={[-0.4, 0.008, 0.12]}>
            <boxGeometry args={[0.05, 0.014, 0.04]} />
            <meshStandardMaterial color={EC.bodyAlt} roughness={0.7} />
          </mesh>
          <Cable
            from={[-0.465, 0.06, 0.12]}
            to={[-0.405, 0.014, 0.12]}
            seated={endpointSeated}
            sag={0.012}
          />
        </Interactive>
      )}

      {/* Horizontal run: hidden in the wall, lands on the traced panel port */}
      {visible("ethernet-cable") && (
        <Interactive id="ethernet-cable">
          <Cable
            from={[-0.478, 0.1, 0.04]}
            to={
              v.activeRunIndex !== null
                ? [panelPortX(v.activeRunIndex), 0.055, -0.025]
                : [0, 0.08, -0.025]
            }
            seated={horizontalSeated}
            sag={0.05}
            color={EC.cableJacket}
          />
        </Interactive>
      )}

      {/* Patch panel face */}
      {visible("patch-panel") && (
        <Interactive id="patch-panel">
          <mesh position={[0, 0.06, 0.035]}>
            <boxGeometry args={[0.36, 0.08, 0.11]} />
            <meshStandardMaterial color={EC.body} roughness={0.6} metalness={0.4} />
          </mesh>
          <mesh position={[0, 0.06, 0.091]}>
            <boxGeometry args={[0.34, 0.066, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.6} />
          </mesh>
          {Array.from({ length: PANEL_PORTS }, (_, i) => {
            const x = panelPortX(i);
            const active = i === v.activePanelIndex;
            return (
              <group key={i}>
                <mesh position={[x, 0.055, 0.093]}>
                  <boxGeometry args={[0.02, 0.016, 0.004]} />
                  <meshStandardMaterial color={EC.port} roughness={0.9} />
                </mesh>
                {/* physical landing of the horizontal run */}
                {active && patchSeated && (
                  <mesh position={[x, 0.055, 0.096]}>
                    <boxGeometry args={[0.014, 0.011, 0.006]} />
                    <meshStandardMaterial color={EC.plug} roughness={0.6} />
                  </mesh>
                )}
                {/* printed label strip — every keystone carries one; the
                    trace, not the print, decides where the run lands */}
                <mesh position={[x, 0.078, 0.093]}>
                  <boxGeometry args={[0.016, 0.005, 0.003]} />
                  <meshStandardMaterial color={EC.label} roughness={0.8} />
                </mesh>
                <Led
                  tone={v.panelMarks[i]}
                  position={[x, 0.043, 0.094]}
                  size={0.003}
                />
              </group>
            );
          })}
        </Interactive>
      )}

      {/* Patch lead crossing to the edge switch */}
      {visible("ethernet-cable") && (
        <Interactive id="ethernet-cable">
          <Cable
            from={[panelPortX(v.activePanelIndex), 0.055, 0.097]}
            to={[switchPortX(v.activeSwitchIndex), 0.035, 0.089]}
            seated={patchSeated}
            sag={0.02}
            color={EC.cableJacket}
          />
        </Interactive>
      )}

      {/* Edge switch the patch lead lands on */}
      {visible("switch-port") && (
        <Interactive id="switch-port">
          <mesh position={[0.32, 0.035, 0.02]}>
            <boxGeometry args={[0.2, 0.04, 0.12]} />
            <meshStandardMaterial color={EC.body} roughness={0.6} metalness={0.35} />
          </mesh>
          <mesh position={[0.32, 0.035, 0.081]}>
            <boxGeometry args={[0.186, 0.03, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.6} />
          </mesh>
          {Array.from({ length: SWITCH_PORTS }, (_, i) => {
            const x = switchPortX(i);
            const seated = patchSeated && i === v.activeSwitchIndex;
            return (
              <group key={i}>
                <mesh position={[x, 0.033, 0.083]}>
                  <boxGeometry args={[0.016, 0.014, 0.004]} />
                  <meshStandardMaterial color={EC.port} roughness={0.9} />
                </mesh>
                {seated && (
                  <mesh position={[x, 0.033, 0.086]}>
                    <boxGeometry args={[0.013, 0.011, 0.006]} />
                    <meshStandardMaterial color={EC.plug} roughness={0.6} />
                  </mesh>
                )}
                <Led tone={v.switchPortLeds[i]} position={[x, 0.05, 0.084]} size={0.003} />
              </group>
            );
          })}
        </Interactive>
      )}
    </StageFrame>
  );
}
