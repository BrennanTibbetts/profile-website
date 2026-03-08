import { button, folder, useControls } from "leva";
import { useState, useEffect, useRef } from "react";
import { useThree } from "@react-three/fiber";
import { Environment } from "@react-three/drei";
import SceneDiagnostics from "./components/SceneDiagnostics.jsx";
import Lights, { modelLightingPresets } from "./Lights.jsx";
import { AWSModel } from "./models/AWSModel.jsx";
import { XSMax2Model } from "./models/XSMax2Model.jsx";
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
    performance: { value: diagnosticsEnabled },
    carouselRadius: 5,
    "Phone Model": folder(
      {
        phoneScale: { value: 32, min: 1, max: 600, step: 1 },
        phoneOffsetX: { value: 0, min: -3, max: 3, step: 0.01 },
        phoneOffsetY: { value: -0.2, min: -3, max: 3, step: 0.01 },
        phoneOffsetZ: { value: 0, min: -3, max: 3, step: 0.01 },
        phoneRotX: { value: -96, min: -180, max: 180, step: 1 },
        phoneRotY: { value: -8, min: -180, max: 180, step: 1 },
        phoneRotZ: { value: 26, min: -180, max: 180, step: 1 },
        phoneScreenEmissive: { value: 0, min: 0, max: 2.5, step: 0.01 },
        phoneBackMaterial: {
          value: "matteBlack",
          options: ["original", "graphite", "matteBlack", "stainless", "midnightBlue"],
        },
        phoneTrimMaterial: {
          value: "original",
          options: ["original", "graphite", "matteBlack", "stainless", "midnightBlue"],
        },
        phoneEdgeMaterial: {
          value: "matchTrim",
          options: ["matchTrim", "original", "graphite", "matteBlack", "stainless", "midnightBlue"],
        },
        phoneGlassMaterial: {
          value: "matchTrim",
          options: ["matchTrim", "original", "graphite", "matteBlack", "stainless", "midnightBlue"],
        },
        phoneSideRailMaterial: {
          value: "matteBlack",
          options: ["matchTrim", "original", "graphite", "matteBlack", "stainless", "midnightBlue"],
        },
      },
      { collapsed: false }
    ),
    "AWS Logo Material": folder(
      {
        awsLogoScale: { value: 0.86, min: 0.1, max: 1, step: 0.001 },
        awsArrowColor: { value: "#ff9500" },
        awsTextColor: { value: "#ffffff" },
        awsLogoMetalness: { value: 0.3, min: 0, max: 1, step: 0.01 },
        awsLogoRoughness: { value: 0.45, min: 0, max: 1, step: 0.01 },
        awsArrowEmissive: { value: "#ff6600" },
        awsArrowEmissiveIntensity: { value: 0.12, min: 0, max: 2, step: 0.01 },
        awsTextEmissive: { value: "#000000" },
        awsTextEmissiveIntensity: { value: 0, min: 0, max: 2, step: 0.01 },
      },
      { collapsed: false }
    ),
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
      <SceneDiagnostics enabled={props.performance} />
      <Lights modelLighting={modelLightingPresets.phone} />
      <Environment preset={props.environmentPreset} />

      <group ref={groupRef} position={[0, 0, 0]}>
        <group position={getPosition(0, 0)} rotation={getRotation(0)}>
          <group
            position={[props.phoneOffsetX, props.phoneOffsetY, props.phoneOffsetZ]}
            rotation={[
              (props.phoneRotX * Math.PI) / 180,
              (props.phoneRotY * Math.PI) / 180,
              (props.phoneRotZ * Math.PI) / 180,
            ]}
          >
            <XSMax2Model
              scale={props.phoneScale}
              screenEmissiveIntensity={props.phoneScreenEmissive}
              backMaterialPreset={props.phoneBackMaterial}
              trimMaterialPreset={props.phoneTrimMaterial}
              edgeMaterialPreset={props.phoneEdgeMaterial}
              glassMaterialPreset={props.phoneGlassMaterial}
              sideRailMaterialPreset={props.phoneSideRailMaterial}
              isActive={false}
            />
          </group>
        </group>
        <group position={getPosition(1, -1)} rotation={getRotation(1)}>
          <AWSModel
            scale={0.3}
            isActive={viewIndex === 1}
            logoScale={props.awsLogoScale}
            arrowColor={props.awsArrowColor}
            textColor={props.awsTextColor}
            logoMetalness={props.awsLogoMetalness}
            logoRoughness={props.awsLogoRoughness}
            arrowEmissive={props.awsArrowEmissive}
            arrowEmissiveIntensity={props.awsArrowEmissiveIntensity}
            textEmissive={props.awsTextEmissive}
            textEmissiveIntensity={props.awsTextEmissiveIntensity}
          />
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
