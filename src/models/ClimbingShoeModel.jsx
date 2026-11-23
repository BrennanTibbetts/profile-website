import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

// "Climbing Shoe Scan LOWPOLY" by EvanLegrand, CC BY 4.0 (credited in the
// page footer; see public/assets/models/climbing-shoe/license.txt).
const SHOE_PATH = "/assets/models/climbing-shoe/climbing-shoe.glb";
// Sways back and forth (rather than spinning all the way round) so its long
// side never swings out of its frame.
const SWAY_ANGLE = 0.55; // radians either side
const SWAY_SPEED = 0.6;

/**
 * The climbing shoe scan, scaled so its longest side is `length` scene units
 * and centred on its own origin, swaying slowly on the spot.
 */
export function ClimbingShoeModel({ length = 2.6, renderOrder = 0, ...props }) {
  const { scene } = useGLTF(SHOE_PATH);
  const spinRef = useRef(null);

  const { model, scale } = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    clone.position.sub(center);
    // The scene's ambient light is strong (it's tuned for the phone), so tone
    // the scan's texture down to keep its shading and colour.
    clone.traverse((node) => {
      if (node.isMesh && node.material) {
        node.renderOrder = renderOrder;
        node.material = node.material.clone();
        node.material.color.setScalar(0.55);
        node.material.envMapIntensity = 0.8;
      }
    });
    return { model: clone, scale: length / Math.max(size.x, size.y, size.z) };
  }, [scene, length, renderOrder]);

  useFrame(({ clock }) => {
    if (spinRef.current) {
      spinRef.current.rotation.y = Math.sin(clock.elapsedTime * SWAY_SPEED) * SWAY_ANGLE;
    }
  });

  return (
    <group {...props}>
      <group ref={spinRef} scale={scale}>
        <primitive object={model} />
      </group>
    </group>
  );
}

// Fetched as soon as the 3D code loads, not when Chalkmark comes into view.
useGLTF.preload(SHOE_PATH);
