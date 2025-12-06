import WobbleShaderMaterial from "./shaderMaterial"
import { useControls } from "leva"
import { useMouseTracking } from "../../hooks/useMouseTracking"
import { useEffect } from "react"
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils"

export default function WobbleSphere({ visible = true, scale = 1.7, position = [0, 0, 0] }) {
  const trackedRef = useMouseTracking()

  const sphereControls = useControls('WobbleSphere', {
    scale: {
      value: scale,
      min: 0.1,
      max: 3,
      step: 0.1,
    },
    radius: {
      value: 1.3,
      min: 0.1,
      max: 2,
      step: 0.1,
    },
    detail: {
      value: 30,
      min: 1,
      max: 30,
      step: 1,
    },
  })

  useEffect(() => {
    if (trackedRef.current?.geometry) {
      trackedRef.current.geometry = mergeVertices(trackedRef.current.geometry)
      trackedRef.current.geometry.computeTangents()
    }
  }, [])

  return (
    <mesh ref={trackedRef} position={position} scale={sphereControls.scale} visible={visible} castShadow receiveShadow>
      <icosahedronGeometry 
        args={[sphereControls.radius, sphereControls.detail]}
      />
      <WobbleShaderMaterial/>
    </mesh>
  )
}