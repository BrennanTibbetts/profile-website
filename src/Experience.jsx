import { useControls } from "leva";
import { useState, useEffect } from "react";
import { useThree } from "@react-three/fiber";
import { Perf } from "r3f-perf";
import { Environment } from "@react-three/drei";
import Lights, { modelLightingPresets } from "./Lights.jsx";
import { AWSModel } from "./models/AWSModel.jsx";
import { PhoneModel } from "./models/PhoneModel.jsx";
import JarModel from "./models/JarModel.jsx";
import { projects } from "./projects.js";
import { usePointerDrag } from "./hooks/usePointerDrag.js";
import { useCarouselRotation } from "./hooks/useCarouselRotation.js";

export default function Experience({ slideIndex = 0, setSlideIndex, theme = "dark", onModelClick }) {
  const numItems = projects.length;
  const viewIndex = ((slideIndex % numItems) + numItems) % numItems;
  const { gl } = useThree();
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const props = useControls("Experience", {
    backgroundColor: "#000000",
    performance: false,
    carouselRadius: 5,
    environmentPreset: {
      value: "city",
      options: ["sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio", "city", "park", "lobby"]
    }
  });

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Pointer drag interaction
  const { dragOffset } = usePointerDrag(
    gl,
    () => setSlideIndex(s => s + 1), // onSwipeLeft
    () => setSlideIndex(s => s - 1), // onSwipeRight
    onModelClick,
    isMobile
  );

  // Carousel rotation and positioning
  const { groupRef, getPosition, getRotation } = useCarouselRotation(
    slideIndex,
    dragOffset,
    numItems,
    props.carouselRadius
  );

  const bgColor = theme === "light" ? "#f6f6f6" : props.backgroundColor;

  return (
    <>
      <color args={[bgColor]} attach={"background"} />
      {props.performance && <Perf position='top-left' />}
      <Lights modelLighting={modelLightingPresets.phone} />
      <Environment preset={props.environmentPreset} />

      <group ref={groupRef} position={[0, 0, 0]}>
        <group position={getPosition(0, 0)} rotation={getRotation(0)}>
          <PhoneModel scale={1.3} isActive={viewIndex === 0} />
        </group>
        <group position={getPosition(1, -1)} rotation={getRotation(1)}>
          <AWSModel scale={0.3} theme={theme} isActive={viewIndex === 1} />
        </group>
        <group position={getPosition(2, 0)} rotation={getRotation(2)}>
          <JarModel isActive={viewIndex === 2} />
        </group>
      </group>
    </>
  );
}
