import { useFBX, useTexture } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";

const XS_MAX_2_MODEL_PATH = "/assets/models/XS%20Max%202/iPhone%20XS%20Max.fbx";
const FBX_UNIT_NORMALIZATION = 0.01;
const XS_MAX_2_TEXTURE_PATHS = {
  lockXs3: "/assets/models/XS%20Max%202/textures/LockScreen-xs3.png",
};
const PHONE_HIDDEN_MATERIAL_NAMES = new Set(["back", "logo", "lens", "mic", "flash"]);
const PHONE_SURFACE_MATERIAL_PRESETS = {
  graphite: {
    color: "#3f444b",
    metalness: 0.9,
    roughness: 0.28,
    emissive: "#000000",
    emissiveIntensity: 0,
  },
  matteBlack: {
    color: "#151515",
    metalness: 0.2,
    roughness: 0.78,
    emissive: "#000000",
    emissiveIntensity: 0,
  },
  stainless: {
    color: "#7b7f87",
    metalness: 1,
    roughness: 0.18,
    emissive: "#000000",
    emissiveIntensity: 0,
  },
  midnightBlue: {
    color: "#1d2b4f",
    metalness: 0.7,
    roughness: 0.35,
    emissive: "#000000",
    emissiveIntensity: 0,
  },
};

function captureOriginalMaterialState(material) {
  return {
    map: material.map ?? null,
    metalnessMap: material.metalnessMap ?? null,
    roughnessMap: material.roughnessMap ?? null,
    normalMap: material.normalMap ?? null,
    emissiveMap: material.emissiveMap ?? null,
    color: material.color?.clone?.() ?? null,
    metalness: material.metalness,
    roughness: material.roughness,
    emissive: material.emissive?.clone?.() ?? null,
    emissiveIntensity: material.emissiveIntensity,
    transparent: material.transparent,
    opacity: material.opacity,
  };
}

function restoreOriginalMaterialState(material, originalState) {
  material.map = originalState.map;
  material.metalnessMap = originalState.metalnessMap;
  material.roughnessMap = originalState.roughnessMap;
  material.normalMap = originalState.normalMap;
  material.emissiveMap = originalState.emissiveMap;
  if (material.color && originalState.color) {
    material.color.copy(originalState.color);
  }
  if ("metalness" in material && typeof originalState.metalness === "number") {
    material.metalness = originalState.metalness;
  }
  if ("roughness" in material && typeof originalState.roughness === "number") {
    material.roughness = originalState.roughness;
  }
  if (material.emissive && originalState.emissive) {
    material.emissive.copy(originalState.emissive);
    material.emissiveIntensity = originalState.emissiveIntensity ?? 0;
  }
  material.transparent = originalState.transparent ?? material.transparent;
  material.opacity = originalState.opacity ?? material.opacity;
}

function applyMaterialPreset(material, presetName, stateKey) {
  if (!material.userData[stateKey]) {
    material.userData[stateKey] = captureOriginalMaterialState(material);
  }

  const originalState = material.userData[stateKey];
  const preset = PHONE_SURFACE_MATERIAL_PRESETS[presetName];

  if (!preset) {
    restoreOriginalMaterialState(material, originalState);
    material.needsUpdate = true;
    return;
  }

  material.map = null;
  material.metalnessMap = null;
  material.roughnessMap = null;
  material.normalMap = originalState.normalMap;
  material.emissiveMap = null;
  if (material.color) {
    material.color.set(preset.color);
  }
  if ("metalness" in material) {
    material.metalness = preset.metalness;
  }
  if ("roughness" in material) {
    material.roughness = preset.roughness;
  }
  if (material.emissive) {
    material.emissive.set(preset.emissive);
    material.emissiveIntensity = preset.emissiveIntensity;
  }
  material.needsUpdate = true;
}

function hideMaterialSurface(material, stateKey) {
  if (!material.userData[stateKey]) {
    material.userData[stateKey] = {
      visible: material.visible ?? true,
      map: material.map ?? null,
      emissiveMap: material.emissiveMap ?? null,
    };
  }

  material.visible = false;
  material.map = null;
  material.emissiveMap = null;
  material.needsUpdate = true;
}

export function XSMax2Model({
  screenEmissiveIntensity = 0.35,
  trimMaterialPreset = "original",
  edgeMaterialPreset = "matchTrim",
  glassMaterialPreset = "matchTrim",
  sideRailMaterialPreset = "matchTrim",
  ...props
}) {
  const scene = useFBX(XS_MAX_2_MODEL_PATH);
  const textures = useTexture(XS_MAX_2_TEXTURE_PATHS);

  const modelScene = useMemo(() => {
    const clone = scene.clone(true);

    clone.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      if (Array.isArray(node.material)) {
        node.material = node.material.map((material) => material?.clone?.() ?? material);
      } else if (node.material?.clone) {
        node.material = node.material.clone();
      }
    });

    return clone;
  }, [scene]);

  useEffect(() => {
    Object.entries(textures).forEach(([key, texture]) => {
      if (!texture) {
        return;
      }
      texture.colorSpace = THREE.SRGBColorSpace;
      // FBX materials expect top-left texture origin; keep the lock screen upright.
      if (key === "lockXs3") {
        texture.flipY = true;
      }
      texture.needsUpdate = true;
    });
  }, [textures]);

  useEffect(() => {
    const selectedScreenTexture = textures.lockXs3;
    const resolvedEdgeMaterialPreset =
      edgeMaterialPreset === "matchTrim" ? trimMaterialPreset : edgeMaterialPreset;
    const resolvedGlassMaterialPreset =
      glassMaterialPreset === "matchTrim" ? trimMaterialPreset : glassMaterialPreset;
    const resolvedSideRailMaterialPreset =
      sideRailMaterialPreset === "matchTrim" ? trimMaterialPreset : sideRailMaterialPreset;

    modelScene.traverse((node) => {
      if (!node.isMesh) {
        return;
      }

      const materials = Array.isArray(node.material) ? node.material : [node.material];
      materials.forEach((material) => {
        if (!material) {
          return;
        }

        const materialName = (material.name ?? "").toLowerCase();

        if (PHONE_HIDDEN_MATERIAL_NAMES.has(materialName)) {
          hideMaterialSurface(material, "originalHiddenMaterialState");
          return;
        }

        const isSideRailMaterial =
          materialName === "edge.001" ||
          materialName === "edge-antenna.001" ||
          material.name === "Edge.001" ||
          material.name === "Edge-Antenna.001";

        if (isSideRailMaterial) {
          applyMaterialPreset(material, resolvedSideRailMaterialPreset, "originalSideRailMaterial");
          return;
        }

        const isEdgeMaterial =
          materialName.includes("screen-edge") ||
          materialName.includes("screen edge") ||
          materialName.includes("trim") ||
          materialName.includes("frame");

        if (isEdgeMaterial) {
          applyMaterialPreset(material, resolvedEdgeMaterialPreset, "originalEdgeMaterial");
          return;
        }

        const isGlassMaterial = materialName === "glass" || material.name === "Glass";

        if (isGlassMaterial) {
          applyMaterialPreset(material, resolvedGlassMaterialPreset, "originalGlassMaterial");
          return;
        }

        if ((materialName.includes("screen") || material.name === "Screen.001") && selectedScreenTexture) {
          material.map = selectedScreenTexture;
          material.emissiveMap = selectedScreenTexture;
          material.emissive = material.emissive ?? new THREE.Color("#ffffff");
          material.emissive.set("#ffffff");
          material.emissiveIntensity = screenEmissiveIntensity;
          material.needsUpdate = true;
          return;
        }
      });
    });
  }, [
    modelScene,
    textures,
    screenEmissiveIntensity,
    trimMaterialPreset,
    edgeMaterialPreset,
    glassMaterialPreset,
    sideRailMaterialPreset,
  ]);

  return (
    <group {...props} dispose={null}>
      <group scale={FBX_UNIT_NORMALIZATION}>
        <primitive object={modelScene} />
      </group>
    </group>
  );
}

useFBX.preload(XS_MAX_2_MODEL_PATH);
Object.values(XS_MAX_2_TEXTURE_PATHS).forEach((texturePath) => {
  useTexture.preload(texturePath);
});
