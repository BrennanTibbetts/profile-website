import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export function useMouseTracking(
  forwardAxis = new THREE.Vector3(1, 0, 0),
  rotationOffset = new THREE.Quaternion(),
  isActive = true,
  enabled = true
) {
  const ref = useRef()
  const targetQuaternionRef = useRef(new THREE.Quaternion())
  const currentQuaternionRef = useRef(new THREE.Quaternion())
  const directionRef = useRef(new THREE.Vector3())
  const initializedNeutralRef = useRef(false)

  useFrame((state) => {
    if (!ref.current) {
      return
    }

    const targetQuaternion = targetQuaternionRef.current
    const currentQuaternion = currentQuaternionRef.current
    const direction = directionRef.current

    if (enabled && isActive) {
      const mouse = state.mouse
      direction.set(mouse.x * 10, 1, 6).normalize()
      initializedNeutralRef.current = false
    } else {
      if (!enabled && initializedNeutralRef.current) {
        return
      }
      direction.set(0, 0, 1)
      initializedNeutralRef.current = true
    }

    targetQuaternion.setFromUnitVectors(forwardAxis, direction)
    targetQuaternion.multiply(rotationOffset)
    currentQuaternion.copy(ref.current.quaternion)
    currentQuaternion.slerp(targetQuaternion, 0.05)
    ref.current.quaternion.copy(currentQuaternion)
  })

  return ref
}
