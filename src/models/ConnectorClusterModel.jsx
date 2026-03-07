import { Suspense, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { useGLTF } from "@react-three/drei";
import { BallCollider, CuboidCollider, Physics, RigidBody } from "@react-three/rapier";
import { easing } from "maath";
import * as THREE from "three";

const ACCENT_COLORS = ["#4060ff", "#20ffa0", "#ff4060", "#ffcc00"];
const REFERENCE_CONNECTOR_MODEL_SCALE = 10;
const CONNECTOR_CLUSTER_RADIUS = 3.4;
const CONNECTOR_MIN_DISTANCE = 2.05;
const CONNECTOR_MODEL_SCALE = 7.5;

const shuffle = (accent = 0) => [
  { color: "#444", roughness: 0.1 },
  { color: "#444", roughness: 0.75 },
  { color: "#444", roughness: 0.75 },
  { color: "white", roughness: 0.1 },
  { color: "#ffcc00", roughness: 0.75 },
  { color: "#ffcc00", roughness: 0.1 },
  { color: ACCENT_COLORS[accent], roughness: 0.1, accent: true },
  { color: ACCENT_COLORS[accent], roughness: 0.75, accent: true },
  { color: ACCENT_COLORS[accent], roughness: 0.1, accent: true },
];

function generateSpawnPositions(count, radius = CONNECTOR_CLUSTER_RADIUS, minDistance = CONNECTOR_MIN_DISTANCE) {
  const positions = [];
  const candidate = new THREE.Vector3();
  const maxAttempts = 180;

  for (let i = 0; i < count; i += 1) {
    let placed = false;

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      candidate.set(
        THREE.MathUtils.randFloatSpread(radius * 2),
        THREE.MathUtils.randFloatSpread(radius * 2),
        THREE.MathUtils.randFloatSpread(radius * 2)
      );

      if (candidate.lengthSq() > radius * radius) {
        continue;
      }

      let valid = true;
      for (const existing of positions) {
        if (existing.distanceToSquared(candidate) < minDistance * minDistance) {
          valid = false;
          break;
        }
      }
      if (!valid) {
        continue;
      }

      positions.push(candidate.clone());
      placed = true;
      break;
    }

    if (!placed) {
      const angle = (i / Math.max(1, count)) * Math.PI * 2;
      positions.push(
        new THREE.Vector3(
          Math.cos(angle) * radius * 0.82,
          ((i % 3) - 1) * 0.45,
          Math.sin(angle) * radius * 0.82
        )
      );
    }
  }

  return positions.map((position) => [position.x, position.y, position.z]);
}

function randomEulerRotation() {
  return [
    THREE.MathUtils.randFloatSpread(Math.PI * 2),
    THREE.MathUtils.randFloatSpread(Math.PI * 2),
    THREE.MathUtils.randFloatSpread(Math.PI * 2),
  ];
}

function PointerCollider({ enabled, anchorSourceRef }) {
  const pointerRef = useRef(null);
  const center = useMemo(() => new THREE.Vector3(), []);

  useFrame(({ mouse, viewport }) => {
    if (!anchorSourceRef?.current) {
      return;
    }

    anchorSourceRef.current.getWorldPosition(center);

    if (!enabled) {
      pointerRef.current?.setNextKinematicTranslation({ x: center.x, y: center.y, z: -1000 });
      return;
    }

    pointerRef.current?.setNextKinematicTranslation({
      x: center.x + (mouse.x * viewport.width) / 2,
      y: center.y + (mouse.y * viewport.height) / 2,
      z: center.z,
    });
  });

  return (
    <RigidBody ref={pointerRef} type="kinematicPosition" colliders={false} position={[0, 0, 0]}>
      <BallCollider args={[1]} />
    </RigidBody>
  );
}

function Connector({
  position,
  rotation,
  children,
  accent = false,
  registerBody,
  anchorSourceRef,
  bodyIndex = 0,
  colliderCoreHalf = 0.38,
  colliderArmHalf = 1.27,
  ...props
}) {
  const bodyRef = useRef(null);
  const initialPosition = useMemo(() => position ?? [0, 0, 0], [position]);

  useEffect(() => {
    if (!registerBody || !bodyRef.current || !anchorSourceRef?.current) {
      return;
    }

    registerBody(bodyIndex, bodyRef.current, initialPosition);
  }, [registerBody, bodyIndex, initialPosition, anchorSourceRef]);

  return (
    <RigidBody
      ref={bodyRef}
      colliders={false}
      position={initialPosition}
      rotation={rotation}
      linearDamping={4}
      angularDamping={1}
      friction={0.1}
    >
      <CuboidCollider args={[colliderCoreHalf, colliderArmHalf, colliderCoreHalf]} />
      <CuboidCollider args={[colliderArmHalf, colliderCoreHalf, colliderCoreHalf]} />
      <CuboidCollider args={[colliderCoreHalf, colliderCoreHalf, colliderArmHalf]} />
      {children ? children : <Model {...props} />}
      {accent ? <pointLight intensity={4} distance={2.5} color={props.color} /> : null}
    </RigidBody>
  );
}

export function ConnectorClusterModel({ isActive = true, interactionEnabled = true, anchorSourceRef }) {
  const bodyMetaRef = useRef([]);

  const anchorPosRef = useRef(new THREE.Vector3());
  const prevAnchorPosRef = useRef(new THREE.Vector3());
  const anchorQuatRef = useRef(new THREE.Quaternion());
  const prevAnchorQuatRef = useRef(new THREE.Quaternion());
  const deltaQuatRef = useRef(new THREE.Quaternion());
  const invPrevQuatRef = useRef(new THREE.Quaternion());

  const tempVecRef = useRef(new THREE.Vector3());
  const tempVec2Ref = useRef(new THREE.Vector3());
  const tempQuatRef = useRef(new THREE.Quaternion());
  const hasPrevAnchorRef = useRef(false);
  const colliderScale = CONNECTOR_MODEL_SCALE / REFERENCE_CONNECTOR_MODEL_SCALE;
  const colliderCoreHalf = 0.38 * colliderScale;
  const colliderArmHalf = 1.27 * colliderScale;

  const connectors = useMemo(() => {
    const palette = shuffle(0);
    const spawnPositions = generateSpawnPositions(palette.length);
    return palette.map((connector, index) => ({
      ...connector,
      position: spawnPositions[index],
      rotation: randomEulerRotation(),
    }));
  }, []);

  const registerBody = useMemo(
    () => (index, body, localPositionArray) => {
      bodyMetaRef.current[index] = {
        body,
        localPosition: new THREE.Vector3(localPositionArray[0], localPositionArray[1], localPositionArray[2]),
        initialized: false,
      };
    },
    []
  );

  useFrame(() => {
    if (!anchorSourceRef?.current) {
      return;
    }

    anchorSourceRef.current.getWorldPosition(anchorPosRef.current);
    anchorSourceRef.current.getWorldQuaternion(anchorQuatRef.current);

    if (!hasPrevAnchorRef.current) {
      prevAnchorPosRef.current.copy(anchorPosRef.current);
      prevAnchorQuatRef.current.copy(anchorQuatRef.current);
      hasPrevAnchorRef.current = true;
    }

    invPrevQuatRef.current.copy(prevAnchorQuatRef.current).invert();
    deltaQuatRef.current.copy(anchorQuatRef.current).multiply(invPrevQuatRef.current);

    const centerX = anchorPosRef.current.x;
    const centerY = anchorPosRef.current.y;
    const centerZ = anchorPosRef.current.z;

    for (const meta of bodyMetaRef.current) {
      if (!meta?.body) {
        continue;
      }

      if (!meta.initialized) {
        const localWorld = tempVecRef.current.copy(meta.localPosition).applyQuaternion(anchorQuatRef.current);
        meta.body.setTranslation(
          {
            x: centerX + localWorld.x,
            y: centerY + localWorld.y,
            z: centerZ + localWorld.z,
          },
          true
        );
        meta.body.setRotation(
          {
            x: anchorQuatRef.current.x,
            y: anchorQuatRef.current.y,
            z: anchorQuatRef.current.z,
            w: anchorQuatRef.current.w,
          },
          true
        );
        meta.body.setLinvel({ x: 0, y: 0, z: 0 }, true);
        meta.body.setAngvel({ x: 0, y: 0, z: 0 }, true);
        meta.initialized = true;
      } else {
        const t = meta.body.translation();
        const moved = tempVecRef.current
          .set(t.x, t.y, t.z)
          .sub(prevAnchorPosRef.current)
          .applyQuaternion(deltaQuatRef.current)
          .add(anchorPosRef.current);
        meta.body.setTranslation({ x: moved.x, y: moved.y, z: moved.z }, true);

        const r = meta.body.rotation();
        const rotated = tempQuatRef.current
          .set(r.x, r.y, r.z, r.w)
          .premultiply(deltaQuatRef.current)
          .normalize();
        meta.body.setRotation({ x: rotated.x, y: rotated.y, z: rotated.z, w: rotated.w }, true);

        const lv = meta.body.linvel();
        const nextLinvel = tempVecRef.current.set(lv.x, lv.y, lv.z).applyQuaternion(deltaQuatRef.current);
        meta.body.setLinvel({ x: nextLinvel.x, y: nextLinvel.y, z: nextLinvel.z }, true);

        const av = meta.body.angvel();
        const nextAngvel = tempVecRef.current.set(av.x, av.y, av.z).applyQuaternion(deltaQuatRef.current);
        meta.body.setAngvel({ x: nextAngvel.x, y: nextAngvel.y, z: nextAngvel.z }, true);
      }

      const translation = meta.body.translation();
      const impulse = tempVec2Ref.current
        .set(centerX - translation.x, centerY - translation.y, centerZ - translation.z)
        .multiplyScalar(0.2);
      meta.body.applyImpulse({ x: impulse.x, y: impulse.y, z: impulse.z }, true);
    }

    prevAnchorPosRef.current.copy(anchorPosRef.current);
    prevAnchorQuatRef.current.copy(anchorQuatRef.current);
  });

  return (
    <group>
      <Suspense fallback={null}>
        <Physics gravity={[0, 0, 0]}>
          <PointerCollider enabled={isActive && interactionEnabled} anchorSourceRef={anchorSourceRef} />
          {connectors.map((connector, index) => (
            <Connector
              key={index}
              {...connector}
              anchorSourceRef={anchorSourceRef}
              bodyIndex={index}
              registerBody={registerBody}
              colliderCoreHalf={colliderCoreHalf}
              colliderArmHalf={colliderArmHalf}
            />
          ))}
        </Physics>
      </Suspense>
    </group>
  );
}

function Model({ children, color = "white", roughness = 0 }) {
  const meshRef = useRef(null);
  const { nodes, materials } = useGLTF("/assets/models/connector/c-transformed.glb");

  useFrame((_, delta) => {
    const activeMaterial = meshRef.current?.material;
    if (activeMaterial?.color) {
      easing.dampC(activeMaterial.color, color, 0.2, delta);
    }
  });

  return (
    <mesh
      ref={meshRef}
      castShadow
      receiveShadow
      scale={CONNECTOR_MODEL_SCALE}
      geometry={nodes.connector.geometry}
    >
      <meshStandardMaterial metalness={0.2} roughness={roughness} map={materials.base.map} />
      {children}
    </mesh>
  );
}

useGLTF.preload("/assets/models/connector/c-transformed.glb");
