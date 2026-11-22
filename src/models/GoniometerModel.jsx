import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Billboard, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";

// Three-point goniometer, after the Angulo app icon: a vertex joint and two
// arms, one sweeping slowly open and closed, with a solid wedge filling the
// angle and a pill showing the live reading.
const ARM_LENGTH = 1.6;
const JOINT_RADIUS = 0.2;
const ARM_RADIUS = 0.09;
const MIN_ANGLE_DEG = 62;
const MAX_ANGLE_DEG = 128;
const SWEEP_SPEED = 0.7;

// Centre of the shape, so it sits on its group's origin.
const LAYOUT_CENTER = [0.35, 0.55];

// The wedge's straight sides run parallel to each arm at WEDGE_ARM_GAP, so it
// never cuts into the arm cylinders.
const WEDGE_INNER_RADIUS = 0.36;
const WEDGE_OUTER_RADIUS = 0.86;
const WEDGE_ARM_GAP = 0.15;
const WEDGE_DEPTH = 0.14;
const WEDGE_BEVEL = 0.03;

const PILL_DISTANCE = WEDGE_OUTER_RADIUS + 0.55;
const PILL_FONT = "/fonts/fraunces/fraunces-3d.woff";
const PILL_SIZE = [0.98, 0.4, 0.04];
const PILL_FONT_SIZE = 0.22;

function createWedgeGeometry(angle) {
  const innerEdge = Math.min(Math.asin(WEDGE_ARM_GAP / WEDGE_INNER_RADIUS), angle * 0.3);
  const outerEdge = Math.min(Math.asin(WEDGE_ARM_GAP / WEDGE_OUTER_RADIUS), angle * 0.3);
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(innerEdge) * WEDGE_INNER_RADIUS, Math.sin(innerEdge) * WEDGE_INNER_RADIUS);
  shape.absarc(0, 0, WEDGE_OUTER_RADIUS, outerEdge, angle - outerEdge, false);
  shape.absarc(0, 0, WEDGE_INNER_RADIUS, angle - innerEdge, innerEdge, true);
  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WEDGE_DEPTH,
    curveSegments: 48,
    bevelEnabled: true,
    bevelThickness: WEDGE_BEVEL,
    bevelSize: WEDGE_BEVEL,
    bevelSegments: 4,
  });
  geometry.translate(0, 0, -WEDGE_DEPTH / 2);
  return geometry;
}

function Arm({ material, renderOrder }) {
  return (
    <mesh material={material} position={[ARM_LENGTH / 2, 0, 0]} rotation={[0, 0, Math.PI / 2]} renderOrder={renderOrder}>
      <cylinderGeometry args={[ARM_RADIUS, ARM_RADIUS, ARM_LENGTH, 32]} />
    </mesh>
  );
}

function Joint({ material, renderOrder, position = [0, 0, 0] }) {
  return (
    <mesh material={material} position={position} renderOrder={renderOrder}>
      <sphereGeometry args={[JOINT_RADIUS, 48, 48]} />
    </mesh>
  );
}

/**
 * `renderOrder` is applied to every mesh (e.g. to draw it over another model;
 * three.js resets render order inside nested groups, so it can't be set on a
 * parent).
 */
export function GoniometerModel({ accentColor = "#0a6b58", pillColor = "#34d3b4", renderOrder = 0, ...props }) {
  const floatRef = useRef(null);
  const sweepArmRef = useRef(null);
  const wedgeRef = useRef(null);
  const pillRef = useRef(null);
  const pillTextRef = useRef(null);
  const timeRef = useRef(Math.random() * 10);
  const lastLabelRef = useRef("");

  // Base colours are darker than they render: the scene's strong ambient
  // light (tuned for the phone) would otherwise wash out the shading.
  const materials = useMemo(
    () => ({
      joint: new THREE.MeshStandardMaterial({ color: "#8a9296", roughness: 0.25, metalness: 0.05 }),
      arm: new THREE.MeshStandardMaterial({ color: "#737b80", roughness: 0.3, metalness: 0.1 }),
      wedge: new THREE.MeshPhysicalMaterial({
        color: accentColor,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.8,
        emissive: accentColor,
        emissiveIntensity: 0.12,
      }),
    }),
    [accentColor]
  );

  // One wedge geometry per whole degree, built on first use and reused.
  const wedgeGeometries = useMemo(() => new Map(), []);
  const getWedgeGeometry = (degrees) => {
    let geometry = wedgeGeometries.get(degrees);
    if (!geometry) {
      geometry = createWedgeGeometry(THREE.MathUtils.degToRad(degrees));
      wedgeGeometries.set(degrees, geometry);
    }
    return geometry;
  };
  const initialWedgeGeometry = getWedgeGeometry(MIN_ANGLE_DEG);

  useEffect(
    () => () => {
      Object.values(materials).forEach((material) => material.dispose());
      wedgeGeometries.forEach((geometry) => geometry.dispose());
      wedgeGeometries.clear();
    },
    [materials, wedgeGeometries]
  );

  useFrame((_, delta) => {
    timeRef.current += Math.min(delta, 0.1);
    const t = timeRef.current;

    // A gentle float.
    if (floatRef.current) {
      const f = (t * 1.4) / 4;
      floatRef.current.rotation.set((Math.cos(f) / 8) * 0.6, (Math.sin(f) / 8) * 0.6, (Math.sin(f) / 20) * 0.6);
      floatRef.current.position.y = (Math.sin(f) / 10) * 0.4;
    }

    // The sweeping arm, the wedge and the reading.
    const wave = (Math.sin(t * SWEEP_SPEED) + 1) / 2;
    const degrees = MIN_ANGLE_DEG + (MAX_ANGLE_DEG - MIN_ANGLE_DEG) * wave;
    const angle = THREE.MathUtils.degToRad(degrees);
    if (sweepArmRef.current) {
      sweepArmRef.current.rotation.z = angle;
    }
    if (wedgeRef.current) {
      const geometry = getWedgeGeometry(Math.round(degrees));
      if (wedgeRef.current.geometry !== geometry) {
        wedgeRef.current.geometry = geometry;
      }
    }
    pillRef.current?.position.set(Math.cos(angle / 2) * PILL_DISTANCE, Math.sin(angle / 2) * PILL_DISTANCE, 0);
    const label = `${degrees.toFixed(1)}°`;
    if (pillTextRef.current && label !== lastLabelRef.current) {
      pillTextRef.current.text = label;
      pillTextRef.current.sync();
      lastLabelRef.current = label;
    }
  });

  return (
    <group {...props} dispose={null}>
      <group ref={floatRef}>
        <group position={[-LAYOUT_CENTER[0], -LAYOUT_CENTER[1], 0]}>
          <mesh ref={wedgeRef} geometry={initialWedgeGeometry} material={materials.wedge} renderOrder={renderOrder} />

          <Joint material={materials.joint} renderOrder={renderOrder} />
          <Arm material={materials.arm} renderOrder={renderOrder} />
          <Joint material={materials.joint} renderOrder={renderOrder} position={[ARM_LENGTH, 0, 0]} />

          <group ref={sweepArmRef}>
            <Arm material={materials.arm} renderOrder={renderOrder} />
            <Joint material={materials.joint} renderOrder={renderOrder} position={[ARM_LENGTH, 0, 0]} />
          </group>

          <group ref={pillRef}>
            <Billboard>
              <RoundedBox args={PILL_SIZE} radius={PILL_SIZE[1] / 2 - 0.001} smoothness={6} renderOrder={renderOrder}>
                <meshBasicMaterial color={pillColor} toneMapped={false} />
              </RoundedBox>
              <Text
                ref={pillTextRef}
                font={PILL_FONT}
                fontSize={PILL_FONT_SIZE}
                color="#000000"
                anchorX="center"
                anchorY="middle"
                position={[0, 0, PILL_SIZE[2] / 2 + 0.005]}
                renderOrder={renderOrder + 1}
              >
                {`${MIN_ANGLE_DEG.toFixed(1)}°`}
              </Text>
            </Billboard>
          </group>
        </group>
      </group>
    </group>
  );
}
