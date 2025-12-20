import { useControls } from "leva"
import { useEffect, useRef } from "react"

const defaultLighting = {
    directional: {
        position: [0, 1, 0],
        intensity: 10
    },
    ambient: {
        intensity: 1
    }
}

export const modelLightingPresets = {
    phone: {
        directional: {
            position: [-1.2, 1, 0.4],
            intensity: 6
        },
        ambient: {
            intensity: 6
        }
    },
    aws: {
        directional: {
            position: [1, 1, 0.5],
            intensity: 0
        },
        ambient: {
            intensity: 4
        }
    }
}

export default function Lights({ modelLighting = null })
{
    const lightingConfig = modelLighting || defaultLighting
    const directionalRef = useRef(null)
    const ambientRef = useRef(null)

    return <>
        <directionalLight
            ref={directionalRef}
            castShadow
            position={lightingConfig.directional.position}
            intensity={lightingConfig.directional.intensity}
        />
        <ambientLight ref={ambientRef} intensity={ lightingConfig.ambient.intensity } />
    </>
}
