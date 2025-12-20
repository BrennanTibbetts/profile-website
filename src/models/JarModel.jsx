import { Physics, useCylinder, useSphere, useBox, usePlane, useCompoundBody } from "@react-three/cannon";
import { MeshTransmissionMaterial, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useRef, useMemo, useEffect, useState, useCallback } from "react";
import { useControls } from "leva";
import * as THREE from "three";
import useStore from "../stores/useStore";

// Shared materials cache - created once and reused
const COLORS = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f9ca24', '#6c5ce7', '#fd79a8'];
const sharedMaterials = COLORS.map(color => 
  new THREE.MeshStandardMaterial({ color })
);

// Shared geometries - created once and reused
const sharedGeometries = {
  sphere: null,
  cube: null,
  torus: null,
  torusKnot: null,
};

function getSharedGeometries(size) {
  if (!sharedGeometries.sphere || sharedGeometries._size !== size) {
    sharedGeometries.sphere = new THREE.SphereGeometry(size, 16, 16);
    sharedGeometries.cube = new THREE.BoxGeometry(size, size, size);
    sharedGeometries.torus = new THREE.TorusGeometry(size * 0.5, size * 0.25, 12, 24);
    sharedGeometries.torusKnot = new THREE.TorusKnotGeometry(size * 0.4, size * 0.15, 32, 8);
    sharedGeometries._size = size;
  }
  return sharedGeometries;
}

// Physics body that updates an instance matrix
function PhysicsBody({ type, position, size, instanceRef, instanceIndex, linearDamping, angularDamping, sleepSpeedLimit, sleepTimeLimit, friction, restitution, onPositionUpdate, objectId }) {
  const tempObject = useMemo(() => new THREE.Object3D(), []);
  
  const physicsArgs = useMemo(() => {
    switch (type) {
      case 'sphere': return [size];
      case 'cube': return [size, size, size];
      case 'torus': return [size * 0.7];
      case 'torusKnot': return [size * 0.8];
      default: return [size];
    }
  }, [type, size]);

  const usePhysicsHook = type === 'cube' ? useBox : useSphere;
  
  const [ref, api] = usePhysicsHook(() => ({
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
    
    const unsubPosition = api.position.subscribe((p) => {
      tempObject.position.set(p[0], p[1], p[2]);
      // Report position back to parent for despawn check
      if (onPositionUpdate) {
        onPositionUpdate(objectId, p[1]);
      }
    });
    
    const unsubRotation = api.quaternion.subscribe((q) => {
      tempObject.quaternion.set(q[0], q[1], q[2], q[3]);
      tempObject.updateMatrix();
      if (instanceRef.current) {
        instanceRef.current.setMatrixAt(instanceIndex, tempObject.matrix);
        instanceRef.current.instanceMatrix.needsUpdate = true;
      }
    });
    
    return () => {
      unsubPosition();
      unsubRotation();
    };
  }, [api, instanceRef, instanceIndex, tempObject, onPositionUpdate, objectId]);

  return null;
}

// Instanced mesh component for a specific shape and color
function InstancedShapes({ 
  type, 
  geometry, 
  material, 
  objectsData, 
  size,
  linearDamping, 
  angularDamping, 
  sleepSpeedLimit, 
  sleepTimeLimit, 
  friction, 
  restitution,
  onPositionUpdate
}) {
  const meshRef = useRef();
  const count = objectsData.length;
  
  // Initialize instance positions
  useEffect(() => {
    if (!meshRef.current || count === 0) return;
    
    const tempObject = new THREE.Object3D();
    objectsData.forEach((data, i) => {
      tempObject.position.set(...data.position);
      tempObject.updateMatrix();
      meshRef.current.setMatrixAt(i, tempObject.matrix);
    });
    meshRef.current.instanceMatrix.needsUpdate = true;
  }, [objectsData, count]);

  if (count === 0) return null;

  return (
    <>
      <instancedMesh 
        ref={meshRef} 
        args={[geometry, material, count]} 
        castShadow
        frustumCulled={false}
      />
      {objectsData.map((data, i) => (
        <PhysicsBody
          key={data.id}
          type={type}
          position={data.position}
          size={size}
          instanceRef={meshRef}
          instanceIndex={i}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          onPositionUpdate={onPositionUpdate}
          objectId={data.id}
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
  size,
  linearDamping,
  angularDamping,
  sleepSpeedLimit,
  sleepTimeLimit,
  friction,
  restitution,
  onPositionUpdate
}) {
  // Group objects by color index
  const groupedByColor = useMemo(() => {
    const groups = COLORS.map(() => []);
    allObjectsData.forEach((data) => {
      const colorIndex = COLORS.indexOf(data.color);
      if (colorIndex !== -1) {
        groups[colorIndex].push(data);
      }
    });
    return groups;
  }, [allObjectsData]);

  return (
    <>
      {groupedByColor.map((objectsData, colorIndex) => (
        objectsData.length > 0 && (
          <InstancedShapes
            key={`${type}-color-${colorIndex}`}
            type={type}
            geometry={geometry}
            material={sharedMaterials[colorIndex]}
            objectsData={objectsData}
            size={size}
            linearDamping={linearDamping}
            angularDamping={angularDamping}
            sleepSpeedLimit={sleepSpeedLimit}
            sleepTimeLimit={sleepTimeLimit}
            friction={friction}
            restitution={restitution}
            onPositionUpdate={onPositionUpdate}
          />
        )
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
    <mesh ref={ref} position={[0, y, 0]} visible={visible} receiveShadow material={debugMaterials.orange}>
      <boxGeometry args={[size, 0.01, size]} />
    </mesh>
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

  const { jarScale, objectSize, maxObjects, spawnHeight, streamSpeed, streamSpacing, despawnY } = useControls("Jar Settings", {
    jarScale: { value: 20, min: 0.1, max: 30, step: 0.1 },
    objectSize: { value: 0.008, min: 0.005, max: 0.05, step: 0.001 },
    spawnHeight: { value: 0.25, min: 0, max: 0.5, step: 0.01 },
    maxObjects: { value: 500, min: 10, max: 2000, step: 10, label: "Max Objects" },
    streamSpeed: { value: 3, min: 0.5, max: 30, step: 0.5, label: "Stream Speed (objects/sec)" },
    streamSpacing: { value: 0.02, min: 0.005, max: 0.1, step: 0.005, label: "Stream Spacing" },
    despawnY: { value: -3, min: -5, max: 0, step: 0.1, label: "Despawn Y Level" },
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

  // Shape types for random selection
  const SHAPE_TYPES = ['sphere', 'cube', 'torusKnot'];
  
  // Track spawned objects state - now a flat array with type info
  const [spawnedObjects, setSpawnedObjects] = useState([]);
  const nextIdRef = useRef(0);
  const lastSpawnTimeRef = useRef(0);
  const objectPositionsRef = useRef(new Map()); // Track y positions for despawn
  const objectsToRemoveRef = useRef(new Set()); // Buffer for objects to remove
  
  // Position update callback - track positions for despawn check
  const handlePositionUpdate = useCallback((objectId, yPosition) => {
    objectPositionsRef.current.set(objectId, yPosition);
  }, []);

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
    const color = COLORS[Math.floor(Math.random() * COLORS.length)];
    const id = nextIdRef.current++;
    
    return {
      id,
      type,
      color,
      position: generateStreamPosition()
    };
  }, [generateStreamPosition]);

  // Group spawned objects by type for rendering
  const objectsByType = useMemo(() => {
    const grouped = {
      sphere: [],
      cube: [],
      torus: [],
      torusKnot: []
    };
    spawnedObjects.forEach(obj => {
      if (grouped[obj.type]) {
        grouped[obj.type].push(obj);
      }
    });
    return grouped;
  }, [spawnedObjects]);

  // Get shared geometries for the current object size
  const geometries = useMemo(() => getSharedGeometries(objectSize), [objectSize]);

  // Smooth tilt animation - affects gravity for physics and jar visual rotation
  useFrame((state, delta) => {
    if (jarRef.current && isActive) {
      jarRef.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.3) * 0.05;
    }
    
    // Check for objects to despawn (y < despawnY in world space)
    const scaledDespawnY = despawnY / jarScale; // Convert world Y to local Y
    objectPositionsRef.current.forEach((yPos, id) => {
      if (yPos < scaledDespawnY) {
        objectsToRemoveRef.current.add(id);
      }
    });
    
    // Remove despawned objects
    if (objectsToRemoveRef.current.size > 0) {
      const toRemove = objectsToRemoveRef.current;
      setSpawnedObjects(prev => prev.filter(obj => !toRemove.has(obj.id)));
      // Clean up position tracking
      toRemove.forEach(id => objectPositionsRef.current.delete(id));
      objectsToRemoveRef.current = new Set();
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
      setGravity([0, -0.12, 0]);
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
        stepSize={1/120}
        maxSubSteps={10}
      >
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
        
        {/* Render instanced physics objects */}
        <InstancedShapeGroup
          type="sphere"
          geometry={geometries.sphere}
          allObjectsData={objectsByType.sphere}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          onPositionUpdate={handlePositionUpdate}
        />
        
        <InstancedShapeGroup
          type="cube"
          geometry={geometries.cube}
          allObjectsData={objectsByType.cube}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          onPositionUpdate={handlePositionUpdate}
        />
        
        <InstancedShapeGroup
          type="torus"
          geometry={geometries.torus}
          allObjectsData={objectsByType.torus}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          onPositionUpdate={handlePositionUpdate}
        />
        
        <InstancedShapeGroup
          type="torusKnot"
          geometry={geometries.torusKnot}
          allObjectsData={objectsByType.torusKnot}
          size={objectSize}
          linearDamping={linearDamping}
          angularDamping={angularDamping}
          sleepSpeedLimit={sleepSpeedLimit}
          sleepTimeLimit={sleepTimeLimit}
          friction={friction}
          restitution={restitution}
          onPositionUpdate={handlePositionUpdate}
        />
      </Physics>
    </group>
  );
}

useGLTF.preload('/assets/models/beaker/scene.gltf');