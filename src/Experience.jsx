import { button, folder, useControls } from "leva";
import { useState, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import SceneDiagnostics from "./components/SceneDiagnostics.jsx";
import Lights, { modelLightingPresets } from "./Lights.jsx";
import { AWSModel } from "./models/AWSModel.jsx";
import { PhoneModel } from "./models/PhoneModel.jsx";
import { ConnectorClusterModel } from "./models/ConnectorClusterModel.jsx";
import { projects } from "./projects.js";
import { usePointerDrag } from "./hooks/usePointerDrag.js";
import { useCarouselRotation } from "./hooks/useCarouselRotation.js";
import { QUALITY_PRESETS } from "./hooks/useAdaptiveQualityProfile";

export default function Experience({
  slideIndex = 0,
  setSlideIndex,
  onModelClick,
  diagnosticsEnabled = false,
  qualityProfile = null,
  disableConnectorInteraction = false,
}) {
  const numItems = projects.length;
  const viewIndex = ((slideIndex % numItems) + numItems) % numItems;
  const { gl } = useThree();
  const connectorAnchorRef = useRef(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [radiusIntroRunKey, setRadiusIntroRunKey] = useState(0);
  const qualityPreset = qualityProfile?.preset ?? QUALITY_PRESETS.high;

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
      <Lights
        modelLighting={modelLightingPresets.phone}
        intensityScale={qualityPreset.lightingIntensityScale}
      />
      {qualityPreset.enableEnvironment ? (
        <Environment preset={props.environmentPreset} resolution={qualityPreset.environmentResolution} />
      ) : null}

      <group ref={groupRef} position={[0, 0, 0]}>
        <group position={getPosition(0, 0)} rotation={getRotation(0)}>
          <PhoneModel
            scale={1.3}
            isActive={viewIndex === 0}
            trackingEnabled={qualityPreset.enableMouseTracking}
          />
        </group>
        <group position={getPosition(1, -1)} rotation={getRotation(1)}>
          <AWSModel
            scale={0.3}
            isActive={viewIndex === 1}
            trackingEnabled={qualityPreset.enableMouseTracking}
          />
        </group>
        <group ref={connectorAnchorRef} position={getPosition(2, 0)} rotation={getRotation(2)} />
      </group>
      <ConnectorClusterModel
        isActive={viewIndex === 2}
        interactionEnabled={!disableConnectorInteraction}
        maxConnectors={qualityPreset.connectorCount}
        physicsStepDivisor={qualityPreset.connectorPhysicsStepDivisor}
        pointerUpdateDivisor={qualityPreset.connectorPointerUpdateDivisor}
        enableAccentLights={qualityPreset.connectorAccentLights}
        centerPullStrengthMultiplier={qualityPreset.connectorCenterPullMultiplier}
        anchorSourceRef={connectorAnchorRef}
      />
    </>
  );
}
