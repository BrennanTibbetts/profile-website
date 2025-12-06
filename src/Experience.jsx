import { useControls } from 'leva'
import Lights, { modelLightingPresets } from './Lights.jsx'
import { PhoneModel } from './models/PhoneModel.jsx'
import { Perf } from 'r3f-perf'
import { AWSModel } from './models/AWSModel.jsx'
import WobbleSphere from './models/wobbleSphere/WobbleSphere.jsx'

export default function Experience({ viewIndex = 1, theme = 'dark' })
{
  const props = useControls('Experience', {
    backgroundColor: '#000000',
    performance: false 
  })

    const positions = [ [0, 0, 0], [0, -1, 0], [0, 0, 0] ]
    
    const getLightingForModel = (index) => {
      if (index === 0) return modelLightingPresets.phone
      if (index === 1) return modelLightingPresets.aws
      return modelLightingPresets.wobbleSphere
    }

    const bgColor = theme === 'light' ? '#f6f6f6' : props.backgroundColor

    return (
      <>
        <color args={[bgColor]} attach={"background"} />
        {props.performance && <Perf position="top-left"/>}
        <Lights modelLighting={getLightingForModel(viewIndex)}/>
        {positions.map((pos, i) => {
            if (i === 0) {
              return <PhoneModel key={i} position={pos} visible={i === viewIndex} scale={1.3} />
            }
            if (i === 1) {
              return <AWSModel key={i} position={pos} visible={i === viewIndex} scale={0.3} theme={theme} />
            }
            return <WobbleSphere key={i} position={pos} visible={i === viewIndex} scale={1.3} />
        })}
      </>
    );
}