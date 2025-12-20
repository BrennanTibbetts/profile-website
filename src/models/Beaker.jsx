import React, { useRef } from 'react'
import { useGLTF } from '@react-three/drei'

export function Beaker(props) {
  const { nodes, materials } = useGLTF('/assets/models/beaker/scene.gltf')
  return (
    <group {...props} dispose={null}>
      <mesh
        castShadow
        receiveShadow
        geometry={nodes.Object_10.geometry}
        material={materials.material_0}
        position={[0, 0, 0]}
      />
    </group>
  )
}

useGLTF.preload('/assets/models/beaker/scene.gltf')