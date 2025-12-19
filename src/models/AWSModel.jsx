import React, { useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { useMouseTracking } from '../hooks/useMouseTracking'

export function AWSModel({ theme = 'dark', isActive = true, ...props }) {
  const { nodes, materials } = useGLTF('/assets/models/aws/scene.gltf')
  const modelOffset = new THREE.Quaternion()
  modelOffset.setFromEuler(new THREE.Euler(0.1, 0, 0))
  const modelRef = useMouseTracking(new THREE.Vector3(0, 0, 1), modelOffset, isActive)

  // Create new materials based on theme
  const arrowMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: '#FF9500', // Orange
      metalness: 0.3,
      roughness: 0.4,
      emissive: '#FF6600',
      emissiveIntensity: 0.2
    })
  }, [])

  const textMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: theme === 'dark' ? '#ffffff' : '#000000', // White for light, black for dark
      metalness: 0.2,
      roughness: 0.6,
      emissive: theme === 'dark' ? '#000000' : '#ffffff',
      emissiveIntensity: 0.05
    })
  }, [theme])

  return (
    <group {...props} dispose={null} ref={modelRef}>
      <group scale={0.01}>
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.ArrowBody_Material001_0.geometry}
          material={arrowMaterial}
          position={[-13.076, 155.698, -20.264]}
          scale={16067.461}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.AWS_Material003_0.geometry}
          material={textMaterial}
          position={[41.538, 612.01, -20.264]}
          scale={16067.461}
        />
        <mesh
          castShadow
          receiveShadow
          geometry={nodes.ArrowHead_Material001_0.geometry}
          material={arrowMaterial}
          position={[593.304, 205.677, -20.264]}
          scale={16067.461}
        />
      </group>
    </group>
  )
}

useGLTF.preload('/assets/models/aws/scene.gltf')
