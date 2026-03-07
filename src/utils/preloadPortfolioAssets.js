import { useEnvironment, useGLTF } from "@react-three/drei";

const PORTFOLIO_MODELS = [
  "/assets/models/phone/scene.gltf",
  "/assets/models/aws/scene.gltf",
  "/assets/models/connector/c-transformed.glb",
];

let hasPreloadedPortfolioAssets = false;

export function preloadPortfolioAssets() {
  if (hasPreloadedPortfolioAssets) {
    return;
  }
  hasPreloadedPortfolioAssets = true;

  for (const modelPath of PORTFOLIO_MODELS) {
    useGLTF.preload(modelPath);
  }

  useEnvironment.preload({ preset: "city" });
}
