import { Physics, useCylinder, useSphere, useBox } from "@react-three/cannon";
import { MeshTransmissionMaterial, useGLTF } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useControls } from "leva";
import * as THREE from "three";
import useStore from "../stores/useStore";

// Shared materials cache - created once and reused
const COLORS = ['#ff6b6b', '#4ecdc4', '#f9ca24', '#6c5ce7'];
const sharedMaterials = COLORS.map(color => 
  new THREE.MeshStandardMaterial({ color })
);



// Shared temp object for matrix calculations - reused across all bodies
const sharedTempObject = new THREE.Object3D();

// Physics body that updates an instance matrix
function PhysicsBody({ position, size, instanceRef, instanceIndex, dirtyRef, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution, respawnY, getSpawnPosition }) {
  // Use refs for values that change but shouldn't trigger re-subscription
  const respawnYRef = useRef(respawnY);
  const getSpawnPositionRef = useRef(getSpawnPosition);
  const positionRef = useRef([0, 0, 0]);
  const quaternionRef = useRef([0, 0, 0, 1]);
  respawnYRef.current = respawnY;
  getSpawnPositionRef.current = getSpawnPosition;
  
  // Use sphere physics for text shapes (simpler collision)
  const physicsArgs = useMemo(() => {
    return [size * 0.5]; // Sphere radius for collision
  }, [size]);

  // Always use sphere physics for text shapes
  const [ref, api] = useSphere(() => ({
    mass: 1,
    position,
    args: physicsArgs,
    linearDamping,
    angularDamping,
    allowSleep: true,
    sleepSpeedLimit,
    sleepTimeLimit,
    material: { friction, restitution },
  }));

  useEffect(() => {
    if (!instanceRef.current) return;
    
    // Combined subscription - only track data, update matrix in batch
    const unsubPosition = api.position.subscribe((p) => {
      positionRef.current = p;

      // Teleport back to spawn if fallen too far
      if (p[1] < respawnYRef.current && getSpawnPositionRef.current) {
        const newPos = getSpawnPositionRef.current();
        api.position.set(newPos[0], newPos[1], newPos[2]);
        api.velocity.set(0, 0, 0);
        api.angularVelocity.set(0, 0, 0);
        return;
      }

      // Update the instance matrix using latest quaternion
      const q = quaternionRef.current;
      sharedTempObject.position.set(positionRef.current[0], positionRef.current[1], positionRef.current[2]);
      sharedTempObject.quaternion.set(q[0], q[1], q[2], q[3]);
      sharedTempObject.updateMatrix();

      if (instanceRef.current) {
        instanceRef.current.setMatrixAt(instanceIndex, sharedTempObject.matrix);
        dirtyRef.current = true;
      }
    });

    const unsubRotation = api.quaternion.subscribe((q) => {
      // Keep latest quaternion and update instance matrix
      quaternionRef.current = q;

      sharedTempObject.position.set(positionRef.current[0], positionRef.current[1], positionRef.current[2]);
      sharedTempObject.quaternion.set(q[0], q[1], q[2], q[3]);
      sharedTempObject.updateMatrix();

      if (instanceRef.current) {
        instanceRef.current.setMatrixAt(instanceIndex, sharedTempObject.matrix);
        dirtyRef.current = true;
      }
    });
    
    return () => {
      unsubPosition();
      unsubRotation();
    };
  }, [api, instanceRef, instanceIndex, dirtyRef]);

  return null;
}

// Instanced mesh component for a specific shape and color
function InstancedShapes({ 
  type, 
  geometry, 
  material, 
  objectsData, 
  maxCount,
  size,
  linearDamping, 
  angularDamping, 
  sleepSpeedLimit, 
  sleepTimeLimit, 
  friction, 
  restitution,
  respawnY,
  getSpawnPosition
}) {
  const meshRef = useRef();
  const initializedRef = useRef(new Set());
  const dirtyRef = useRef(false);
  const count = objectsData.length;
  
  // Batch update instanceMatrix.needsUpdate ONCE per frame
  useFrame(() => {
    if (dirtyRef.current && meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true;
      dirtyRef.current = false;
    }
  });

  // Mark instanceMatrix as dynamic for frequent updates
  useEffect(() => {
    if (meshRef.current && meshRef.current.instanceMatrix) {
      meshRef.current.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    }
  }, []);
  
  // Initialize only NEW instance positions (not all of them)
  // Also hide unused instances by scaling to 0
  useEffect(() => {
    if (!meshRef.current) return;
    
    const tempObject = new THREE.Object3D();
    
    // Hide ALL instances first (scale to 0)
    for (let i = 0; i < maxCount; i++) {
      if (!initializedRef.current.has(i)) {
        tempObject.position.set(0, -1000, 0);
        tempObject.scale.set(0, 0, 0);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
      }
    }
    
    // Then set up actual objects
    objectsData.forEach((data, i) => {
      // Only initialize if we haven't seen this index before
      if (!initializedRef.current.has(i)) {
        tempObject.position.set(...data.position);
        tempObject.scale.set(1, 1, 1);
        tempObject.updateMatrix();
        meshRef.current.setMatrixAt(i, tempObject.matrix);
        initializedRef.current.add(i);
      }
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [objectsData, count, maxCount]);

  // Use maxCount for stable mesh allocation
  if (maxCount === 0) return null;

  return (
    <>
      <instancedMesh 
        ref={meshRef} 
        args={[geometry, material, maxCount]} 
        castShadow
        frustumCulled={false}
      />
      {objectsData.map((data, i) => (
        <PhysicsBody
          key={data.id}
          position={data.position}
          size={size}
          instanceRef={meshRef}
          instanceIndex={i}
          dirtyRef={dirtyRef}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          respawnY={respawnY}
          getSpawnPosition={getSpawnPosition}
        />
      ))}
    </>
  );
}

// Groups instances by color for efficient rendering
function InstancedShapeGroup({
  type,
  geometry,
  allObjectsData,
  maxCountPerColor,
  size,
  linearDamping,
  angularDamping,
  sleepSpeedLimit,
  sleepTimeLimit,
  friction,
  restitution,
  respawnY,
  getSpawnPosition
}) {
  // Group objects by color index (backwards-compatible with older objects that stored color strings)
  const groupedByColor = useMemo(() => {
    const groups = COLORS.map(() => []);
    allObjectsData.forEach((data) => {
      const colorIndex = (typeof data.colorIndex === 'number') ? data.colorIndex : COLORS.indexOf(data.color);
      if (colorIndex >= 0 && colorIndex < COLORS.length) {
        groups[colorIndex].push(data);
      }
    });
    return groups;
  }, [allObjectsData]);


  return (
    <>
      {COLORS.map((_, colorIndex) => (
        <InstancedShapes
          key={`${type}-color-${colorIndex}`}
          type={type}
          geometry={geometry}
          material={sharedMaterials[colorIndex]}
          objectsData={groupedByColor[colorIndex]}
          maxCount={maxCountPerColor}
          size={size}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          respawnY={respawnY}
          getSpawnPosition={getSpawnPosition}
        />
      ))}
    </>
  );
}

// Shared debug materials for colliders
const debugMaterials = {
  cyan: new THREE.MeshBasicMaterial({ color: "cyan", wireframe: true, opacity: 0.3, transparent: true }),
  lime: new THREE.MeshBasicMaterial({ color: "lime", wireframe: true, opacity: 0.3, transparent: true }),
  orange: new THREE.MeshBasicMaterial({ color: "orange", wireframe: true, opacity: 0.3, transparent: true }),
};

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
      material={debugMaterials.cyan}
    >
      <boxGeometry args={[segmentWidth, height, wallThickness]} />
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
      <mesh ref={bottomRef} position={[0, y - height / 2, 0]} visible={visible} material={debugMaterials.lime}>
        <cylinderGeometry args={[radius, radius, bottomThickness, 16]} />
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

export default function JarModel({ isActive = true }) {
  const jarRef = useRef();
  const jarMeshRef = useRef();
  const { nodes, materials } = useGLTF('/assets/models/beaker/scene.gltf');
  
  // Tilt animation state
  const isTilting = useStore((state) => state.isTilting);
  const tiltStartTime = useStore((state) => state.tiltStartTime);
  const [gravity, setGravity] = useState([0, -0.12, 0]);

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

  // Leva controls for the palette used by instanced shapes (dynamic based on COLORS length)
  const paletteControlsConfig = useMemo(() => {
    const cfg = {};
    for (let i = 0; i < COLORS.length; i++) {
      cfg[`color${i}`] = { value: COLORS[i] };
    }
    return cfg;
  }, [COLORS.length]);

  const colorControls = useControls("Shape Colors", paletteControlsConfig);

  // Keep the runtime palette and shared materials in sync when controls change
  useEffect(() => {
    for (let i = 0; i < COLORS.length; i++) {
      const key = `color${i}`;
      const newColor = colorControls[key];
      if (newColor && newColor !== COLORS[i]) {
        COLORS[i] = newColor;
        if (sharedMaterials[i]) {
          sharedMaterials[i].color.set(newColor);
        } else {
          sharedMaterials[i] = new THREE.MeshStandardMaterial({ color: newColor });
        }
      }
    }

    // Trim any extra sharedMaterials if COLORS was reduced elsewhere
    if (sharedMaterials.length > COLORS.length) {
      sharedMaterials.length = COLORS.length;
    }
  }, [colorControls]);

  const { jarScale, objectSize, maxObjects, spawnHeight, streamSpeed, streamSpacing, despawnY } = useControls("Jar Settings", {
    jarScale: { value: 20, min: 0.1, max: 30, step: 0.1 },
    objectSize: { value: 0.015, min: 0.005, max: 0.05, step: 0.001 },
    spawnHeight: { value: 0.35, min: 0, max: 0.5, step: 0.01 },
    maxObjects: { value: 300, min: 10, max: 2000, step: 10, label: "Max Objects" },
    streamSpeed: { value: 10, min: 0.5, max: 30, step: 0.5, label: "Stream Speed (objects/sec)" },
    streamSpacing: { value: 0.1, min: 0.005, max: 0.1, step: 0.005, label: "Stream Spacing" },
    despawnY: { value: -7, min: -10, max: 0, step: 0.1, label: "Despawn Y Level" },
  });

  const { colliderRadius, colliderHeight, colliderY, showColliders, wallThickness, bottomThickness } = useControls("Physics Collider", {
    showColliders: { value: false, label: "Show Wireframes" },
    colliderRadius: { value: 0.045, min: 0.01, max: 0.2, step: 0.005 },
    colliderHeight: { value: 0.16, min: 0.05, max: 0.5, step: 0.01 },
    colliderY: { value: -0.01, min: -0.3, max: 0.3, step: 0.005 },
    wallThickness: { value: 0, min: 0.001, max: 0.02, step: 0.001 },
    bottomThickness: { value: 0.05, min: 0.001, max: 0.05, step: 0.001 },
  });
  const { linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution, solverIterations } = useControls("Physics Properties", {
    linearDamping: { value: 0.95, min: 0, max: 0.99, step: 0.01 },
    angularDamping: { value: 0.95, min: 0, max: 0.99, step: 0.01 },
    sleepSpeedLimit: { value: 1.0, min: 0.01, max: 5, step: 0.1 },
    sleepTimeLimit: { value: 0.05, min: 0.01, max: 2, step: 0.01 },
    friction: { value: 0.9, min: 0, max: 1, step: 0.01 },
    restitution: { value: 0.01, min: 0, max: 1, step: 0.01 },
    solverIterations: { value: 10, min: 5, max: 100, step: 1 },
  });


  // Shape types for random selection - now just cube, sphere, torus
  const SHAPE_TYPES = ['cube', 'sphere', 'torus'];
  

  // Track spawned objects state - now a flat array with type info
  const [spawnedObjects, setSpawnedObjects] = useState([]);
  const nextIdRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);

  // Generate spawn position for streaming (from above, centered with slight randomness)
  const generateStreamPosition = useCallback(() => {
    const radius = colliderRadius * 0.3; // Tighter spawn radius for stream effect
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * radius;
    const baseY = colliderY + colliderHeight / 2 + spawnHeight; // Start above the jar
    return [
      Math.cos(angle) * r,
      baseY,
      Math.sin(angle) * r
    ];
  }, [colliderRadius, colliderHeight, colliderY, spawnHeight]);


  // Create a new random object
  const createRandomObject = useCallback(() => {
    const type = SHAPE_TYPES[Math.floor(Math.random() * SHAPE_TYPES.length)];
    const colorIndex = Math.floor(Math.random() * COLORS.length);
    const color = COLORS[colorIndex];
    const id = nextIdRef.current++;
    return {
      id,
      type,
      color,
      colorIndex,
      position: generateStreamPosition()
    };
  }, [generateStreamPosition]);


  // Group spawned objects by type for rendering
  const objectsByType = useMemo(() => {
    const grouped = {
      cube: [],
      sphere: [],
      torus: []
    };
    spawnedObjects.forEach(obj => {
      if (grouped[obj.type]) {
        grouped[obj.type].push(obj);
      }
    });
    return grouped;
  }, [spawnedObjects]);


  // Memoize geometries for shapes
  const cubeGeometry = useMemo(() => new THREE.BoxGeometry(objectSize, objectSize, objectSize), [objectSize]);
  const sphereGeometry = useMemo(() => new THREE.SphereGeometry(objectSize * 0.5, 24, 24), [objectSize]);
  const torusGeometry = useMemo(() => new THREE.TorusGeometry(objectSize * 0.5, objectSize * 0.18, 16, 32), [objectSize]);
  
  // Memoize respawnY to prevent unnecessary recalculations
  const respawnY = useMemo(() => despawnY / jarScale, [despawnY, jarScale]);
  
  // Calculate max count per color per type (divide by 3 types and palette size)
  const maxCountPerColor = useMemo(() => Math.ceil(maxObjects / (3 * COLORS.length)), [maxObjects]);

  // Smooth tilt animation - affects gravity for physics and jar visual rotation
  useFrame((state, delta) => {
    if (jarRef.current && isActive) {
      jarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
    
    // Stream spawning logic - spawn if under max count
    const currentCount = spawnedObjects.length;
    if (currentCount < maxObjects) {
      const spawnInterval = 1 / streamSpeed; // Time between spawns
      lastSpawnTimeRef.current += delta;
      
      // Spawn multiple objects per frame if needed (for high speeds)
      const objectsToAdd = [];
      while (lastSpawnTimeRef.current >= spawnInterval && (currentCount + objectsToAdd.length) < maxObjects) {
        objectsToAdd.push(createRandomObject());
        lastSpawnTimeRef.current -= spawnInterval;
      }
      
      if (objectsToAdd.length > 0) {
        setSpawnedObjects(prev => [...prev, ...objectsToAdd]);
      }
    }
    
    if (isTilting) {
      const elapsed = (Date.now() - tiltStartTime) / 1000; // seconds
      const duration = 1.5;
      const progress = Math.min(elapsed / duration, 1);
      
      // Smooth oscillation that fades out
      const tiltAmount = 0.5 * Math.sin(elapsed * 8) * (1 - progress);
      const baseGravity = 0.12;
      
      // Tilt gravity vector
      const gx = Math.sin(tiltAmount) * baseGravity;
      const gy = -Math.cos(tiltAmount) * baseGravity;
      
      setGravity([gx, gy, 0]);
      
      // Visually tilt the jar mesh to match
      if (jarMeshRef.current) {
        jarMeshRef.current.rotation.z = tiltAmount * 0.5;
      }
    } else {
      // Reset to default gravity
      setGravity([0, -0.2, 0]);
      if (jarMeshRef.current) {
        jarMeshRef.current.rotation.z = 0;
      }
    }
  });

  return (
    <group ref={jarRef} scale={jarScale}>
      {/* Beaker geometry with glass material - wrapped in group for shake */}
      <group ref={jarMeshRef}>
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
      </group>

      {/* Physics simulation */}
      <Physics 
        gravity={gravity} 
        iterations={solverIterations} 
        tolerance={0.001}
        stepSize={1/60}
        maxSubSteps={3}
      >
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
        
        {/* Render instanced physics objects - cube, sphere, torus */}
        <InstancedShapeGroup
          type="cube"
          geometry={cubeGeometry}
          allObjectsData={objectsByType.cube}
          maxCountPerColor={maxCountPerColor}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          respawnY={respawnY}
          getSpawnPosition={generateStreamPosition}
        />
        <InstancedShapeGroup
          type="sphere"
          geometry={sphereGeometry}
          allObjectsData={objectsByType.sphere}
          maxCountPerColor={maxCountPerColor}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          respawnY={respawnY}
          getSpawnPosition={generateStreamPosition}
        />
        <InstancedShapeGroup
          type="torus"
          geometry={torusGeometry}
          allObjectsData={objectsByType.torus}
          maxCountPerColor={maxCountPerColor}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          respawnY={respawnY}
          getSpawnPosition={generateStreamPosition}
        />
      </Physics>
    </group>
  );
}

useGLTF.preload('/assets/models/beaker/scene.gltf');