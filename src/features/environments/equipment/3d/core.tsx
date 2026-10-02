import { useContext, useEffect, useMemo, useRef, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { ContactShadows, Html, OrbitControls } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import type { CameraView } from "../types";
import type { EquipmentStageProps } from "./stageTypes";
import { SelectionMark } from "../../SelectionMark";
import { EC, InteractCtx, MotionCtx, ledColor, type StageInteract } from "./sceneCtx";

export type { EquipmentStageProps };

/** Small emissive indicator lamp. Anything but "ok/warn/crit" renders off. */
export function Led({
  tone,
  position,
  rotation,
  size = 0.0045,
}: {
  tone: string | undefined;
  position?: [number, number, number];
  rotation?: [number, number, number];
  size?: number;
}) {
  const on = tone === "ok" || tone === "warn" || tone === "crit";
  const color = ledColor(tone);
  return (
    <mesh position={position} rotation={rotation}>
      <sphereGeometry args={[size, 10, 10]} />
      <meshStandardMaterial
        color={color}
        emissive={on ? color : "#000000"}
        emissiveIntensity={on ? 1.5 : 0}
        roughness={0.35}
      />
    </mesh>
  );
}

/** Click/hover wrapper — mirrors the hardware bench `Interactive` pattern. */
export function Interactive({ id, children }: { id: string; children: ReactNode }) {
  const it = useContext(InteractCtx);
  return (
    <group
      name={id}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (e.delta < 6) it.onSelect(it.selected === id ? null : id);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        it.onHover(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
      }}
      onPointerMove={(e: ThreeEvent<PointerEvent>) => {
        it.onHover(id, e.nativeEvent.clientX, e.nativeEvent.clientY);
      }}
      onPointerOut={() => {
        if (it.hovered === id) it.onHover(null);
      }}
    >
      {children}
      {it.guideTargetId === id && (
        <Html center className="guide-anchor-3d-wrap" zIndexRange={[30, 0]}>
          <div
            className="guide-anchor-3d"
            data-testid="guide-anchor-3d"
            data-guide-anchor-3d={id}
          />
        </Html>
      )}
    </group>
  );
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
      <hemisphereLight args={["#9fb3cc", "#2f343c", 0.4]} />
      <ambientLight intensity={0.34} color="#d5dde6" />
      <directionalLight position={[0.7, 1.1, 0.6]} intensity={1.4} color="#fff4e6" />
      <directionalLight position={[-0.8, 0.7, -0.5]} intensity={0.5} color="#bcd2ff" />
      <directionalLight position={[0.1, 0.35, 1.2]} intensity={0.35} color="#e8eef7" />
    </>
  );
}

export function WorkSurface() {
  return (
    <group>
      <mesh position={[0.02, -0.01, 0]}>
        <boxGeometry args={[1.5, 0.02, 0.95]} />
        <meshStandardMaterial color={EC.table} roughness={0.95} />
      </mesh>
      <mesh position={[0.02, 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.44, 0.9]} />
        <meshStandardMaterial color={EC.tableTop} roughness={1} />
      </mesh>
    </group>
  );
}

/**
 * Strain-relieved cable run between two points. When `seated` is false the
 * plug end pulls back from the port so the gap reads as "unplugged".
 */
export function Cable({
  from,
  to,
  sag = 0.03,
  seated = true,
  radius = 0.0035,
  color = EC.cable,
}: {
  from: [number, number, number];
  to: [number, number, number];
  sag?: number;
  seated?: boolean;
  radius?: number;
  color?: string;
}) {
  const geo = useMemo(() => {
    const a = new THREE.Vector3(from[0], from[1], from[2]);
    const b = new THREE.Vector3(to[0], to[1], to[2]);
    if (!seated) {
      const dir = b.clone().sub(a);
      const len = dir.length();
      if (len > 1e-4) a.add(dir.normalize().multiplyScalar(Math.min(0.05, len * 0.4)));
    }
    const mid = a.clone().lerp(b, 0.5);
    mid.y -= sag;
    const curve = new THREE.QuadraticBezierCurve3(a, mid, b);
    return new THREE.TubeGeometry(curve, 20, radius, 6, false);
  }, [from, to, seated, sag, radius]);

  useEffect(() => () => geo.dispose(), [geo]);

  return (
    <mesh geometry={geo}>
      <meshStandardMaterial color={color} roughness={0.85} />
    </mesh>
  );
}

/** RJ-45 jack with an optional plug and a tiny link lamp. */
export function Rj45({
  position,
  rotation = [0, 0, 0],
  seated = true,
  lamp,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  seated?: boolean;
  lamp?: string;
}) {
  return (
    <group position={position} rotation={rotation}>
      <mesh>
        <boxGeometry args={[0.016, 0.013, 0.005]} />
        <meshStandardMaterial color={EC.port} roughness={0.9} />
      </mesh>
      {lamp && (
        <mesh position={[0.0115, 0.009, 0.003]}>
          <boxGeometry args={[0.004, 0.003, 0.002]} />
          <meshStandardMaterial
            color={lamp}
            emissive={lamp}
            emissiveIntensity={1.4}
            roughness={0.4}
          />
        </mesh>
      )}
      {seated && (
        <mesh position={[0, 0, 0.007]}>
          <boxGeometry args={[0.013, 0.011, 0.011]} />
          <meshStandardMaterial color={EC.plug} roughness={0.6} />
        </mesh>
      )}
    </group>
  );
}

function Controls({
  presets,
  preset,
  reduced,
  resetToken,
}: {
  presets: CameraView[];
  preset: string;
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
    if (!c || presets.length === 0) return;
    const p = presets.find((v) => v.id === preset) ?? presets[0];
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
  }, [preset, reduced, resetToken, presets, camera, invalidate]);

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
      minDistance={0.16}
      maxDistance={2.2}
      minPolarAngle={0.15}
      maxPolarAngle={1.6}
      panSpeed={0.6}
      rotateSpeed={0.7}
      zoomSpeed={0.8}
      target={[0, 0.05, 0]}
    />
  );
}

/**
 * Shared canvas scaffold: demand rendering, capability-free lighting, the
 * work surface, camera rig, contact shadows, and the interaction context.
 * Family stages only add world-derived device geometry.
 */
export function StageFrame({
  shell,
  shadowKey,
  children,
}: {
  shell: Omit<EquipmentStageProps, "state" | "visible">;
  shadowKey?: string;
  children: ReactNode;
}) {
  const { reduced, selected, hovered, onSelect, onHover, presets, preset, guideTarget } = shell;

  const interact = useMemo<StageInteract>(
    () => ({
      selected,
      hovered,
      onSelect,
      onHover,
      guideTargetId: guideTarget ?? null,
    }),
    [selected, hovered, onSelect, onHover, guideTarget],
  );

  const init = presets.find((p) => p.id === preset) ?? presets[0];

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
      camera={{
        fov: 40,
        near: 0.02,
        far: 14,
        position: init ? [init.pos[0], init.pos[1], init.pos[2]] : [0.55, 0.4, 0.7],
      }}
      onPointerMissed={() => onSelect(null)}
    >
      <MotionCtx.Provider value={reduced}>
        <InteractCtx.Provider value={interact}>
          <InvalidateOnRender />
          <Lights />
          <WorkSurface />
          {children}
          <Controls
            presets={presets}
            preset={preset}
            reduced={reduced}
            resetToken={shell.resetToken}
          />
          <SelectionMark
            id={selected}
            breathe={selected !== null && selected === guideTarget}
            reduced={reduced}
          />
          <ContactShadows
            key={shadowKey ?? "static"}
            position={[0, 0.001, 0]}
            scale={1.8}
            blur={2.4}
            opacity={0.5}
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
