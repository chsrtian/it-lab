import { routerVisuals } from "../../families/router";
import {
  Cable,
  Interactive,
  Led,
  Rj45,
  StageFrame,
  type EquipmentStageProps,
} from "../core";
import { EC } from "../sceneCtx";

/** Branch router: front status lamps, rear WAN/LAN ports, service LEDs. */
export function RouterStage({
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
  const v = routerVisuals(state);
  const wanSeated = state.wanCableSeated === true;
  const lanSeated = state.lanCableSeated === true;

  const shell = { reduced, selected, hovered, onSelect, onHover, presets, preset, resetToken, guideTarget };
  const shadowKey = `router-${v.powerLed}-${v.wanLed}-${v.lanLed}-${v.internetLed}-${v.dhcpLed}-${v.natLed}-${wanSeated}-${lanSeated}`;

  const frontLamp = (tone: string) =>
    tone === "ok" ? EC.ledOk : tone === "warn" ? EC.ledWarn : tone === "crit" ? EC.ledCrit : EC.ledOff;

  return (
    <StageFrame shell={shell} shadowKey={shadowKey}>
      {/* Chassis + path lamps (power / WAN link / internet / LAN) */}
      {visible("router") && (
        <Interactive id="router">
          <mesh position={[0, 0.04, 0]}>
            <boxGeometry args={[0.34, 0.05, 0.2]} />
            <meshStandardMaterial color={EC.body} roughness={0.65} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.04, 0.101]}>
            <boxGeometry args={[0.3, 0.034, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.5} />
          </mesh>
          <Led tone={v.powerLed} position={[-0.12, 0.045, 0.104]} />
          <Led tone={v.wanLed} position={[-0.08, 0.045, 0.104]} />
          <Led tone={v.internetLed} position={[-0.04, 0.045, 0.104]} />
          <Led tone={v.lanLed} position={[0, 0.045, 0.104]} />
          {/* mains lead */}
          <Rj45 position={[0.14, 0.04, -0.103]} rotation={[0, Math.PI, 0]} seated={false} />
          <Cable
            from={[0.14, 0.04, -0.115]}
            to={[0.26, 0.012, -0.42]}
            seated
            sag={0.03}
            color={EC.cableJacket}
          />
        </Interactive>
      )}

      {/* WAN port and its uplink */}
      {visible("router-wan") && (
        <Interactive id="router-wan">
          <Rj45
            position={[-0.1, 0.04, -0.103]}
            rotation={[0, Math.PI, 0]}
            seated={wanSeated}
            lamp={frontLamp(v.wanLed)}
          />
          <Cable
            from={[-0.1, 0.04, -0.115]}
            to={[-0.2, 0.012, -0.42]}
            seated={wanSeated}
            sag={0.02}
          />
        </Interactive>
      )}

      {/* LAN port bank and the LAN trunk */}
      {visible("router-lan") && (
        <Interactive id="router-lan">
          {[0.02, 0.06, 0.1].map((x, i) => (
            <Rj45
              key={x}
              position={[x, 0.04, -0.103]}
              rotation={[0, Math.PI, 0]}
              seated={i === 0 ? lanSeated : false}
              lamp={i === 0 && v.lanLed === "ok" ? EC.ledOk : undefined}
            />
          ))}
          <Cable
            from={[0.02, 0.04, -0.115]}
            to={[0.1, 0.012, -0.42]}
            seated={lanSeated}
            sag={0.02}
          />
        </Interactive>
      )}

      {/* DHCP service lamp */}
      {visible("router-dhcp") && (
        <Interactive id="router-dhcp">
          <mesh position={[0.05, 0.04, 0.104]}>
            <boxGeometry args={[0.04, 0.034, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.5} />
          </mesh>
          <Led tone={v.dhcpLed} position={[0.05, 0.045, 0.1085]} />
        </Interactive>
      )}

      {/* NAT service lamp */}
      {visible("router-nat") && (
        <Interactive id="router-nat">
          <mesh position={[0.1, 0.04, 0.104]}>
            <boxGeometry args={[0.04, 0.034, 0.004]} />
            <meshStandardMaterial color={EC.face} roughness={0.5} />
          </mesh>
          <Led tone={v.natLed} position={[0.1, 0.045, 0.1085]} />
        </Interactive>
      )}
    </StageFrame>
  );
}
