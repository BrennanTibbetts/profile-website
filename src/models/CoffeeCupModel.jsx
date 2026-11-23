import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";
import { CoffeeSmoke } from "./CoffeeSmoke.jsx";

// "Coffee Cup" by AK STUDIO, CC BY 4.0 (credited in the page footer; see
// public/assets/models/coffee-cup/license.txt).
const CUP_PATH = "/assets/models/coffee-cup/coffee-cup.glb";

/**
 * The coffee cup scan with steam rising from it. The cup is scaled so its
 * widest side is `width` scene units, with its base centred on the origin.
 */
export function CoffeeCupModel({ width = 1.8, renderOrder = 0, ...props }) {
  const { scene } = useGLTF(CUP_PATH);

  const { model, scale, cupHeight } = useMemo(() => {
    const clone = scene.clone(true);
    clone.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = box.getSize(new THREE.Vector3());
    const center = box.getCenter(new THREE.Vector3());
    // Centre horizontally; sit the base on y = 0.
    clone.position.set(-center.x, -box.min.y, -center.z);
    // Tone the texture down against the scene's strong ambient light (tuned
    // for the phone) so the cup keeps its shading.
    clone.traverse((node) => {
      if (node.isMesh && node.material) {
        node.renderOrder = renderOrder;
        node.material = node.material.clone();
        node.material.color.setScalar(0.6);
        node.material.envMapIntensity = 0.8;
      }
    });
    const fitScale = width / Math.max(size.x, size.z);
    return { model: clone, scale: fitScale, cupHeight: size.y * fitScale };
  }, [scene, width, renderOrder]);

  return (
    <group {...props}>
      <group scale={scale}>
        <primitive object={model} />
      </group>
      <CoffeeSmoke
        width={width * 0.6}
        height={width * 2.1}
        position={[0, cupHeight * 0.8, 0]}
        renderOrder={renderOrder}
      />
    </group>
  );
}

// Fetched as soon as the 3D code loads, not when Cadence comes into view.
useGLTF.preload(CUP_PATH);
