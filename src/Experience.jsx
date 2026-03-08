import { folder, useControls } from "leva";
import { useRef } from "react";
import { Environment, Float, PresentationControls } from "@react-three/drei";
import SceneDiagnostics from "./components/SceneDiagnostics.jsx";
import Lights, { modelLightingPresets } from "./Lights.jsx";
import { AWSModel } from "./models/AWSModel.jsx";
import { XSMax2Model } from "./models/XSMax2Model.jsx";
import { ConnectorClusterModel } from "./models/ConnectorClusterModel.jsx";
import { DESKTOP_SLIDE_SPACING, MOBILE_SLIDE_SPACING, SLIDE_DEPTH } from "./constants/slideLayout.js";

const PHONE_SLIDE_INDEX = 0;
const AWS_SLIDE_INDEX = 1;
const CONNECTOR_SLIDE_INDEX = 2;
const TOTAL_SLIDES = 3;
const DEG_TO_RAD = Math.PI / 180;
const MOBILE_SCENE_VERTICAL_OFFSET = 1.4;

function getWrappedDelta(index, centerIndex, totalSlides = TOTAL_SLIDES) {
  const halfRange = totalSlides / 2;
  const rawDelta = index - centerIndex;
  return ((rawDelta + halfRange) % totalSlides + totalSlides) % totalSlides - halfRange;
}

function getSlidePosition(index, centerIndex, isMobile, yOffset = 0, totalSlides = TOTAL_SLIDES) {
  const laneIndex = centerIndex + getWrappedDelta(index, centerIndex, totalSlides);

  if (isMobile) {
    return [0, MOBILE_SCENE_VERTICAL_OFFSET + yOffset - laneIndex * MOBILE_SLIDE_SPACING, SLIDE_DEPTH];
  }

  return [laneIndex * DESKTOP_SLIDE_SPACING, yOffset, SLIDE_DEPTH];
}

function toRadian(value) {
  return value * DEG_TO_RAD;
}

function toRadianRange(a, b) {
  const min = Math.min(a, b);
  const max = Math.max(a, b);
  return [toRadian(min), toRadian(max)];
}

export default function Experience({
  viewIndex = 0,
  layoutIndex = viewIndex,
  totalSlides = TOTAL_SLIDES,
  isMobile = false,
  mobilePhoneInteractionEnabled = false,
  diagnosticsEnabled = false,
  disableConnectorInteraction = false,
  onPresentationDragStart,
  onPresentationDragEnd,
}) {
  const connectorAnchorRef = useRef(null);

  const props = useControls("Experience", {
    backgroundColor: "#000000",
    performance: { value: diagnosticsEnabled },
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
    "Phone Presentation": folder(
      {
        phonePresentationEnabled: { value: true },
        phonePresentationCursor: { value: true },
        phonePresentationSnap: { value: true },
        phonePresentationSpeed: { value: 1.5, min: 0.1, max: 6, step: 0.05 },
        phonePresentationZoom: { value: 1.07, min: 0.5, max: 2, step: 0.01 },
        phonePresentationMass: { value: 2.55, min: 0.1, max: 5, step: 0.05 },
        phonePresentationTension: { value: 286, min: 20, max: 900, step: 1 },
        phonePresentationFriction: { value: 39, min: 1, max: 80, step: 1 },
        phonePresentationSnapMass: { value: 1.75, min: 0.1, max: 8, step: 0.05 },
        phonePresentationSnapTension: { value: 780, min: 20, max: 1400, step: 1 },
        phonePresentationSnapFriction: { value: 18, min: 1, max: 120, step: 1 },
        phonePresentationRotX: { value: 75, min: -180, max: 180, step: 1 },
        phonePresentationRotY: { value: -15, min: -180, max: 180, step: 1 },
        phonePresentationRotZ: { value: -31, min: -180, max: 180, step: 1 },
        phonePresentationPolarMin: { value: -35, min: -180, max: 180, step: 1 },
        phonePresentationPolarMax: { value: 35, min: -180, max: 180, step: 1 },
        phonePresentationAzimuthMin: { value: -65, min: -180, max: 180, step: 1 },
        phonePresentationAzimuthMax: { value: 65, min: -180, max: 180, step: 1 },
      },
      { collapsed: true }
    ),
    "Phone Float": folder(
      {
        phoneFloatEnabled: { value: true },
        phoneFloatSpeed: { value: 1.05, min: 0, max: 6, step: 0.05 },
        phoneFloatRotationIntensity: { value: 0.38, min: 0, max: 2, step: 0.01 },
        phoneFloatFloatIntensity: { value: 0.36, min: 0, max: 2, step: 0.01 },
        phoneFloatYLow: { value: -0.08, min: -1, max: 0, step: 0.01 },
        phoneFloatYHigh: { value: 0.08, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true }
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
    "AWS Float": folder(
      {
        awsFloatEnabled: { value: true },
        awsFloatSpeed: { value: 1.77, min: 0, max: 6, step: 0.05 },
        awsFloatRotationIntensity: { value: 0.81, min: 0, max: 2, step: 0.01 },
        awsFloatFloatIntensity: { value: 0.42, min: 0, max: 2, step: 0.01 },
        awsFloatYLow: { value: -0.12, min: -1, max: 0, step: 0.01 },
        awsFloatYHigh: { value: 0.12, min: 0, max: 1, step: 0.01 },
      },
      { collapsed: true }
    ),
    environmentPreset: {
      value: "city",
      options: ["sunset", "dawn", "night", "warehouse", "forest", "apartment", "studio", "city", "park", "lobby"],
    },
  });

  const phonePolar = toRadianRange(props.phonePresentationPolarMin, props.phonePresentationPolarMax);
  const phoneAzimuth = toRadianRange(props.phonePresentationAzimuthMin, props.phonePresentationAzimuthMax);
  const phoneRotation = [
    toRadian(props.phonePresentationRotX),
    toRadian(props.phonePresentationRotY),
    toRadian(props.phonePresentationRotZ),
  ];
  const phoneFloatRange = [
    Math.min(props.phoneFloatYLow, props.phoneFloatYHigh),
    Math.max(props.phoneFloatYLow, props.phoneFloatYHigh),
  ];
  const awsFloatRange = [
    Math.min(props.awsFloatYLow, props.awsFloatYHigh),
    Math.max(props.awsFloatYLow, props.awsFloatYHigh),
  ];
  const phoneControlsEnabled =
    viewIndex === PHONE_SLIDE_INDEX &&
    props.phonePresentationEnabled &&
    (!isMobile || mobilePhoneInteractionEnabled);
  const phoneSnapConfig = props.phonePresentationSnap
    ? {
        mass: props.phonePresentationSnapMass,
        tension: props.phonePresentationSnapTension,
        friction: props.phonePresentationSnapFriction,
      }
    : false;
  const shouldUsePhoneFloat = isMobile && props.phoneFloatEnabled && !mobilePhoneInteractionEnabled;

  return (
    <>
      <color args={[props.backgroundColor]} attach={"background"} />
      <SceneDiagnostics enabled={props.performance} />
      <Lights modelLighting={modelLightingPresets.phone} />
      <Environment preset={props.environmentPreset} />

      <group position={getSlidePosition(PHONE_SLIDE_INDEX, layoutIndex, isMobile, 0, totalSlides)}>
        {shouldUsePhoneFloat ? (
          <Float
            speed={props.phoneFloatSpeed}
            rotationIntensity={props.phoneFloatRotationIntensity}
            floatIntensity={props.phoneFloatFloatIntensity}
            floatingRange={phoneFloatRange}
          >
            <group rotation={phoneRotation}>
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
                  trimMaterialPreset={props.phoneTrimMaterial}
                  edgeMaterialPreset={props.phoneEdgeMaterial}
                  glassMaterialPreset={props.phoneGlassMaterial}
                  sideRailMaterialPreset={props.phoneSideRailMaterial}
                />
              </group>
            </group>
          </Float>
        ) : (
          <PresentationControls
            enabled={phoneControlsEnabled}
            global={false}
            cursor={props.phonePresentationCursor}
            snap={phoneSnapConfig}
            speed={props.phonePresentationSpeed}
            zoom={props.phonePresentationZoom}
            config={{
              mass: props.phonePresentationMass,
              tension: props.phonePresentationTension,
              friction: props.phonePresentationFriction,
            }}
            onStart={onPresentationDragStart}
            onEnd={onPresentationDragEnd}
            rotation={phoneRotation}
            polar={phonePolar}
            azimuth={phoneAzimuth}
          >
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
                trimMaterialPreset={props.phoneTrimMaterial}
                edgeMaterialPreset={props.phoneEdgeMaterial}
                glassMaterialPreset={props.phoneGlassMaterial}
                sideRailMaterialPreset={props.phoneSideRailMaterial}
              />
            </group>
          </PresentationControls>
        )}
      </group>
      <group position={getSlidePosition(AWS_SLIDE_INDEX, layoutIndex, isMobile, -1, totalSlides)}>
        {props.awsFloatEnabled ? (
          <Float
            speed={props.awsFloatSpeed}
            rotationIntensity={props.awsFloatRotationIntensity}
            floatIntensity={props.awsFloatFloatIntensity}
            floatingRange={awsFloatRange}
          >
            <AWSModel
              scale={0.3}
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
          </Float>
        ) : (
          <AWSModel
            scale={0.3}
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
        )}
      </group>
      <group
        ref={connectorAnchorRef}
        position={getSlidePosition(CONNECTOR_SLIDE_INDEX, layoutIndex, isMobile, 0, totalSlides)}
      />
      <ConnectorClusterModel
        isActive={viewIndex === CONNECTOR_SLIDE_INDEX}
        interactionEnabled={!disableConnectorInteraction}
        anchorSourceRef={connectorAnchorRef}
      />
    </>
  );
}
