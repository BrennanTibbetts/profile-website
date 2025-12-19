import { useControls } from 'leva'
import { useState, useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Lights, { modelLightingPresets } from './Lights.jsx'
import { PhoneModel } from './models/PhoneModel.jsx'
import { Perf } from 'r3f-perf'
import { AWSModel } from './models/AWSModel.jsx'
import WobbleSphere from './models/wobbleSphere/WobbleSphere.jsx'

export default function Experience({ slideIndex = 1, setSlideIndex, theme = 'dark', onModelClick })
{
  const viewIndex = ((slideIndex % 3) + 3) % 3
  const { gl } = useThree()
  const groupRef = useRef()
  const isDragging = useRef(false)
  const startX = useRef(0)
  const dragOffset = useRef(0)
  const isClick = useRef(true)
  
  const props = useControls('Experience', {
    backgroundColor: '#000000',
    performance: false 
  })

    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768)
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    // Drag Logic
    useEffect(() => {
        const canvas = gl.domElement
        
        const onPointerDown = (e) => {
            isDragging.current = true
            startX.current = e.clientX
            isClick.current = true
        }
        
        const onPointerMove = (e) => {
            if (!isDragging.current) return
            const delta = e.clientX - startX.current
            if (Math.abs(delta) > 5) {
                isClick.current = false
            }
            // Sensitivity: 1 full screen width = 90 degrees (PI/2) maybe?
            // Let's say 500px = 1 slide (120 deg = 2PI/3)
            dragOffset.current = (delta / window.innerWidth) * (Math.PI * 1.5)
        }
        
        const onPointerUp = (e) => {
            if (!isDragging.current) return
            isDragging.current = false
            
            if (isClick.current && onModelClick) {
                if (isMobile) {
                    const y = e.clientY
                    const height = window.innerHeight
                    if (y > height * 0.25 && y < height * 0.75) {
                        onModelClick()
                    }
                } else {
                    onModelClick()
                }
            }

            const threshold = Math.PI / 4 // 45 degrees
            
            // Trigger change if not mobile OR if using a mouse (desktop emulation of mobile)
            if (!isMobile || e.pointerType === 'mouse') {
                if (dragOffset.current > threshold) {
                    setSlideIndex(s => s - 1)
                } else if (dragOffset.current < -threshold) {
                    setSlideIndex(s => s + 1)
                }
            }
            
            dragOffset.current = 0
        }
        
        canvas.addEventListener('pointerdown', onPointerDown)
        window.addEventListener('pointermove', onPointerMove)
        window.addEventListener('pointerup', onPointerUp)
        
        return () => {
            canvas.removeEventListener('pointerdown', onPointerDown)
            window.removeEventListener('pointermove', onPointerMove)
            window.removeEventListener('pointerup', onPointerUp)
        }
    }, [gl, setSlideIndex, isMobile, onModelClick])

    const radius = 3.5
    const groupY = 0
    const groupZ = 0

    // Calculate positions on a circle
    // 0: 0 deg, 1: 120 deg, 2: 240 deg
    const getPosition = (index, yOffset = 0) => {
        const angle = index * (2 * Math.PI / 3)
        return [
            radius * Math.sin(angle),
            yOffset,
            radius * Math.cos(angle)
        ]
    }
    
    // Make models look outward
    const getRotation = (index) => {
        const angle = index * (2 * Math.PI / 3)
        return [0, angle, 0]
    }

    useFrame((state, delta) => {
        // Rotate Group
        const targetRotation = -slideIndex * (2 * Math.PI / 3)
        const currentTarget = targetRotation + dragOffset.current
        
        if (groupRef.current) {
            groupRef.current.rotation.y = THREE.MathUtils.lerp(
                groupRef.current.rotation.y,
                currentTarget,
                delta * 5
            )
        }
    })
    
    /*
    const getLightingForModel = (index) => {
      if (index === 0) return modelLightingPresets.phone
      if (index === 1) return modelLightingPresets.aws
      return modelLightingPresets.wobbleSphere
    }
    */

    const bgColor = theme === 'light' ? '#f6f6f6' : props.backgroundColor

    return (
      <>
        <color args={[bgColor]} attach={"background"} />
        {props.performance && <Perf position="top-left"/>}
        {/* <Lights modelLighting={getLightingForModel(viewIndex)}/> */}
        <Lights modelLighting={modelLightingPresets.phone}/>
        
        <group ref={groupRef} position={[0, groupY, groupZ]}>
            <group position={getPosition(0, 0)} rotation={getRotation(0)}>
                <PhoneModel scale={1.3} isActive={viewIndex === 0} />
            </group>
            <group position={getPosition(1, -1)} rotation={getRotation(1)}>
                <AWSModel scale={0.3} theme={theme} isActive={viewIndex === 1} />
            </group>
            <group position={getPosition(2, 0)} rotation={getRotation(2)}>
                <WobbleSphere scale={1.3} isActive={viewIndex === 2} />
            </group>
        </group>
      </>
    );
}