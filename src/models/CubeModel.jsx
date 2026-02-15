import { useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useMouseTracking } from "../hooks/useMouseTracking";

export function CubeModel({ isActive = true, ...props }) {
  const spinRef = useRef();

  const forwardAxis = useMemo(() => new THREE.Vector3(0, 0, 1), []);
  const rotationOffset = useMemo(() => {
    const quaternion = new THREE.Quaternion();
    quaternion.setFromEuler(new THREE.Euler(0.2, 0.5, 0));
    return quaternion;
  }, []);

  const cubeRef = useMouseTracking(forwardAxis, rotationOffset, isActive);

  useFrame((_, delta) => {
    if (!spinRef.current || !isActive) {
      return;
    }

    spinRef.current.rotation.x += delta * 0.25;
    spinRef.current.rotation.y += delta * 0.4;
  });

  return (
    <group {...props} ref={cubeRef}>
      <group ref={spinRef}>
        <mesh castShadow receiveShadow>
          <boxGeometry args={[2.4, 2.4, 2.4]} />
          <meshStandardMaterial
            color="#f1f1f1"
            emissive="#101010"
            emissiveIntensity={0.2}
            metalness={0.35}
            roughness={0.35}
          />
        </mesh>
      </group>
    </group>
  );
}
