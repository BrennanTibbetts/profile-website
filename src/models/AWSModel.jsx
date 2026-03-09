import { useEffect, useMemo, useRef } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

const AWS_LOGO_PATH = "/assets/models/aws/aws.glb";
export function AWSModel({
  logoScale = 0.01,
  arrowColor = "#ff9500",
  textColor = "#ffffff",
  logoMetalness = 0.3,
  logoRoughness = 0.45,
  arrowEmissive = "#ff6600",
  arrowEmissiveIntensity = 0.12,
  textEmissive = "#000000",
  textEmissiveIntensity = 0,
  onReady,
  ...props
}) {
  const { nodes: logoNodes } = useGLTF(AWS_LOGO_PATH);
  const hasNotifiedReadyRef = useRef(false);

  useEffect(() => {
    if (!onReady || hasNotifiedReadyRef.current) {
      return;
    }
    hasNotifiedReadyRef.current = true;
    onReady();
  }, [onReady, logoNodes]);

  const arrowMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: arrowColor,
        metalness: logoMetalness,
        roughness: logoRoughness,
        emissive: arrowEmissive,
        emissiveIntensity: arrowEmissiveIntensity,
      }),
    [arrowColor, logoMetalness, logoRoughness, arrowEmissive, arrowEmissiveIntensity]
  );

  const textMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: textColor,
        metalness: logoMetalness,
        roughness: logoRoughness,
        emissive: textEmissive,
        emissiveIntensity: textEmissiveIntensity,
      }),
    [textColor, logoMetalness, logoRoughness, textEmissive, textEmissiveIntensity]
  );

  return (
    <group {...props} dispose={null}>
      <group scale={logoScale}>
        <mesh
          geometry={logoNodes.ArrowBody.geometry}
          material={arrowMaterial}
          position={[-0.131, 1.557, -0.203]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={160.675}
        />
        <mesh
          geometry={logoNodes.AWS.geometry}
          material={textMaterial}
          position={[0.415, 6.12, -0.203]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={160.675}
        />
        <mesh
          geometry={logoNodes.ArrowHead.geometry}
          material={arrowMaterial}
          position={[5.933, 2.057, -0.203]}
          rotation={[Math.PI / 2, 0, 0]}
          scale={160.675}
        />
      </group>
    </group>
  );
}

useGLTF.preload(AWS_LOGO_PATH);
