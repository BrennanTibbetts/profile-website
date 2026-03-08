import { useEnvironment, useFBX, useGLTF, useTexture } from "@react-three/drei";

const PHONE_MODEL_FBX = "/assets/models/XS%20Max%202/iPhone%20XS%20Max.fbx";
const PHONE_TEXTURES = [
  "/assets/models/XS%20Max%202/textures/LockScreen-xs3.png",
];
const AWS_MODEL_GLB = "/assets/models/aws/aws.glb";
const CONNECTOR_MODEL_GLB = "/assets/models/connector/c-transformed.glb";
const ENV_PRESET = "city";

let hasPreloadedPortfolioAssets = false;

function runPhonePreload() {
  useFBX.preload(PHONE_MODEL_FBX);
  for (const texturePath of PHONE_TEXTURES) {
    useTexture.preload(texturePath);
  }
}

function runAwsPreload() {
  useGLTF.preload(AWS_MODEL_GLB);
}

function runWeb3Preload() {
  useGLTF.preload(CONNECTOR_MODEL_GLB);
  useEnvironment.preload({ preset: ENV_PRESET });
}

function scheduleBackgroundTask(task, delayMs = 160) {
  if (typeof window === "undefined") {
    task();
    return;
  }

  if ("requestIdleCallback" in window) {
    window.requestIdleCallback(task, { timeout: 1400 });
    return;
  }

  window.setTimeout(task, delayMs);
}

export function preloadPortfolioAssets() {
  if (hasPreloadedPortfolioAssets) {
    return;
  }
  hasPreloadedPortfolioAssets = true;

  // Priority order: phone, then AWS, then web/3D.
  runPhonePreload();
  scheduleBackgroundTask(() => {
    runAwsPreload();
    scheduleBackgroundTask(() => {
      runWeb3Preload();
    }, 240);
  }, 140);
}
