import { button, folder, useControls } from "leva";
import { useState, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import SceneDiagnostics from "./components/SceneDiagnostics.jsx";
import PortfolioDepthOfField from "./components/PortfolioDepthOfField.jsx";
import Lights, { modelLightingPresets } from "./Lights.jsx";
import { AWSModel } from "./models/AWSModel.jsx";
import { PhoneModel } from "./models/PhoneModel.jsx";
import { ConnectorClusterModel } from "./models/ConnectorClusterModel.jsx";
import { projects } from "./projects.js";
import { usePointerDrag } from "./hooks/usePointerDrag.js";
import { useCarouselRotation } from "./hooks/useCarouselRotation.js";

export default function Experience({
  slideIndex = 0,
  setSlideIndex,
  onModelClick,
  diagnosticsEnabled = false,
  disableConnectorInteraction = false,
}) {
  const numItems = projects.length;
  const viewIndex = ((slideIndex % numItems) + numItems) % numItems;
  const { gl } = useThree();
  const connectorAnchorRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [radiusIntroRunKey, setRadiusIntroRunKey] = useState(0);

  const props = useControls("Experience", {
    backgroundColor: "#000000",
    performance: false,
    carouselRadius: 5,
    environmentPreset: {
      value: "city",
      options: ["sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio", "city", "park", "lobby"]
    },
    "Radius Intro": folder(
      {
        radiusIntroStart: { value: 1.3, min: 0.25, max: 8, step: 0.05 },
        radiusIntroSpeed: { value: 2.0, min: 0.2, max: 10, step: 0.1 },
        rerunRadiusIntro: button(() => {
          setRadiusIntroRunKey((value) => value + 1);
        }),
      },
      { collapsed: true }
    ),
    "Depth of Field": folder(
      {
        dofEnabled: { value: false },
        dofFocus: { value: 10.5, min: 0.5, max: 40, step: 0.1 },
        dofAperture: { value: 0.00018, min: 0.00001, max: 0.0012, step: 0.00001 },
        dofMaxBlur: { value: 0.008, min: 0, max: 0.04, step: 0.0005 },
        dofResolutionScale: { value: 1, min: 0.35, max: 1, step: 0.05 },
      },
      { collapsed: true }
    ),
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
    props.carouselRadius,
    {
      introStartRadius: props.radiusIntroStart,
      introSpeed: props.radiusIntroSpeed,
      introRunKey: radiusIntroRunKey,
    }
  );

  return (
    <>
      <color args={[props.backgroundColor]} attach={"background"} />
      <SceneDiagnostics enabled={props.performance || diagnosticsEnabled} />
      {props.dofEnabled ? (
        <PortfolioDepthOfField
          enabled={props.dofEnabled}
          focus={props.dofFocus}
          aperture={props.dofAperture}
          maxBlur={props.dofMaxBlur}
          resolutionScale={props.dofResolutionScale}
        />
      ) : null}
      <Lights modelLighting={modelLightingPresets.phone} />
      <Environment preset={props.environmentPreset} />

      <group ref={groupRef} position={[0, 0, 0]}>
        <group position={getPosition(0, 0)} rotation={getRotation(0)}>
          <PhoneModel scale={1.3} isActive={viewIndex === 0} />
        </group>
        <group position={getPosition(1, -1)} rotation={getRotation(1)}>
          <AWSModel scale={0.3} isActive={viewIndex === 1} />
        </group>
        <group ref={connectorAnchorRef} position={getPosition(2, 0)} rotation={getRotation(2)} />
      </group>
      <ConnectorClusterModel
        isActive={viewIndex === 2}
        interactionEnabled={!disableConnectorInteraction}
        anchorSourceRef={connectorAnchorRef}
      />
    </>
  );
}
