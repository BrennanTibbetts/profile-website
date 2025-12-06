import { useControls } from "leva"
import { useEffect, useRef } from "react"

const defaultLighting = {
    directional: {
        position: [0, 1, 0],
        intensity: 20
    },
    ambient: {
        intensity: 13
    }
}

export const modelLightingPresets = {
    phone: {
        directional: {
            position: [-1.2, 1, 0.4],
            intensity: 13
        },
        ambient: {
            intensity: 7
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
    },
    wobbleSphere: {
        directional: {
            position: [-1, 1, 0],
            intensity: 10
        },
        ambient: {
            intensity: 0
        }
    }
}

export default function Lights({ modelLighting = null })
{
    const lightingConfig = modelLighting || defaultLighting
    const directionalRef = useRef(null)
    const ambientRef = useRef(null)

    const directionalLightControls = useControls('Directional Light', {
        position: {
            value: [0, 1, 0],
            step: 0.1
        },
        intensity: {
            value: 20,
            min: 0,
            max: 50,
            step: 1
        }
    })

    const ambientLightControls = useControls('Ambient Light', {
        intensity: {
            value: 13,
            min: 0,
            max: 20,
            step: 1
        }
    })

    // Update lights when modelLighting prop changes
    useEffect(() => {
        if (directionalRef.current) {
            directionalRef.current.position.fromArray(lightingConfig.directional.position)
            directionalRef.current.intensity = lightingConfig.directional.intensity
        }
        if (ambientRef.current) {
            ambientRef.current.intensity = lightingConfig.ambient.intensity
        }
    }, [modelLighting])

    return <>
        <directionalLight
            ref={directionalRef}
            castShadow
            position={directionalLightControls.position}
            intensity={directionalLightControls.intensity}
        />
        <ambientLight ref={ambientRef} intensity={ ambientLightControls.intensity } />
    </>
}
