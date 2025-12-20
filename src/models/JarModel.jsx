import { Physics, useCylinder, useSphere, useBox } from "@react-three/cannon";

function PhysicsSphere() {
  const [ref] = useSphere(() => ({
    mass: 1,
    position: [0, 1.5, 0],
    args: [0.15],
  }));

  return (
    <mesh ref={ref} castShadow>
      <sphereGeometry args={[0.15, 32, 32]} />
      <meshStandardMaterial color="hotpink" />
    </mesh>
  );
}

function PhysicsCube() {
  const [ref] = useBox(() => ({
    mass: 1,
    position: [0, 2, 0],
    args: [0.25, 0.25, 0.25],
  }));

  return (
    <mesh ref={ref} castShadow>
      <boxGeometry args={[0.25, 0.25, 0.25]} />
      <meshStandardMaterial color="cyan" />
    </mesh>
  );
}

function JarWalls() {
  const radius = 0.5;
  const height = 2;
  
  // Bottom
  useCylinder(() => ({
    type: "Static",
    position: [0, -0.05, 0],
    args: [radius, radius, 0.1, 16],
  }));

  // Cylindrical wall (using multiple segments for collision)
  const segments = 16;
  for (let i = 0; i < segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const x = Math.sin(angle) * radius;
    const z = Math.cos(angle) * radius;
    
    useBox(() => ({
      type: "Static",
      position: [x, height / 2, z],
      args: [0.1, height, 0.1],
    }));
  }

  return null;
}

export default function JarModel() {
  return (
    <group>
      {/* Visible cylinder jar */}
      <mesh position={[0, 1, 0]}>
        <cylinderGeometry args={[0.5, 0.5, 2, 32, 1, true]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent 
          opacity={0.3}
          side={2}
          depthWrite={false}
        />
      </mesh>
      
      {/* Bottom of jar */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 32]} />
        <meshStandardMaterial 
          color="#88ccff" 
          transparent 
          opacity={0.3}
        />
      </mesh>

      {/* Physics simulation */}
      <Physics gravity={[0, -9.81, 0]}>
        <JarWalls />
        <PhysicsSphere />
        <PhysicsCube />
      </Physics>
    </group>
  );
}