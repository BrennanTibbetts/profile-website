import { useEffect, useMemo, useRef, useState } from "react";
import { useGLTF, useTexture } from "@react-three/drei";
import * as THREE from "three";

// iPhone model (GLB, metres, lying flat) and the lock screen shown until a
// screen recording is playing.
const MODEL_PATH = "/assets/models/iphone/iphone.glb";
const LOCK_SCREEN_PATH = "/assets/models/iphone/lock-screen.jpg";

// Stand the phone up, screen towards +Z, and scale it so it's about 5 scene
// units tall at scale 1 (the sizes the rest of the site was tuned with).
const MODEL_ROTATION = [-Math.PI / 2, 0, 0];
const MODEL_SCALE = 32;

// Parts that look odd from the front at this scale, hidden.
const HIDDEN_MATERIALS = new Set(["back", "logo", "lens", "mic", "flash"]);
// The side rails get a matte black finish.
const SIDE_RAIL_MATERIALS = new Set(["edge.001", "edge-antenna.001"]);
const SCREEN_MATERIAL = "screen.001";

/**
 * A silent, looping video texture. The video is only created once `load` is
 * true (the section is near), so recordings don't download up front, and it
 * only plays while `playing` is true. `offset` (0 to 1) starts it that far
 * into the recording, so two phones playing it aren't in step.
 */
function useScreenVideoTexture(src, load, playing, offset = 0) {
  const [texture, setTexture] = useState(null);
  const videoRef = useRef(null);
  const shouldLoad = Boolean(src) && load;

  useEffect(() => {
    if (!shouldLoad) {
      return undefined;
    }
    const video = document.createElement("video");
    video.src = src;
    video.muted = true;
    video.loop = true;
    video.playsInline = true;
    video.preload = "auto";
    video.crossOrigin = "anonymous";
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
    videoRef.current = video;

    const videoTexture = new THREE.VideoTexture(video);
    videoTexture.colorSpace = THREE.SRGBColorSpace;
    videoTexture.flipY = false;

    const handleReady = () => setTexture(videoTexture);
    const handleMetadata = () => {
      if (offset > 0 && Number.isFinite(video.duration)) {
        video.currentTime = (offset % 1) * video.duration;
      }
    };
    video.addEventListener("loadedmetadata", handleMetadata, { once: true });
    video.addEventListener("loadeddata", handleReady, { once: true });
    video.load();

    return () => {
      video.removeEventListener("loadedmetadata", handleMetadata);
      video.removeEventListener("loadeddata", handleReady);
      video.pause();
      video.removeAttribute("src");
      video.load();
      videoTexture.dispose();
      videoRef.current = null;
      setTexture(null);
    };
  }, [src, shouldLoad, offset]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !texture) {
      return;
    }
    if (playing) {
      video.play().catch(() => {
        // Autoplay can be refused (e.g. low-power mode); the current frame stays up.
      });
    } else {
      video.pause();
    }
  }, [playing, texture]);

  return texture;
}

/**
 * The iPhone, standing up and facing the camera. Its screen shows
 * `screenVideoSrc` once loaded (see useScreenVideoTexture), otherwise the
 * lock screen. `screenVideoOffset` starts the video part-way through.
 */
export function PhoneModel({
  screenVideoSrc = null,
  screenVideoLoad = false,
  screenVideoPlaying = false,
  screenVideoOffset = 0,
  ...props
}) {
  const { scene } = useGLTF(MODEL_PATH);
  const lockScreen = useTexture(LOCK_SCREEN_PATH);
  const videoTexture = useScreenVideoTexture(screenVideoSrc, screenVideoLoad, screenVideoPlaying, screenVideoOffset);

  // Each phone gets its own copy of the model and materials.
  const { model, screenMaterials } = useMemo(() => {
    const clone = scene.clone(true);
    const screens = [];
    clone.traverse((node) => {
      if (!node.isMesh) {
        return;
      }
      const cloned = (Array.isArray(node.material) ? node.material : [node.material]).map((material) => {
        const copy = material.clone();
        const name = (copy.name ?? "").toLowerCase();
        if (HIDDEN_MATERIALS.has(name)) {
          copy.visible = false;
        } else if (SIDE_RAIL_MATERIALS.has(name)) {
          copy.map = null;
          copy.color.set("#151515");
          copy.metalness = 0.2;
          copy.roughness = 0.78;
        } else if (name === SCREEN_MATERIAL) {
          screens.push(copy);
        }
        return copy;
      });
      node.material = Array.isArray(node.material) ? cloned : cloned[0];
    });
    return { model: clone, screenMaterials: screens };
  }, [scene]);

  useEffect(() => {
    lockScreen.colorSpace = THREE.SRGBColorSpace;
    lockScreen.flipY = false;
    lockScreen.needsUpdate = true;
  }, [lockScreen]);

  useEffect(() => {
    const screenTexture = videoTexture ?? lockScreen;
    screenMaterials.forEach((material) => {
      material.map = screenTexture;
      material.needsUpdate = true;
    });
  }, [screenMaterials, videoTexture, lockScreen]);

  return (
    <group {...props} dispose={null}>
      <group rotation={MODEL_ROTATION} scale={MODEL_SCALE}>
        <primitive object={model} />
      </group>
    </group>
  );
}

useGLTF.preload(MODEL_PATH);
useTexture.preload(LOCK_SCREEN_PATH);
