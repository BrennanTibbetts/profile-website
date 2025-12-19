import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

export function useMouseTracking(forwardAxis = new THREE.Vector3(1, 0, 0), rotationOffset = new THREE.Quaternion(), isActive = true) {
  const ref = useRef()

  useFrame((state) => {
    if (ref.current) {
      const targetQuaternion = new THREE.Quaternion()
      
      if (isActive) {
        const mouse = state.mouse
        const mouseWorldX = mouse.x * 10
        const mouseWorldY = 1
        const mouseWorldZ = 6

        const direction = new THREE.Vector3(mouseWorldX, mouseWorldY, mouseWorldZ)
        direction.normalize()
        
        targetQuaternion.setFromUnitVectors(forwardAxis, direction)
        targetQuaternion.multiplyQuaternions(targetQuaternion, rotationOffset)
      } else {
        // If not active, just use the offset (neutral position)
        // We need to construct the neutral quaternion. 
        // The logic above does: target = (rotation to look at mouse) * offset.
        // If we want "neutral", we probably just want the object to face "forward" relative to its parent, 
        // but the hook seems to be designed to make it look at the mouse.
        // If we assume "neutral" is just the rotationOffset applied to a default forward vector?
        // Actually, let's look at how it's used. 
        // Phone: forward (1,0,0), offset (-0.16, 0, 0.03).
        // If mouse is at (0,0,1) (center screen roughly), direction is (0, ~0, 1).
        // forward (1,0,0) -> direction (0,0,1) is -90 deg Y rotation.
        
        // Let's just lerp to the rotationOffset if that represents the "base" state, 
        // OR just stop updating if we want it to freeze. 
        // But "doesn't apply" usually means "reset to default".
        // Let's try to make it look "forward" (0,0,1) which is where the camera is.
        
        const direction = new THREE.Vector3(0, 0, 1) // Look at camera
        targetQuaternion.setFromUnitVectors(forwardAxis, direction)
        targetQuaternion.multiplyQuaternions(targetQuaternion, rotationOffset)
      }
      
      const currentQuat = new THREE.Quaternion().setFromEuler(ref.current.rotation)
      currentQuat.slerp(targetQuaternion, 0.05)
      ref.current.quaternion.copy(currentQuat)
    }
  })

  return ref
}
