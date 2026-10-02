import { useContext, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { useFrame, useThree, type ThreeEvent } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { CompId } from "../benchHotspot";
import { AC, C, InteractCtx, MotionCtx, useHot } from "./sceneCtx";

function Interactive({ id, children }: { id: CompId; children: ReactNode }) {
  const it = useContext(InteractCtx);
  const groupRef = useRef<THREE.Group>(null);
  const [markerPos, setMarkerPos] = useState<[number, number, number] | null>(null);
  const guided = it.guideTargetId === id;

  // The marker sits on the object's GEOMETRY, never on the group origin:
  // these groups are unpositioned wrappers (the child meshes carry the
  // offsets), so the anchor is projected from the bounding-box center of
  // the part. Recomputes whenever this group becomes the guide target (the
  // setter is equality-guarded, so unrelated commits cannot loop).
  useLayoutEffect(() => {
    if (!guided) return;
    const group = groupRef.current;
    if (!group) return;
    group.updateWorldMatrix(true, false);
    const box = new THREE.Box3().setFromObject(group);
    if (box.isEmpty()) return;
    const center = box.getCenter(new THREE.Vector3());
    group.worldToLocal(center);
    const next: [number, number, number] = [center.x, center.y, center.z];
    setMarkerPos((prev) =>
      prev && prev[0] === next[0] && prev[1] === next[1] && prev[2] === next[2] ? prev : next,
    );
  }, [guided]);

  return (
    <group
      ref={groupRef}
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
      {guided && markerPos && (
        <Html position={markerPos} center className="guide-anchor-3d-wrap" zIndexRange={[30, 0]}>
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

function useEase(target: number, update: (v: number) => void, speed = 8): void {
  const reduced = useContext(MotionCtx);
  const updateRef = useRef(update);
  const cur = useRef(target);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    updateRef.current = update;
  });

  useEffect(() => {
    updateRef.current(cur.current);
  }, []);

  useEffect(() => {
    if (reduced) {
      cur.current = target;
      updateRef.current(target);
    }
  }, [target, reduced]);

  useFrame((_, delta) => {
    if (reduced) return;
    const d = target - cur.current;
    if (Math.abs(d) < 1e-4) return;
    cur.current += d * Math.min(1, delta * speed);
    updateRef.current(cur.current);
    invalidate();
  });
}

function Fan({
  radius,
  thickness,
  blades = 6,
  color,
  spin,
  speed = 6,
}: {
  radius: number;
  thickness: number;
  blades?: number;
  color: string;
  spin: boolean;
  speed?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const reduced = useContext(MotionCtx);
  const invalidate = useThree((s) => s.invalidate);
  useFrame((_, delta) => {
    if (!spin || reduced || !ref.current) return;
    ref.current.rotation.z -= speed * delta;
    invalidate();
  });
  const bladeLen = radius * 0.86;
  return (
    <group ref={ref}>
      <mesh>
        <cylinderGeometry args={[radius * 0.3, radius * 0.3, thickness * 1.1, 16]} />
        <meshStandardMaterial color={C.trim} roughness={0.6} />
      </mesh>
      {Array.from({ length: blades }, (_, i) => {
        const a = (i / blades) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0]}
            rotation={[0, 0, a + 0.5]}
          >
            <boxGeometry args={[bladeLen * 0.7, radius * 0.42, thickness * 0.5]} />
            <meshStandardMaterial color={color} roughness={0.7} />
          </mesh>
        );
      })}
    </group>
  );
}

export function WorkSurface() {
  return (
    <group>
      <mesh position={[0.05, -0.01, 0]}>
        <boxGeometry args={[1.5, 0.02, 0.95]} />
        <meshStandardMaterial color={C.mat} roughness={0.95} />
      </mesh>
      <mesh position={[0.05, 0.0002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[1.44, 0.9]} />
        <meshStandardMaterial color="#26314a" roughness={1} />
      </mesh>
    </group>
  );
}

export function Chassis() {
  return (
    <group>
      <mesh position={[0.02, 0.008, 0]}>
        <boxGeometry args={[0.66, 0.016, 0.52]} />
        <meshStandardMaterial color={C.tray} roughness={0.55} metalness={0.5} />
      </mesh>
      {([-0.2225, 0.0825] as const).flatMap((x) =>
        ([-0.115, 0.115] as const).map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.019, z]}>
            <cylinderGeometry args={[0.004, 0.004, 0.012, 10]} />
            <meshStandardMaterial color={C.alu} metalness={0.7} roughness={0.35} />
          </mesh>
        )),
      )}
      <mesh position={[0.02, 0.101, -0.2625]}>
        <boxGeometry args={[0.66, 0.17, 0.005]} />
        <meshStandardMaterial color={C.wall} roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh position={[0.02, 0.101, 0.2625]}>
        <boxGeometry args={[0.66, 0.17, 0.005]} />
        <meshStandardMaterial color={C.wall} roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh position={[-0.3125, 0.101, 0]}>
        <boxGeometry args={[0.005, 0.17, 0.52]} />
        <meshStandardMaterial color={C.wall} roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh position={[0.3525, 0.101, 0]}>
        <boxGeometry args={[0.005, 0.17, 0.52]} />
        <meshStandardMaterial color={C.wall} roughness={0.5} metalness={0.45} />
      </mesh>
      <mesh position={[0.55, 0.004, 0.05]}>
        <boxGeometry args={[0.5, 0.007, 0.44]} />
        <meshStandardMaterial color={C.trim} roughness={0.4} metalness={0.5} />
      </mesh>
      <mesh position={[0.02, 0.188, -0.2625]}>
        <boxGeometry args={[0.66, 0.006, 0.012]} />
        <meshStandardMaterial color={C.trim} roughness={0.5} metalness={0.5} />
      </mesh>
      {[-0.28, -0.06, 0.16, 0.32].map((x) => (
        <mesh key={x} position={[x, 0.03, -0.258]}>
          <boxGeometry args={[0.008, 0.02, 0.012]} />
          <meshStandardMaterial color={C.trayDark} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[-0.13, 0.11, -0.266]}>
        <boxGeometry args={[0.13, 0.05, 0.004]} />
        <meshStandardMaterial color={C.io} metalness={0.6} roughness={0.4} />
      </mesh>
      {[
        [-0.16, 0.118, 0.024, 0.03],
        [-0.125, 0.118, 0.024, 0.03],
        [-0.09, 0.114, 0.02, 0.022],
      ].map(([x, y, w, h]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -0.2685]}>
          <boxGeometry args={[w, h, 0.003]} />
          <meshStandardMaterial color="#1c232e" roughness={0.7} />
        </mesh>
      ))}
      {[-0.155, -0.13, -0.105].map((x) => (
        <mesh key={x} position={[x, 0.09, -0.2685]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.005, 0.005, 0.003, 12]} />
          <meshStandardMaterial color="#1c232e" roughness={0.7} />
        </mesh>
      ))}
      {[0.035, 0.052, 0.069, 0.086].map((y) => (
        <mesh key={y} position={[-0.13, y, -0.2665]}>
          <boxGeometry args={[0.14, 0.014, 0.004]} />
          <meshStandardMaterial color={C.silver} metalness={0.6} roughness={0.45} />
        </mesh>
      ))}
      <mesh position={[0.02, 0.184, 0.2625]}>
        <boxGeometry args={[0.66, 0.006, 0.01]} />
        <meshStandardMaterial color={C.trim} roughness={0.5} metalness={0.5} />
      </mesh>
    </group>
  );
}

export function Motherboard({ visible }: { visible: boolean }) {
  const hot = useHot("motherboard");
  if (!visible) return null;
  const em = hot ? AC : "#000000";
  const ei = hot ? 0.3 : 0;
  return (
    <Interactive id="motherboard">
      <mesh position={[-0.07, 0.024, 0]}>
        <boxGeometry args={[0.305, 0.004, 0.244]} />
        <meshStandardMaterial color={C.pcb} roughness={0.55} emissive={em} emissiveIntensity={ei} />
      </mesh>
      <mesh position={[-0.07, 0.0263, 0]}>
        <boxGeometry args={[0.3, 0.0006, 0.236]} />
        <meshStandardMaterial color="#232c3d" roughness={0.7} />
      </mesh>
      <mesh position={[-0.125, 0.041, -0.108]}>
        <boxGeometry args={[0.14, 0.03, 0.024]} />
        <meshStandardMaterial color={C.io} metalness={0.55} roughness={0.4} />
      </mesh>
      {[
        [-0.165, 0.044, 0.02, 0.022],
        [-0.14, 0.044, 0.02, 0.022],
        [-0.115, 0.041, 0.018, 0.016],
      ].map(([x, y, w, h]) => (
        <mesh key={`${x}-${y}`} position={[x, y, -0.0965]}>
          <boxGeometry args={[w, h, 0.004]} />
          <meshStandardMaterial color="#12171e" roughness={0.65} />
        </mesh>
      ))}
      <mesh position={[-0.09, 0.033, -0.097]}>
        <boxGeometry args={[0.1, 0.014, 0.028]} />
        <meshStandardMaterial color={C.silver} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-0.158, 0.033, -0.062]}>
        <boxGeometry args={[0.026, 0.014, 0.05]} />
        <meshStandardMaterial color={C.silver} metalness={0.6} roughness={0.35} />
      </mesh>
      <mesh position={[-0.07, 0.028, -0.045]}>
        <boxGeometry args={[0.05, 0.005, 0.05]} />
        <meshStandardMaterial color={C.alu} metalness={0.7} roughness={0.3} />
      </mesh>
      <mesh position={[-0.043, 0.0305, -0.045]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0025, 0.0025, 0.044, 8]} />
        <meshStandardMaterial color={C.silver} metalness={0.8} roughness={0.3} />
      </mesh>
      {[0.055, 0.085].map((z) => (
        <mesh key={z} position={[-0.06, 0.0305, z]}>
          <boxGeometry args={[0.1, 0.009, 0.008]} />
          <meshStandardMaterial color={C.slot} roughness={0.6} />
        </mesh>
      ))}
      <mesh position={[0.006, 0.0335, 0.085]}>
        <boxGeometry args={[0.014, 0.006, 0.012]} />
        <meshStandardMaterial color={C.latch} roughness={0.5} />
      </mesh>
      <mesh position={[-0.14, 0.0305, 0.02]}>
        <boxGeometry args={[0.03, 0.007, 0.007]} />
        <meshStandardMaterial color={C.slot} roughness={0.6} />
      </mesh>
      <mesh position={[-0.06, 0.0305, 0.02]}>
        <boxGeometry args={[0.03, 0.007, 0.007]} />
        <meshStandardMaterial color={C.slot} roughness={0.6} />
      </mesh>
      {[-0.032, -0.021, -0.01, 0.001].map((x) => (
        <mesh key={x} position={[x, 0.0335, -0.045]}>
          <boxGeometry args={[0.005, 0.015, 0.11]} />
          <meshStandardMaterial color={C.slot} roughness={0.6} />
        </mesh>
      ))}
      {[-0.032, -0.021, -0.01, 0.001].map((x) =>
        [-0.101, 0.011].map((z) => (
          <mesh key={`${x}-${z}`} position={[x, 0.036, z]}>
            <boxGeometry args={[0.006, 0.012, 0.006]} />
            <meshStandardMaterial color={C.latch} roughness={0.5} />
          </mesh>
        )),
      )}
      <mesh position={[0.02, 0.031, 0.09]}>
        <boxGeometry args={[0.05, 0.01, 0.05]} />
        <meshStandardMaterial color={C.silver} metalness={0.6} roughness={0.4} />
      </mesh>
      <mesh position={[0.05, 0.028, 0.1]}>
        <cylinderGeometry args={[0.011, 0.011, 0.004, 20]} />
        <meshStandardMaterial color="#c8ccd2" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0.072, 0.033, -0.005]}>
        <boxGeometry args={[0.016, 0.014, 0.09]} />
        <meshStandardMaterial color={C.slot} roughness={0.6} />
      </mesh>
      <mesh position={[-0.17, 0.033, -0.105]}>
        <boxGeometry args={[0.03, 0.014, 0.022]} />
        <meshStandardMaterial color={C.slot} roughness={0.6} />
      </mesh>
      <mesh position={[0.07, 0.031, 0.075]}>
        <boxGeometry args={[0.02, 0.011, 0.032]} />
        <meshStandardMaterial color="#1f2937" roughness={0.6} />
      </mesh>
      <mesh position={[-0.047, 0.034, 0.113]}>
        <boxGeometry args={[0.045, 0.008, 0.012]} />
        <meshStandardMaterial color="#0f172a" roughness={0.6} />
      </mesh>
    </Interactive>
  );
}

export function MotherboardLeds({ ledsOn, posted }: { ledsOn: boolean; posted: boolean }) {
  return (
    <group>
      {[0, 1, 2, 3].map((i) => {
        const on = ledsOn || posted;
        const color = posted ? C.led : on ? C.amber : C.off;
        return (
          <mesh key={i} position={[0.046 + i * 0.011, 0.0275, -0.108]}>
            <boxGeometry args={[0.007, 0.003, 0.007]} />
            <meshStandardMaterial
              color={color}
              emissive={color}
              emissiveIntensity={on ? (posted ? 1.1 : 0.8) : 0}
            />
          </mesh>
        );
      })}
      <mesh position={[0.062, 0.0272, -0.095]}>
        <boxGeometry args={[0.03, 0.002, 0.014]} />
        <meshStandardMaterial
          color={posted ? "#0d2b1c" : "#2b0f0f"}
          emissive={posted ? C.led : "#000000"}
          emissiveIntensity={posted ? 0.7 : 0}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

export function Cooler({ visible, fansSpin }: { visible: boolean; fansSpin: boolean }) {
  const hot = useHot("cpu-cooler");
  if (!visible) return null;
  const finCount = 14;
  return (
    <Interactive id="cpu-cooler">
      <mesh position={[-0.07, 0.032, -0.045]}>
        <boxGeometry args={[0.07, 0.006, 0.07]} />
        <meshStandardMaterial
          color={C.alu}
          metalness={0.7}
          roughness={0.3}
          emissive={hot ? AC : "#000000"}
          emissiveIntensity={hot ? 0.3 : 0}
        />
      </mesh>
      <instancedMesh
        args={[undefined!, undefined!, finCount]}
        position={[-0.07, 0.075, -0.045]}
        ref={(m) => {
          if (!m) return;
          const dummy = new THREE.Object3D();
          for (let i = 0; i < finCount; i++) {
            dummy.position.set(0, 0, -0.024 + (i / (finCount - 1)) * 0.048);
            dummy.updateMatrix();
            m.setMatrixAt(i, dummy.matrix);
          }
          m.instanceMatrix.needsUpdate = true;
        }}
      >
        <boxGeometry args={[0.06, 0.08, 0.0015]} />
        <meshStandardMaterial color={C.silver} metalness={0.65} roughness={0.35} />
      </instancedMesh>
      <mesh position={[-0.07, 0.118, -0.045]}>
        <boxGeometry args={[0.056, 0.006, 0.05]} />
        <meshStandardMaterial color={C.alu} metalness={0.7} roughness={0.3} />
      </mesh>
      <group position={[-0.07, 0.075, -0.014]}>
        <mesh>
          <torusGeometry args={[0.044, 0.004, 8, 28]} />
          <meshStandardMaterial color={C.trim} roughness={0.6} />
        </mesh>
        <group position={[0, 0, 0.004]}>
          <Fan radius={0.04} thickness={0.006} blades={7} color="#2c3542" spin={fansSpin} />
        </group>
      </group>
    </Interactive>
  );
}

export function Dimms({
  visible,
  ramSeated,
  faultySlot,
  faultRevealed,
  faultyOut,
}: {
  visible: boolean;
  ramSeated: boolean;
  faultySlot?: string;
  faultRevealed?: boolean;
  faultyOut?: boolean;
}) {
  const hot = useHot("ram");
  const lift = useRef<THREE.Group>(null);
  useEase(ramSeated ? 1 : 0, (v) => {
    if (!lift.current) return;
    lift.current.position.y = (1 - v) * 0.02;
    lift.current.rotation.z = (1 - v) * 0.1;
  });
  if (!visible) return null;
  const em = hot ? AC : "#000000";
  const ei = hot ? 0.3 : 0;
  const slots = [0, 2].filter((slot) => !(faultyOut === true && slot === 2));
  const slotName = (slot: number) => (slot === 0 ? "A1" : "B1");
  const moduleColor = (slot: number) =>
    faultRevealed === true && faultySlot === slotName(slot) ? "#b91c1c" : C.ram;
  const topColor = (slot: number) =>
    faultRevealed === true && faultySlot === slotName(slot) ? "#b91c1c" : C.ramTop;
  return (
    <Interactive id="ram">
      <group ref={lift}>
        {slots.map((slot) => (
          <mesh key={slot} position={[-0.032 + slot * 0.011, 0.046, -0.045]}>
            <boxGeometry args={[0.004, 0.036, 0.104]} />
            <meshStandardMaterial
              color={moduleColor(slot)}
              roughness={0.45}
              metalness={0.4}
              emissive={em}
              emissiveIntensity={ei}
            />
          </mesh>
        ))}
        {slots.map((slot) =>
          [-0.098, 0.008].map((z) => (
            <mesh key={`${slot}-${z}`} position={[-0.032 + slot * 0.011, 0.046, z]}>
              <boxGeometry args={[0.006, 0.036, 0.008]} />
              <meshStandardMaterial
                color={topColor(slot)}
                roughness={0.4}
                metalness={0.5}
                emissive={em}
                emissiveIntensity={ei}
              />
            </mesh>
          )),
        )}
        {slots.map((slot) => (
          <mesh key={`t-${slot}`} position={[-0.032 + slot * 0.011, 0.0645, -0.045]}>
            <boxGeometry args={[0.005, 0.001, 0.1]} />
            <meshStandardMaterial
              color={topColor(slot)}
              roughness={0.35}
              metalness={0.6}
              emissive={em}
              emissiveIntensity={ei}
            />
          </mesh>
        ))}
      </group>
    </Interactive>
  );
}

export function Gpu({
  visible,
  gpuSeated,
  fansSpin,
}: {
  visible: boolean;
  gpuSeated: boolean;
  fansSpin: boolean;
}) {
  const hot = useHot("gpu");
  const body = useRef<THREE.Group>(null);
  useEase(gpuSeated ? 1 : 0, (v) => {
    if (!body.current) return;
    body.current.position.y = (1 - v) * 0.03;
    body.current.rotation.x = (1 - v) * 0.1;
  });
  if (!visible) return null;
  const em = hot ? AC : "#000000";
  const ei = hot ? 0.3 : 0;
  return (
    <Interactive id="gpu">
      <group ref={body}>
        <mesh position={[-0.16, 0.078, 0.055]}>
          <boxGeometry args={[0.005, 0.112, 0.05]} />
          <meshStandardMaterial
            color={C.silver}
            metalness={0.65}
            roughness={0.4}
            emissive={em}
            emissiveIntensity={ei}
          />
        </mesh>
        {[
          [0.11, 0.055],
          [0.08, 0.055],
          [0.05, 0.055],
        ].map(([y, z]) => (
          <mesh key={`${y}-${z}`} position={[-0.163, y, z]}>
            <boxGeometry args={[0.003, 0.012, 0.02]} />
            <meshStandardMaterial color="#1c232e" roughness={0.7} />
          </mesh>
        ))}
        <mesh position={[-0.028, 0.084, 0.055]}>
          <boxGeometry args={[0.254, 0.098, 0.044]} />
          <meshStandardMaterial
            color={C.gpu}
            roughness={0.5}
            emissive={em}
            emissiveIntensity={ei}
          />
        </mesh>
        <mesh position={[-0.028, 0.135, 0.055]}>
          <boxGeometry args={[0.254, 0.005, 0.046]} />
          <meshStandardMaterial
            color={C.gpuTrim}
            roughness={0.4}
            metalness={0.4}
            emissive={em}
            emissiveIntensity={ei}
          />
        </mesh>
        <mesh position={[-0.028, 0.036, 0.055]}>
          <boxGeometry args={[0.25, 0.008, 0.042]} />
          <meshStandardMaterial color={C.gpuTrim} roughness={0.55} />
        </mesh>
        {[-0.09, 0.034].map((x) => (
          <group key={x} position={[x, 0.084, 0.0775]}>
            <mesh>
              <torusGeometry args={[0.036, 0.003, 8, 26]} />
              <meshStandardMaterial color={C.gpuTrim} roughness={0.55} />
            </mesh>
            <group position={[0, 0, 0.004]}>
              <Fan
                radius={0.033}
                thickness={0.005}
                blades={7}
                color="#333c49"
                spin={fansSpin}
                speed={5}
              />
            </group>
          </group>
        ))}
        <mesh position={[0.1, 0.084, 0.055]}>
          <boxGeometry args={[0.008, 0.09, 0.04]} />
          <meshStandardMaterial color={C.gpuTrim} roughness={0.5} />
        </mesh>
      </group>
    </Interactive>
  );
}

export function Psu({
  visible,
  psuToggle,
  psuOutputOk,
  powerSwitchAtWall,
}: {
  visible: boolean;
  psuToggle: boolean;
  psuOutputOk: boolean;
  powerSwitchAtWall: boolean;
}) {
  const hot = useHot("power-supply");
  const rocker = useRef<THREE.Mesh>(null);
  useEase(psuToggle ? 1 : 0, (v) => {
    if (rocker.current) rocker.current.rotation.x = -0.26 + v * 0.52;
  });
  if (!visible) return null;
  const em = hot ? AC : "#000000";
  const ei = hot ? 0.3 : 0;
  return (
    <group>
      <Interactive id="power-supply">
        <mesh position={[0.22, 0.059, -0.19]}>
          <boxGeometry args={[0.15, 0.086, 0.14]} />
          <meshStandardMaterial
            color={C.psu}
            roughness={0.45}
            metalness={0.5}
            emissive={em}
            emissiveIntensity={ei}
          />
        </mesh>
        <mesh position={[0.22, 0.1025, -0.19]}>
          <boxGeometry args={[0.14, 0.004, 0.13]} />
          <meshStandardMaterial color={C.grille} roughness={0.6} />
        </mesh>
        <mesh position={[0.22, 0.1055, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[0.037, 0.003, 8, 26]} />
          <meshStandardMaterial color={C.silver} metalness={0.6} roughness={0.4} />
        </mesh>
        <group position={[0.22, 0.108, -0.19]} rotation={[Math.PI / 2, 0, 0]}>
          <Fan
            radius={0.033}
            thickness={0.005}
            blades={7}
            color="#2c3542"
            spin={psuOutputOk}
            speed={4}
          />
        </group>
        <mesh position={[0.195, 0.06, -0.266]}>
          <boxGeometry args={[0.026, 0.022, 0.005]} />
          <meshStandardMaterial color="#171d26" roughness={0.6} />
        </mesh>
        <mesh position={[0.195, 0.06, -0.269]}>
          <boxGeometry args={[0.02, 0.016, 0.002]} />
          <meshStandardMaterial color="#1b222c" roughness={0.6} />
        </mesh>
        <mesh ref={rocker} position={[0.245, 0.06, -0.2675]}>
          <boxGeometry args={[0.014, 0.026, 0.007]} />
          <meshStandardMaterial
            color={psuToggle ? "#14532d" : "#7f1d1d"}
            roughness={0.5}
            emissive={em}
            emissiveIntensity={ei}
          />
        </mesh>
        <mesh position={[0.245, 0.0685, -0.2705]}>
          <boxGeometry args={[0.006, 0.005, 0.001]} />
          <meshStandardMaterial
            color="#e5e7eb"
            emissive={psuToggle ? "#e5e7eb" : "#000000"}
            emissiveIntensity={psuToggle ? 0.4 : 0}
          />
        </mesh>
        <mesh position={[0.245, 0.05, -0.2705]}>
          <boxGeometry args={[0.005, 0.005, 0.001]} />
          <meshStandardMaterial color="#e5e7eb" />
        </mesh>
        <mesh position={[0.275, 0.06, -0.266]}>
          <boxGeometry args={[0.03, 0.02, 0.004]} />
          <meshStandardMaterial
            color={powerSwitchAtWall && psuOutputOk ? "#052e16" : "#1a0505"}
            emissive={powerSwitchAtWall && psuOutputOk ? C.led : "#000000"}
            emissiveIntensity={powerSwitchAtWall && psuOutputOk ? 0.8 : 0}
            roughness={0.6}
          />
        </mesh>
      </Interactive>
    </group>
  );
}

export function PowerStrip({
  visible,
  powerSwitchAtWall,
}: {
  visible: boolean;
  powerSwitchAtWall: boolean;
}) {
  const hot = useHot("wall");
  if (!visible) return null;
  const wallLive = powerSwitchAtWall;
  return (
    <Interactive id="wall">
      <mesh position={[0.5, 0.0175, -0.16]}>
        <boxGeometry args={[0.22, 0.035, 0.09]} />
        <meshStandardMaterial
          color={C.strip}
          roughness={0.55}
          emissive={hot ? AC : "#000000"}
          emissiveIntensity={hot ? 0.3 : 0}
        />
      </mesh>
      <mesh position={[0.42, 0.036, -0.16]}>
        <boxGeometry args={[0.018, 0.008, 0.02]} />
        <meshStandardMaterial color="#0f141b" roughness={0.6} />
      </mesh>
      <mesh position={[0.48, 0.0355, -0.16]}>
        <cylinderGeometry args={[0.014, 0.014, 0.002, 18]} />
        <meshStandardMaterial color="#0f141b" roughness={0.7} />
      </mesh>
      <mesh position={[0.56, 0.0355, -0.16]}>
        <cylinderGeometry args={[0.014, 0.014, 0.002, 18]} />
        <meshStandardMaterial color="#0f141b" roughness={0.7} />
      </mesh>
      <mesh position={[0.42, 0.041, -0.152]}>
        <boxGeometry args={[0.012, 0.003, 0.006]} />
        <meshStandardMaterial
          color={wallLive ? "#ef4444" : "#3f1d1d"}
          emissive={wallLive ? "#ef4444" : "#000000"}
          emissiveIntensity={wallLive ? 1 : 0}
        />
      </mesh>
    </Interactive>
  );
}

export function Storage({ visible, detected = true }: { visible: boolean; detected?: boolean }) {
  const hot = useHot("storage");
  if (!visible) return null;
  const em = hot ? AC : detected ? "#000000" : "#f87171";
  const ei = hot ? 0.3 : detected ? 0 : 0.6;
  return (
    <Interactive id="storage">
      <mesh position={[0.28, 0.0195, 0.16]}>
        <boxGeometry args={[0.1, 0.007, 0.1]} />
        <meshStandardMaterial color={C.ssd} roughness={0.5} emissive={em} emissiveIntensity={ei} />
      </mesh>
      <mesh position={[0.28, 0.0232, 0.16]}>
        <boxGeometry args={[0.07, 0.0008, 0.07]} />
        <meshStandardMaterial
          color={detected ? C.ssdLabel : "#7f1d1d"}
          roughness={0.7}
          emissive={em}
          emissiveIntensity={ei}
        />
      </mesh>
    </Interactive>
  );
}

export function FrontPanel({
  visible,
  ledsOn,
  connectorOk,
}: {
  visible: boolean;
  ledsOn: boolean;
  connectorOk: boolean;
}) {
  const hot = useHot("front-panel");
  const pinCount = 10;
  if (!visible) return null;
  const em = hot ? AC : connectorOk ? C.led : "#f87171";
  const ei = hot ? 0.3 : connectorOk ? 0.45 : 0.85;
  return (
    <Interactive id="front-panel">
      <mesh position={[-0.15, 0.13, 0.2665]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.013, 0.013, 0.008, 24]} />
        <meshStandardMaterial
          color="#39424f"
          metalness={0.6}
          roughness={0.35}
          emissive={em}
          emissiveIntensity={ei}
        />
      </mesh>
      <mesh position={[-0.15, 0.13, 0.2705]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.007, 0.007, 0.002, 20]} />
        <meshStandardMaterial color="#1c232c" roughness={0.5} />
      </mesh>
      <mesh position={[-0.15, 0.102, 0.2665]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.0035, 0.0035, 0.004, 14]} />
        <meshStandardMaterial
          color={ledsOn ? C.led : C.off}
          emissive={ledsOn ? C.led : "#000000"}
          emissiveIntensity={ledsOn ? 1.1 : 0}
        />
      </mesh>
      <mesh position={[-0.1, 0.13, 0.2665]}>
        <boxGeometry args={[0.03, 0.012, 0.004]} />
        <meshStandardMaterial color="#12171e" roughness={0.7} />
      </mesh>
      <mesh position={[-0.1, 0.105, 0.2665]}>
        <boxGeometry args={[0.03, 0.012, 0.004]} />
        <meshStandardMaterial color="#12171e" roughness={0.7} />
      </mesh>
      <instancedMesh
        args={[undefined!, undefined!, pinCount]}
        position={[-0.047, 0.033, 0.113]}
        ref={(m) => {
          if (!m) return;
          const dummy = new THREE.Object3D();
          for (let i = 0; i < pinCount; i++) {
            const col = i % 5;
            const row = Math.floor(i / 5);
            dummy.position.set(-0.017 + col * 0.0085, 0, -0.003 + row * 0.006);
            dummy.updateMatrix();
            m.setMatrixAt(i, dummy.matrix);
          }
          m.instanceMatrix.needsUpdate = true;
        }}
      >
        <boxGeometry args={[0.0016, 0.007, 0.0016]} />
        <meshStandardMaterial
          color="#d4af37"
          metalness={0.8}
          roughness={0.3}
          emissive={em}
          emissiveIntensity={ei}
        />
      </instancedMesh>
    </Interactive>
  );
}

export function CaseFans({ visible, fansSpin }: { visible: boolean; fansSpin: boolean }) {
  if (!visible) return null;
  return (
    <group>
      {[-0.16, 0.06].map((x) => (
        <group key={x} position={[x, 0.095, 0.2535]}>
          <mesh>
            <torusGeometry args={[0.055, 0.005, 8, 30]} />
            <meshStandardMaterial color={C.trim} roughness={0.6} />
          </mesh>
          {[
            [-0.05, -0.05],
            [0.05, -0.05],
            [-0.05, 0.05],
            [0.05, 0.05],
          ].map(([ox, oy]) => (
            <mesh key={`${ox}-${oy}`} position={[ox, oy, 0.004]}>
              <cylinderGeometry args={[0.003, 0.003, 0.006, 8]} />
              <meshStandardMaterial color="#0f141b" roughness={0.7} />
            </mesh>
          ))}
          <group position={[0, 0, 0.004]}>
            <Fan radius={0.05} thickness={0.007} blades={7} color="#2f3846" spin={fansSpin} />
          </group>
        </group>
      ))}
    </group>
  );
}

function Cable({
  points,
  radius,
  color,
}: {
  points: [number, number, number][];
  radius: number;
  color: string;
}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  return (
    <mesh>
      <tubeGeometry args={[curve, 56, radius, 7, false]} />
      <meshStandardMaterial color={color} roughness={0.75} />
    </mesh>
  );
}

const MAINS_IN: [number, number, number][] = [
  [0.395, 0.03, -0.16],
  [0.36, 0.006, -0.235],
  [0.28, 0.006, -0.3],
  [0.225, 0.02, -0.295],
  [0.2, 0.055, -0.272],
];

const MAINS_OUT: [number, number, number][] = [
  [0.395, 0.03, -0.16],
  [0.36, 0.006, -0.24],
  [0.3, 0.006, -0.31],
  [0.28, 0.012, -0.315],
  [0.262, 0.02, -0.318],
];

function lerpPts(
  a: [number, number, number][],
  b: [number, number, number][],
  t: number,
): [number, number, number][] {
  return a.map((p, i) => [
    p[0] + (b[i][0] - p[0]) * t,
    p[1] + (b[i][1] - p[1]) * t,
    p[2] + (b[i][2] - p[2]) * t,
  ]);
}

export function MainsCable({ visible, seated }: { visible: boolean; seated: boolean }) {
  const mesh = useRef<THREE.Mesh>(null);
  const plug = useRef<THREE.Group>(null);
  const geoRef = useRef<THREE.BufferGeometry | null>(null);
  useEase(
    seated ? 1 : 0,
    (v) => {
      const pts = lerpPts(MAINS_OUT, MAINS_IN, v);
      if (mesh.current) {
        const curve = new THREE.CatmullRomCurve3(pts.map((p) => new THREE.Vector3(...p)));
        const next = new THREE.TubeGeometry(curve, 56, 0.006, 7, false);
        geoRef.current?.dispose();
        geoRef.current = next;
        mesh.current.geometry = next;
      }
      if (plug.current) {
        const p = pts[4];
        plug.current.position.set(p[0], p[1], p[2]);
        const d = [p[0] - pts[3][0], p[2] - pts[3][2]];
        plug.current.rotation.y = Math.atan2(d[0], d[1]);
      }
    },
    6,
  );
  useEffect(
    () => () => {
      geoRef.current?.dispose();
      geoRef.current = null;
    },
    [],
  );
  if (!visible) return null;
  return (
    <group>
      <mesh ref={mesh}>
        <meshStandardMaterial color={C.cable} roughness={0.75} />
      </mesh>
      <group ref={plug}>
        <mesh>
          <boxGeometry args={[0.02, 0.018, 0.018]} />
          <meshStandardMaterial color="#10141a" roughness={0.6} />
        </mesh>
      </group>
      <mesh position={[0.393, 0.028, -0.16]} rotation={[0, -2.7, 0]}>
        <boxGeometry args={[0.022, 0.02, 0.02]} />
        <meshStandardMaterial color="#10141a" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function BoardCables({ visible }: { visible: boolean }) {
  const clip = visible;
  return (
    <group>
      <Cable
        points={[
          [0.15, 0.075, -0.1],
          [0.125, 0.115, -0.06],
          [0.105, 0.078, 0.0],
          [0.095, 0.046, -0.005],
        ]}
        radius={0.009}
        color={C.cable}
      />
      <mesh position={[0.094, 0.036, -0.005]}>
        <boxGeometry args={[0.018, 0.02, 0.092]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>
      <mesh position={[0.1, 0.047, -0.005]}>
        <boxGeometry args={[0.01, 0.004, 0.09]} />
        <meshStandardMaterial
          color={clip ? C.led : C.off}
          emissive={clip ? C.led : "#000000"}
          emissiveIntensity={clip ? 0.5 : 0}
          roughness={0.5}
        />
      </mesh>
      <Cable
        points={[
          [0.17, 0.1, -0.15],
          [0.06, 0.145, -0.17],
          [-0.06, 0.13, -0.15],
          [-0.14, 0.06, -0.12],
          [-0.166, 0.042, -0.107],
        ]}
        radius={0.006}
        color={C.cable}
      />
      <mesh position={[-0.168, 0.035, -0.105]}>
        <boxGeometry args={[0.03, 0.016, 0.024]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>
    </group>
  );
}

export function FrontPanelCable({
  visible,
  connectorOk,
}: {
  visible: boolean;
  connectorOk: boolean;
}) {
  if (!visible) return null;
  return (
    <group>
      <Cable
        points={[
          [-0.1, 0.12, 0.256],
          [-0.1, 0.06, 0.2],
          [-0.075, 0.034, 0.15],
          [-0.05, 0.033, 0.118],
        ]}
        radius={0.003}
        color={C.cable}
      />
      <mesh position={[-0.05, 0.031, 0.115]}>
        <boxGeometry args={[0.02, 0.01, 0.014]} />
        <meshStandardMaterial color="#12161d" roughness={0.6} />
      </mesh>
      {/* header connection clip: green when seated, red when loose (bench.frontPanelConnector) */}
      <mesh position={[-0.05, 0.0368, 0.115]}>
        <boxGeometry args={[0.021, 0.002, 0.0145]} />
        <meshStandardMaterial
          color={connectorOk ? C.led : "#f87171"}
          emissive={connectorOk ? C.led : "#f87171"}
          emissiveIntensity={connectorOk ? 0.6 : 0.9}
          roughness={0.5}
        />
      </mesh>
    </group>
  );
}

export function StorageCables({
  visible,
  dataSeated = true,
}: {
  visible: boolean;
  dataSeated?: boolean;
}) {
  if (!visible) return null;
  return (
    <group>
      <Cable
        points={
          dataSeated
            ? [
                [0.078, 0.033, 0.082],
                [0.14, 0.02, 0.13],
                [0.21, 0.016, 0.19],
                [0.25, 0.02, 0.205],
              ]
            : [
                [0.078, 0.033, 0.082],
                [0.14, 0.02, 0.13],
                [0.19, 0.016, 0.175],
                [0.22, 0.018, 0.19],
              ]
        }
        radius={0.003}
        color={dataSeated ? C.sataData : "#f87171"}
      />
      <mesh position={[0.25, 0.021, 0.212]}>
        <boxGeometry args={[0.016, 0.009, 0.02]} />
        <meshStandardMaterial color="#7f1d1d" roughness={0.6} />
      </mesh>
      <Cable
        points={[
          [0.24, 0.05, -0.118],
          [0.32, 0.02, 0.02],
          [0.33, 0.016, 0.16],
          [0.29, 0.02, 0.205],
        ]}
        radius={0.005}
        color="#161b22"
      />
      <mesh position={[0.29, 0.021, 0.212]}>
        <boxGeometry args={[0.02, 0.01, 0.02]} />
        <meshStandardMaterial color="#161b22" roughness={0.6} />
      </mesh>
    </group>
  );
}
