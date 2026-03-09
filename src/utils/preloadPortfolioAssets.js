import { useEnvironment, useFBX, useGLTF, useTexture } from "@react-three/drei";

const PHONE_MODEL_FBX = "/assets/models/XS%20Max%202/iPhone%20XS%20Max.fbx";
const PHONE_TEXTURES = [
  "/assets/models/XS%20Max%202/textures/LockScreen-xs3.png",
];
const AWS_MODEL_GLB = "/assets/models/aws/aws.glb";
const CONNECTOR_MODEL_GLB = "/assets/models/connector/c-transformed.glb";
const ENV_PRESET = "city";

let hasScheduledPortfolioAssets = false;
let hasPreloadedPhoneAssets = false;
let hasPreloadedAwsAssets = false;
let hasPreloadedWeb3Assets = false;
const warmedAssetUrls = new Set();

function warmAssetCache(url) {
  if (typeof window === "undefined" || typeof fetch !== "function") {
    return;
  }

  if (warmedAssetUrls.has(url)) {
    return;
  }
  warmedAssetUrls.add(url);

  fetch(url, {
    method: "GET",
    cache: "force-cache",
    credentials: "same-origin",
  }).catch(() => {
    // Best-effort warmup only.
  });
}

function runPhonePreload() {
  if (hasPreloadedPhoneAssets) {
    return;
  }
  hasPreloadedPhoneAssets = true;

  useFBX.preload(PHONE_MODEL_FBX);
  warmAssetCache(PHONE_MODEL_FBX);
  for (const texturePath of PHONE_TEXTURES) {
    useTexture.preload(texturePath);
    warmAssetCache(texturePath);
  }
}

function runAwsPreload() {
  if (hasPreloadedAwsAssets) {
    return;
  }
  hasPreloadedAwsAssets = true;

  useGLTF.preload(AWS_MODEL_GLB);
  warmAssetCache(AWS_MODEL_GLB);
}

function runWeb3Preload() {
  if (hasPreloadedWeb3Assets) {
    return;
  }
  hasPreloadedWeb3Assets = true;

  useGLTF.preload(CONNECTOR_MODEL_GLB);
  warmAssetCache(CONNECTOR_MODEL_GLB);
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

export function preloadPortfolioAssets({ mode = "background" } = {}) {
  if (mode === "eager") {
    // Always push everything when we have a strong signal that portfolio is likely.
    runPhonePreload();
    runAwsPreload();
    runWeb3Preload();
    return;
  }

  if (hasScheduledPortfolioAssets) {
    return;
  }
  hasScheduledPortfolioAssets = true;

  // Priority order: phone, then AWS, then web/3D.
  runPhonePreload();
  scheduleBackgroundTask(() => {
    runAwsPreload();
    scheduleBackgroundTask(() => {
      runWeb3Preload();
    }, 240);
  }, 140);
}
