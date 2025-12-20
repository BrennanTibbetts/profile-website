import { Physics, useCylinder, useSphere, useBox, usePlane, useCompoundBody } from "@react-three/cannon";
import { MeshTransmissionMaterial, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo } from "react";
import { useControls } from "leva";
import * as THREE from "three";

// Individual physics shapes
function PhysicsSphere({ position, size, color, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    position,
    args: [size],
    linearDamping,
    angularDamping,
    allowSleep: true,
    sleepSpeedLimit,
    sleepTimeLimit,
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[size, 16, 16]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PhysicsCube({ position, size, color, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution }) {
  const [ref] = useBox(() => ({
    mass: 1,
    position,
    args: [size, size, size],
    linearDamping,
    angularDamping,
    allowSleep: true,
    sleepSpeedLimit,
    sleepTimeLimit,
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[size, size, size]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PhysicsTorus({ position, size, color, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    position,
    args: [size * 0.7], // Approximate with sphere for performance
    linearDamping,
    angularDamping,
    allowSleep: true,
    sleepSpeedLimit,
    sleepTimeLimit,
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh ref={ref} castShadow>
      <torusGeometry args={[size * 0.5, size * 0.25, 12, 24]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function PhysicsTorusKnot({ position, size, color, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution }) {
  const [ref] = useSphere(() => ({
    mass: 1,
    position,
    args: [size * 0.8], // Approximate with sphere for performance
    linearDamping,
    angularDamping,
    allowSleep: true,
    sleepSpeedLimit,
    sleepTimeLimit,
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh ref={ref} castShadow>
      <torusKnotGeometry args={[size * 0.4, size * 0.15, 32, 8]} />
      <meshStandardMaterial color={color} />
    </mesh>
  );
}

function WallSegment({ angle, radius, height, y, wallThickness, segmentWidth, visible, friction, restitution }) {
  const x = Math.cos(angle) * radius;
  const z = Math.sin(angle) * radius;
  
  const [ref] = useBox(() => ({
    type: "Static",
    args: [segmentWidth, height, wallThickness],
    position: [x, y, z],
    rotation: [0, -angle + Math.PI / 2, 0],
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh 
      ref={ref} 
      position={[x, y, z]}
      rotation={[0, -angle + Math.PI / 2, 0]}
      visible={visible}
    >
      <boxGeometry args={[segmentWidth, height, wallThickness]} />
      <meshBasicMaterial color="cyan" wireframe opacity={0.3} transparent />
    </mesh>
  );
}

function JarCollider({ radius, height, y, visible, wallThickness, bottomThickness, friction, restitution }) {
  // Bottom of the jar (solid cylinder)
  const [bottomRef] = useCylinder(() => ({
    type: "Static",
    args: [radius, radius, bottomThickness, 16],
    position: [0, y - height / 2, 0],
    material: {
      friction,
      restitution,
    },
  }));

  const numSegments = 16;
  const segmentWidth = (2 * Math.PI * radius) / numSegments;

  return (
    <>
      {/* Bottom */}
      <mesh ref={bottomRef} position={[0, y - height / 2, 0]} visible={visible}>
        <cylinderGeometry args={[radius, radius, bottomThickness, 16]} />
        <meshBasicMaterial color="lime" wireframe opacity={0.3} transparent />
      </mesh>
      
      {/* Walls */}
      {Array.from({ length: numSegments }).map((_, i) => (
        <WallSegment
          key={i}
          angle={(i / numSegments) * Math.PI * 2}
          radius={radius}
          height={height}
          y={y}
          wallThickness={wallThickness}
          segmentWidth={segmentWidth}
          visible={visible}
          friction={friction}
          restitution={restitution}
        />
      ))}
    </>
  );
}

function GroundFloor({ y, size, visible, friction, restitution }) {
  const [ref] = useBox(() => ({
    type: "Static",
    args: [size, 0.01, size],
    position: [0, y, 0],
    material: {
      friction,
      restitution,
    },
  }));

  return (
    <mesh ref={ref} position={[0, y, 0]} visible={visible} receiveShadow>
      <boxGeometry args={[size, 0.01, size]} />
      <meshBasicMaterial color="orange" wireframe opacity={0.3} transparent />
    </mesh>
  );
}

export default function JarModel({ isActive = true }) {
  const jarRef = useRef();
  const { nodes, materials } = useGLTF('/assets/models/beaker/scene.gltf');

  const glassProps = useControls("Jar Glass Material", {
    transmission: { value: 1, min: 0, max: 1, step: 0.01 },
    thickness: { value: 0.30, min: 0, max: 2, step: 0.05 },
    roughness: { value: 0.00, min: 0, max: 1, step: 0.01 },
    chromaticAberration: { value: 0, min: 0, max: 0.5, step: 0.01 },
    anisotropy: { value: 0, min: 0, max: 1, step: 0.05 },
    distortion: { value: 0.00, min: 0, max: 1, step: 0.05 },
    distortionScale: { value: 0.00, min: 0, max: 2, step: 0.05 },
    temporalDistortion: { value: 0.00, min: 0, max: 1, step: 0.05 },
    ior: { value: 1.00, min: 1, max: 2.5, step: 0.05 },
    color: { value: "#ffffff" },
    metalness: { value: 0.00, min: 0, max: 1, step: 0.01 },
    clearcoat: { value: 1.00, min: 0, max: 1, step: 0.05 },
    clearcoatRoughness: { value: 0, min: 0, max: 1, step: 0.01 },
  });

  const { jarScale, objectSize, numSpheres, numCubes, numTorus, numTorusKnots, spawnHeight } = useControls("Jar Settings", {
    jarScale: { value: 20, min: 0.1, max: 30, step: 0.1 },
    objectSize: { value: 0.008, min: 0.005, max: 0.05, step: 0.001 },
    spawnHeight: { value: 0.03, min: 0, max: 0.5, step: 0.01 },
    numSpheres: { value: 100, min: 0, max:1000, step: 1 },
    numCubes: { value: 100, min: 0, max: 1000, step: 1 },
    numTorus: { value: 0, min: 0, max: 1000, step: 1 },
    numTorusKnots: { value: 100, min: 0, max: 1000, step: 1 },
  });

  const { colliderRadius, colliderHeight, colliderY, showColliders, wallThickness, bottomThickness, groundY, groundSize } = useControls("Physics Collider", {
    showColliders: { value: false, label: "Show Wireframes" },
    colliderRadius: { value: 0.05, min: 0.01, max: 0.2, step: 0.005 },
    colliderHeight: { value: 0.16, min: 0.05, max: 0.5, step: 0.01 },
    colliderY: { value: -0.01, min: -0.3, max: 0.3, step: 0.005 },
    wallThickness: { value: 0, min: 0.001, max: 0.02, step: 0.001 },
    bottomThickness: { value: 0.05, min: 0.001, max: 0.05, step: 0.001 },
    groundY: { value: -0.074, min: -0.5, max: 0, step: 0.01 },
    groundSize: { value: 1, min: 0.5, max: 5, step: 0.1 },
  });
  const { linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution, solverIterations } = useControls("Physics Properties", {
    linearDamping: { value: 0.95, min: 0, max: 0.99, step: 0.01 },
    angularDamping: { value: 0.95, min: 0, max: 0.99, step: 0.01 },
    sleepSpeedLimit: { value: 0.5, min: 0.01, max: 5, step: 0.1 },
    sleepTimeLimit: { value: 0.1, min: 0.01, max: 2, step: 0.01 },
    friction: { value: 0.9, min: 0, max: 1, step: 0.01 },
    restitution: { value: 0.01, min: 0, max: 1, step: 0.01 },
    solverIterations: { value: 15, min: 5, max: 100, step: 1 },
  });
  // Generate random positions for all objects within the jar bounds
  const objectsData = useMemo(() => {
    const radius = colliderRadius * 0.7; // Keep objects within jar
    const height = colliderHeight;
    const baseY = colliderY - height / 2 + objectSize * 2;
    
    const generatePosition = () => {
      const angle = Math.random() * Math.PI * 2;
      const r = Math.random() * radius;
      const y = baseY + spawnHeight + Math.random() * (height * 0.3);
      return [
        Math.cos(angle) * r,
        y,
        Math.sin(angle) * r
      ];
    };

    const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];
    
    return {
      spheres: Array.from({ length: numSpheres }, (_, i) => ({
        position: generatePosition(),
        color: colors[i % colors.length]
      })),
      cubes: Array.from({ length: numCubes }, (_, i) => ({
        position: generatePosition(),
        color: colors[(i + 1) % colors.length]
      })),
      torus: Array.from({ length: numTorus }, (_, i) => ({
        position: generatePosition(),
        color: colors[(i + 2) % colors.length]
      })),
      torusKnots: Array.from({ length: numTorusKnots }, (_, i) => ({
        position: generatePosition(),
        color: colors[(i + 3) % colors.length]
      }))
    };
  }, [numSpheres, numCubes, numTorus, numTorusKnots, colliderRadius, colliderHeight, colliderY, objectSize, spawnHeight]);

  // Subtle animation when active
  useFrame((state) => {
    if (jarRef.current && isActive) {
      jarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
  });

  return (
    <group ref={jarRef} scale={jarScale}>
      {/* Beaker geometry with glass material */}
      <mesh
        geometry={nodes.Object_10.geometry}
        position={[0, 0, 0]}
      >
        <MeshTransmissionMaterial
          {...glassProps}
          opacity={1}
          transparent={true}
        />
      </mesh>

      {/* Physics simulation */}
      <Physics gravity={[0, -0.12, 0]} iterations={solverIterations} tolerance={0.001}>
        <GroundFloor
          key={`ground-${groundY}-${groundSize}`}
          y={groundY}
          size={groundSize}
          visible={showColliders}
          friction={friction}
          restitution={restitution}
        />
        
        <JarCollider 
          key={`${colliderRadius}-${colliderHeight}-${colliderY}`}
          radius={colliderRadius} 
          height={colliderHeight} 
          y={colliderY}
          visible={showColliders}
          wallThickness={wallThickness}
          bottomThickness={bottomThickness}
          friction={friction}
          restitution={restitution}
        />
        
        {/* Render all physics objects */}
        {objectsData.spheres.map((data, i) => (
          <PhysicsSphere 
            key={`sphere-${i}`}
            position={data.position}
            size={objectSize}
            color={data.color}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            sleepSpeedLimit={sleepSpeedLimit}
            sleepTimeLimit={sleepTimeLimit}
            friction={friction}
            restitution={restitution}
          />
        ))}
        
        {objectsData.cubes.map((data, i) => (
          <PhysicsCube 
            key={`cube-${i}`}
            position={data.position}
            size={objectSize}
            color={data.color}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            sleepSpeedLimit={sleepSpeedLimit}
            sleepTimeLimit={sleepTimeLimit}
            friction={friction}
            restitution={restitution}
          />
        ))}
        
        {objectsData.torus.map((data, i) => (
          <PhysicsTorus 
            key={`torus-${i}`}
            position={data.position}
            size={objectSize}
            color={data.color}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            sleepSpeedLimit={sleepSpeedLimit}
            sleepTimeLimit={sleepTimeLimit}
            friction={friction}
            restitution={restitution}
          />
        ))}
        
        {objectsData.torusKnots.map((data, i) => (
          <PhysicsTorusKnot 
            key={`torusknot-${i}`}
            position={data.position}
            size={objectSize}
            color={data.color}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            sleepSpeedLimit={sleepSpeedLimit}
            sleepTimeLimit={sleepTimeLimit}
            friction={friction}
            restitution={restitution}
          />
        ))}
      </Physics>
    </group>
  );
}

useGLTF.preload('/assets/models/beaker/scene.gltf');