import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CompId } from "../benchHotspot";
import { presetById, type CameraPresetId } from "./presets";
import { scenePartVisibility } from "./partVisibility";
import { InteractCtx, MotionCtx, type SceneInteract } from "./sceneCtx";
import { SelectionMark } from "../SelectionMark";
import {
  BoardCables,
  CaseFans,
  Chassis,
  Cooler,
  Dimms,
  FrontPanel,
  FrontPanelCable,
  Gpu,
  MainsCable,
  Motherboard,
  MotherboardLeds,
  PowerStrip,
  Psu,
  Storage,
  StorageCables,
  WorkSurface,
} from "./parts";

export interface HardwareSceneProps {
  bench: Record<string, unknown>;
  visible: (id: string) => boolean;
  reduced: boolean;
  selected: CompId | null;
  hovered: CompId | null;
  onSelect: (id: CompId | null) => void;
  onHover: (id: CompId | null, x?: number, y?: number) => void;
  preset: CameraPresetId;
  resetToken: number;
  /** Guided-step target id while the guide is open (null otherwise). */
  guideTargetId?: string | null;
}

function InvalidateOnRender() {
  const invalidate = useThree((s) => s.invalidate);
  useEffect(() => {
    invalidate();
  });
  return null;
}

function Lights() {
  return (
    <>
      {/* Hemisphere separates up-facing surfaces (board, PSU top) from the
          room without raising the whole frame; key/fill/front model a bench
          lamp, a cool window and the viewer's own light. */}
      <hemisphereLight args={["#9fb3cc", "#2f343c", 0.4]} />
      <ambientLight intensity={0.34} color="#d5dde6" />
      <directionalLight position={[0.7, 1.1, 0.6]} intensity={1.45} color="#fff4e6" />
      <directionalLight position={[-0.8, 0.7, -0.5]} intensity={0.5} color="#bcd2ff" />
      <directionalLight position={[0.1, 0.35, 1.2]} intensity={0.35} color="#e8eef7" />
    </>
  );
}

function Controls({
  preset,
  reduced,
  resetToken,
}: {
  preset: CameraPresetId;
  reduced: boolean;
  resetToken: number;
}) {
  const camera = useThree((s) => s.camera);
  const invalidate = useThree((s) => s.invalidate);
  const controls = useRef<OrbitControlsImpl | null>(null);
  const anim = useRef<{
    t: number;
    fp: THREE.Vector3;
    tp: THREE.Vector3;
    ft: THREE.Vector3;
    tt: THREE.Vector3;
  } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    const c = controls.current;
    if (!c) return;
    const p = presetById(preset);
    const tp = new THREE.Vector3(p.pos[0], p.pos[1], p.pos[2]);
    const tt = new THREE.Vector3(p.target[0], p.target[1], p.target[2]);
    if (!started.current || reduced) {
      started.current = true;
      camera.position.copy(tp);
      c.target.copy(tt);
      c.update();
      invalidate();
      return;
    }
    anim.current = {
      t: 0,
      fp: camera.position.clone(),
      tp,
      ft: c.target.clone(),
      tt,
    };
    c.enabled = false;
    invalidate();
  }, [preset, reduced, resetToken, camera, invalidate]);

  useFrame((_, delta) => {
    const a = anim.current;
    const c = controls.current;
    if (!a || !c) return;
    a.t = Math.min(1, a.t + delta / 0.55);
    const t = a.t;
    const e = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    camera.position.lerpVectors(a.fp, a.tp, e);
    c.target.lerpVectors(a.ft, a.tt, e);
    c.update();
    invalidate();
    if (a.t >= 1) {
      anim.current = null;
      c.enabled = true;
    }
  });

  return (
    <OrbitControls
      ref={controls}
      makeDefault
      enableDamping
      dampingFactor={0.08}
      minDistance={0.3}
      maxDistance={2.4}
      minPolarAngle={0.15}
      maxPolarAngle={1.52}
      panSpeed={0.6}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      target={[0, 0.05, 0]}
    />
  );
}

export function HardwareScene(props: HardwareSceneProps) {
  const {
    bench,
    visible,
    reduced,
    selected,
    hovered,
    onSelect,
    onHover,
    preset,
    resetToken,
    guideTargetId,
  } = props;

  const interact = useMemo<SceneInteract>(
    () => ({ selected, hovered, onSelect, onHover, guideTargetId: guideTargetId ?? null }),
    [selected, hovered, onSelect, onHover, guideTargetId],
  );

  const parts = scenePartVisibility(visible);
  const boardVisible = parts.board;
  const psuVisible = parts.psu;
  const wallVisible = parts.wall;
  const fpVisible = parts.frontPanel;
  const storageVisible = parts.storage;

  const shadowKey = [
    boardVisible,
    psuVisible,
    wallVisible,
    fpVisible,
    parts.cooler,
    parts.dimms,
    parts.gpu,
    storageVisible,
    bench.ramSeated !== false,
    bench.gpuSeated !== false,
    bench.psuToggle !== false,
    bench.powerCableSeated === true,
  ].join("-");

  const initPos = presetById("full").pos;

  return (
    <Canvas
      frameloop="demand"
      dpr={[1, 2]}
      gl={{
        antialias: true,
        alpha: true,
        powerPreference: "high-performance",
        toneMapping: THREE.ACESFilmicToneMapping,
        toneMappingExposure: 1.16,
      }}
      camera={{ fov: 40, near: 0.02, far: 12, position: [initPos[0], initPos[1], initPos[2]] }}
      onPointerMissed={() => onSelect(null)}
    >
      <MotionCtx.Provider value={reduced}>
        <InteractCtx.Provider value={interact}>
          <InvalidateOnRender />
          <Lights />
          <WorkSurface />
          <Chassis />
          <Motherboard visible={boardVisible} />
          {boardVisible && (
            <MotherboardLeds ledsOn={bench.ledsOn === true} posted={bench.posted === true} />
          )}
          <Cooler
            visible={parts.cooler}
            fansSpin={
              bench.cpuFanSpinning === undefined
                ? bench.fansSpin === true
                : bench.cpuFanSpinning === true
            }
          />
          <Dimms
            visible={parts.dimms}
            ramSeated={bench.ramSeated !== false}
            faultySlot={typeof bench.dimmFaultySlot === "string" ? bench.dimmFaultySlot : undefined}
            faultRevealed={bench.memTestRun === true && bench.memTestPass === false}
            faultyOut={bench.faultyDimmOut === true}
          />
          <Gpu
            visible={parts.gpu}
            gpuSeated={bench.gpuSeated !== false}
            fansSpin={bench.fansSpin === true}
          />
          <Storage visible={storageVisible} detected={bench.driveDetected !== false} />
          <Psu
            visible={psuVisible}
            psuToggle={bench.psuToggle !== false}
            psuOutputOk={bench.psuOutputOk === true}
            powerSwitchAtWall={bench.powerSwitchAtWall === true}
          />
          <PowerStrip visible={wallVisible} powerSwitchAtWall={bench.powerSwitchAtWall === true} />
          <FrontPanel
            visible={fpVisible}
            ledsOn={bench.ledsOn === true}
            connectorOk={bench.frontPanelConnector === true}
          />
          <CaseFans visible fansSpin={bench.fansSpin === true} />
          <MainsCable
            visible={wallVisible && psuVisible}
            seated={bench.powerCableSeated === true}
          />
          {boardVisible && psuVisible && <BoardCables visible={bench.psuOutputOk === true} />}
          {fpVisible && boardVisible && (
            <FrontPanelCable visible connectorOk={bench.frontPanelConnector === true} />
          )}
          {storageVisible && <StorageCables visible dataSeated={bench.sataDataSeated !== false} />}
          <Controls preset={preset} reduced={reduced} resetToken={resetToken} />
          <SelectionMark
            id={selected}
            breathe={selected !== null && selected === guideTargetId}
            reduced={reduced}
          />
          <ContactShadows
            key={shadowKey}
            position={[0, 0.001, 0]}
            scale={1.8}
            blur={2.4}
            opacity={0.55}
            far={0.5}
            resolution={512}
            color="#05070b"
            frames={1}
          />
        </InteractCtx.Provider>
      </MotionCtx.Provider>
    </Canvas>
  );
}
