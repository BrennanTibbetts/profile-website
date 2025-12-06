import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export function useMouseTracking(forwardAxis = new THREE.Vector3(1, 0, 0), rotationOffset = new THREE.Quaternion()) {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      const mouse = state.mouse
      const mouseWorldX = mouse.x * 10
      const mouseWorldY = 1
      const mouseWorldZ = 6

      const direction = new THREE.Vector3(mouseWorldX, mouseWorldY, mouseWorldZ)
      direction.normalize()
      
      const targetQuaternion = new THREE.Quaternion()
      targetQuaternion.setFromUnitVectors(forwardAxis, direction)
      targetQuaternion.multiplyQuaternions(targetQuaternion, rotationOffset)
      
      const currentQuat = new THREE.Quaternion().setFromEuler(ref.current.rotation)
      currentQuat.slerp(targetQuaternion, 0.05)
      ref.current.quaternion.copy(currentQuat)
    }
  })

  return ref
}
