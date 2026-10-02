import { useEffect, useMemo, useState } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";

/**
 * Selection mark for the 3D stages: four L-brackets around the measured
 * footprint of the selected part.
 *
 * Deliberately distinct from every other signal in the scene:
 *   · hover   → emissive tint on the part itself
 *   · guide   → the DOM guide ring anchored to `data-guide-anchor-3d`,
 *               plus these brackets breathing while they sit on the target
 *   · select  → these brackets, drawn through geometry (depthTest off)
 *
 * The footprint is measured from the live scene graph, so it is correct for
 * every part without hand-authored bounds and updates when parts are added,
 * moved, or hidden.
 */
export interface SelectionMarkProps {
  /** Part id — must be the `name` of an object in the scene. */
  id: string | null;
  /** Mark colour (shell accent = armed/selected). */
  color?: string;
  /** Slow opacity breathe while the mark sits on the live guide target. */
  breathe?: boolean;
  /** Scene reduced-motion flag — the breathe stays off. */
  reduced?: boolean;
}

const ARM_THICKNESS = 0.006;
const ARM_MIN = 0.022;
const ARM_MAX = 0.09;

interface Arm {
  pos: [number, number, number];
  size: [number, number, number];
}

function visibleInTree(obj: THREE.Object3D, root: THREE.Object3D): boolean {
  let cur: THREE.Object3D | null = obj;
  while (cur) {
    if (!cur.visible) return false;
    if (cur === root) return true;
    cur = cur.parent;
  }
  return true;
}

/** World-space bounds of the visible meshes under `root`. */
function measure(root: THREE.Object3D): THREE.Box3 | null {
  const box = new THREE.Box3();
  box.makeEmpty();
  root.updateWorldMatrix(true, true);
  let meshes = 0;
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!(mesh as unknown as { isMesh?: boolean }).isMesh) return;
    if (!visibleInTree(mesh, root)) return;
    const geom = mesh.geometry;
    if (!geom) return;
    if (!geom.boundingBox) geom.computeBoundingBox();
    if (!geom.boundingBox) return;
    box.union(geom.boundingBox.clone().applyMatrix4(mesh.matrixWorld));
    meshes += 1;
  });
  return meshes > 0 && !box.isEmpty() ? box : null;
}

function armsFor(box: THREE.Box3): Arm[] {
  const center = box.getCenter(new THREE.Vector3());
  const half = box.getSize(new THREE.Vector3()).multiplyScalar(0.5);
  const t = Math.min(ARM_MAX, Math.max(ARM_MIN, Math.min(half.x, half.y, half.z) * 0.5));
  const arms: Arm[] = [];
  for (const sx of [-1, 1]) {
    for (const sy of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const cx = center.x + sx * half.x;
        const cy = center.y + sy * half.y;
        const cz = center.z + sz * half.z;
        arms.push({ pos: [cx - (sx * t) / 2, cy, cz], size: [t, ARM_THICKNESS, ARM_THICKNESS] });
        arms.push({ pos: [cx, cy - (sy * t) / 2, cz], size: [ARM_THICKNESS, t, ARM_THICKNESS] });
        arms.push({ pos: [cx, cy, cz - (sz * t) / 2], size: [ARM_THICKNESS, ARM_THICKNESS, t] });
      }
    }
  }
  return arms;
}

export function SelectionMark({
  id,
  color = "#e2560f",
  breathe = false,
  reduced = false,
}: SelectionMarkProps) {
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);
  const [measured, setMeasured] = useState<{ id: string; arms: Arm[] } | null>(null);

  // One shared material so the breathe drives every arm together.
  const material = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        color,
        depthTest: false,
        toneMapped: false,
        transparent: true,
        opacity: 1,
      }),
    [color],
  );
  useEffect(() => () => material.dispose(), [material]);

  const breathing = breathe && !reduced;

  // The canvas runs on demand; one interval both advances the breathe and
  // invalidates the frame, so the scene never becomes a permanent loop.
  useEffect(() => {
    if (!breathing) return;
    const interval = window.setInterval(() => {
      const wave = 0.5 + 0.5 * Math.sin((performance.now() / 1000) * 1.6);
      material.opacity = 0.55 + 0.45 * wave;
      invalidate();
    }, 66);
    return () => {
      window.clearInterval(interval);
      material.opacity = 1;
      invalidate();
    };
  }, [breathing, invalidate, material]);

  // Measure on the next frame: the scene graph has been committed and its
  // world matrices settled by then. No state is written from the effect body.
  useEffect(() => {
    if (!id) return;
    const frame = requestAnimationFrame(() => {
      const root = scene.getObjectByName(id);
      const box = root ? measure(root) : null;
      setMeasured({ id, arms: box ? armsFor(box) : [] });
      invalidate();
    });
    return () => cancelAnimationFrame(frame);
  }, [id, scene, invalidate]);

  const arms = measured && measured.id === id ? measured.arms : [];
  if (arms.length === 0) return null;

  return (
    <group>
      {arms.map((arm, i) => (
        <mesh key={i} position={arm.pos} renderOrder={20} material={material}>
          <boxGeometry args={arm.size} />
        </mesh>
      ))}
    </group>
  );
}
