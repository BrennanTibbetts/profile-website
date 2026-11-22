import { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import * as THREE from "three";

// A small studio for reflections: a bright sky overhead, a big soft panel on
// each side and a dim floor. It's drawn from a few planes, so there's no HDR
// image to download (it used to be drei's "city" preset, from a third-party
// CDN), and it's built once and shared by every phone scene.
const PANELS = [
  { color: "#f2f4f7", intensity: 3, position: [0, 6, 0], rotation: [Math.PI / 2, 0, 0], scale: [14, 14] },
  { color: "#ffffff", intensity: 1.6, position: [-6, 1.5, 2], rotation: [0, Math.PI / 2, 0], scale: [8, 4] },
  { color: "#e9eef5", intensity: 1.2, position: [6, 1, -1], rotation: [0, -Math.PI / 2, 0], scale: [8, 4] },
  { color: "#ffffff", intensity: 0.8, position: [0, 2, 6], rotation: [0, Math.PI, 0], scale: [10, 3] },
  { color: "#8a8178", intensity: 0.25, position: [0, -5, 0], rotation: [-Math.PI / 2, 0, 0], scale: [14, 14] },
];

let studio = null;

function buildStudio(gl) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#3b3d40");
  const plane = new THREE.PlaneGeometry(1, 1);
  PANELS.forEach(({ color, intensity, position, rotation, scale }) => {
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color).multiplyScalar(intensity),
      side: THREE.DoubleSide,
      toneMapped: false,
    });
    const mesh = new THREE.Mesh(plane, material);
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.scale.set(scale[0], scale[1], 1);
    scene.add(mesh);
  });
  const pmrem = new THREE.PMREMGenerator(gl);
  const texture = pmrem.fromScene(scene, 0.02).texture;
  pmrem.dispose();
  plane.dispose();
  scene.traverse((object) => object.material?.dispose());
  return texture;
}

/**
 * The lighting every phone scene uses: strong ambient and key light (the look
 * the phone, cup, shoe and diagram were all tuned under) plus the studio
 * above for reflections.
 */
export default function PhoneLighting() {
  const gl = useThree((state) => state.gl);
  const map = useMemo(() => {
    studio ??= buildStudio(gl);
    return studio;
  }, [gl]);

  return (
    <>
      <directionalLight position={[-1.2, 1, 0.4]} intensity={6} />
      <ambientLight intensity={6} />
      <Environment map={map} />
    </>
  );
}
