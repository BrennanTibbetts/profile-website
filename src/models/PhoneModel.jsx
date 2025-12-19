import { useGLTF } from '@react-three/drei'
import { useRef } from 'react'
import { useMouseTracking } from '../hooks/useMouseTracking'
import * as THREE from 'three'

export function PhoneModel({ isActive = true, ...props }) {
  const { nodes, materials } = useGLTF('/assets/models/phone/scene.gltf')
  const phoneOffset = new THREE.Quaternion()
  phoneOffset.setFromEuler(new THREE.Euler(-0.16, 0, 0.03))
  const phoneRef = useMouseTracking(new THREE.Vector3(1, 0, 0), phoneOffset, isActive)

  return (
    <group {...props} dispose={null} ref={phoneRef}>
      <group position={[-0.104, 1.448, -0.258]} scale={0.04}>
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_4.geometry}
              material={materials['Material.001']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_5.geometry}
              material={materials.Black}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_6.geometry}
              material={materials.Back}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_7.geometry}
              material={materials.GOLD}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_8.geometry}
              material={materials.BARRES}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_9.geometry}
              material={materials.Labber}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_10.geometry}
              material={materials.GLASS}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_11.geometry}
              material={materials.Lenscover}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_12.geometry}
              material={materials.material}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_13.geometry}
              material={materials.Display}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_14.geometry}
              material={materials['Lens.2']}
            />
            <mesh
              castShadow
              receiveShadow
              geometry={nodes.Object_15.geometry}
              material={materials.material_11}
            />
          </group>
    </group>
  )
}

useGLTF.preload('/assets/phone/scene.gltf')