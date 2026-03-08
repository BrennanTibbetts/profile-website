import { useEnvironment, useFBX, useGLTF } from "@react-three/drei";

const PHONE_MODEL_FBX = "/assets/models/XS%20Max%202/iPhone%20XS%20Max.fbx";
const PORTFOLIO_GLTF_MODELS = [
  "/assets/models/aws/aws.glb",
  "/assets/models/connector/c-transformed.glb",
];

let hasPreloadedPortfolioAssets = false;

export function preloadPortfolioAssets() {
  if (hasPreloadedPortfolioAssets) {
    return;
  }
  hasPreloadedPortfolioAssets = true;

  useFBX.preload(PHONE_MODEL_FBX);

  for (const modelPath of PORTFOLIO_GLTF_MODELS) {
    useGLTF.preload(modelPath);
  }

  useEnvironment.preload({ preset: "city" });
}
