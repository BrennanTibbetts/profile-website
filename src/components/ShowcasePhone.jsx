import { Suspense, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Float, PerspectiveCamera, PresentationControls } from "@react-three/drei";
import * as THREE from "three";
import PhoneLighting from "./PhoneLighting.jsx";
import { PhoneModel } from "../models/PhoneModel.jsx";
import { grabPhone } from "./phoneGrab.js";
import { ClimbingShoeModel } from "../models/ClimbingShoeModel.jsx";
import { CoffeeCupModel } from "../models/CoffeeCupModel.jsx";
import { GoniometerModel } from "../models/GoniometerModel.jsx";

const DEG = Math.PI / 180;


// How far the phone turns and drifts as its section scrolls past.
const RESTING_TURN = 18 * DEG;
const SCROLL_TURN = 30 * DEG;
const SCROLL_TILT = 8 * DEG;
const SCROLL_DRIFT = 0.9;

// Drag-to-spin, with the spring physics and snap-back the old Profile page's
// phone used. Limits are how far it can be turned from rest.
const DRAG_POLAR = [-35 * DEG, 35 * DEG];
const DRAG_AZIMUTH = [-65 * DEG, 65 * DEG];
const DRAG_SPRING = { mass: 2.55, tension: 286, friction: 39 };
const DRAG_SNAP = { mass: 1.75, tension: 780, friction: 18 };

// Optional objects that float in front of an app's phone, by `companion` id
// in apps.js. Positions are for a phone on the left; they mirror on the right.
const COMPANIONS = {
  "coffee-cup": {
    Model: CoffeeCupModel,
    props: { width: 1.45 },
    position: [0.45, -2.05, 1.6],
    rotation: [0.28, -0.6, 0],
  },
  goniometer: {
    Model: GoniometerModel,
    props: { scale: 0.64 },
    position: [0.55, -1.5, 1.7],
    rotation: [-0.12, -0.35, 0],
  },
  "climbing-shoe": {
    Model: ClimbingShoeModel,
    props: { length: 2.2 },
    position: [0.6, -1.35, 1.8],
    rotation: [0.35, 0, -0.25],
  },
};

// Draw order within the view: the phone, then a depth-buffer clear, then the
// companion. So the companion is always drawn over the phone, even when the
// phone is dragged so it would physically pass through it. (Set on the
// companion's meshes: three.js resets render order inside nested groups.)
const COMPANION_RENDER_ORDER = 2;
const DEPTH_CLEAR_RENDER_ORDER = 1;
const depthClearGeometry = new THREE.PlaneGeometry(0.0001, 0.0001);
const depthClearMaterial = new THREE.MeshBasicMaterial({ colorWrite: false, depthWrite: false });
const clearDepth = (renderer) => renderer.clearDepth();

/**
 * One phone, rendered inside a drei <View> for its section. It reads the
 * section's position each frame: centred in the viewport it rests at a
 * slight three-quarter turn towards the text; above or below centre it turns
 * further and drifts, so scrolling feels like the phone is being handed over.
 * When `draggable`, it can also be grabbed and spun; it springs back on release.
 */
export default function ShowcasePhone({
  sectionRef,
  videoSrc,
  videoLoad = false,
  isPlaying,
  side = "left",
  draggable = false,
  companion = null,
}) {
  const motionRef = useRef(null);
  // Phone on the left turns to face right (towards its text), and vice versa.
  const facing = side === "left" ? 1 : -1;
  const companionConfig = companion ? COMPANIONS[companion] : null;

  useFrame((_, delta) => {
    const section = sectionRef.current;
    const motion = motionRef.current;
    if (!section || !motion) {
      return;
    }

    const rect = section.getBoundingClientRect();
    const viewportHeight = window.innerHeight || 1;
    // -1 when the section is a full screen below centre, 0 centred, 1 above.
    const progress = THREE.MathUtils.clamp(
      (viewportHeight / 2 - (rect.top + rect.height / 2)) / viewportHeight,
      -1,
      1
    );

    const targetY = facing * (RESTING_TURN - progress * SCROLL_TURN);
    const targetX = progress * SCROLL_TILT;
    const targetDrift = progress * SCROLL_DRIFT;
    const ease = 1 - Math.exp(-delta * 6);

    motion.rotation.y += (targetY - motion.rotation.y) * ease;
    motion.rotation.x += (targetX - motion.rotation.x) * ease;
    motion.position.y += (targetDrift - motion.position.y) * ease;
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, 9]} fov={40} />
      <PhoneLighting />

      <group ref={motionRef}>
        <Float speed={1.05} rotationIntensity={0.25} floatIntensity={0.3} floatingRange={[-0.08, 0.08]}>
          <PresentationControls
            enabled={draggable}
            global={false}
            cursor={draggable}
            snap={DRAG_SNAP}
            speed={1.5}
            zoom={1.07}
            config={DRAG_SPRING}
            polar={DRAG_POLAR}
            azimuth={DRAG_AZIMUTH}
          >
            <group onPointerDown={draggable ? grabPhone : undefined}>
              <PhoneModel screenVideoSrc={videoSrc} screenVideoLoad={videoLoad} screenVideoPlaying={isPlaying} />
            </group>
          </PresentationControls>
        </Float>

        {/* Moves with the scroll animation but not with dragging the phone,
            and is always drawn over it (see COMPANION_RENDER_ORDER). */}
        {companionConfig ? (
          <>
            <mesh
              geometry={depthClearGeometry}
              material={depthClearMaterial}
              renderOrder={DEPTH_CLEAR_RENDER_ORDER}
              frustumCulled={false}
              onBeforeRender={clearDepth}
            />
            <Suspense fallback={null}>
              <Float speed={1.4} rotationIntensity={0.4} floatIntensity={0.5} floatingRange={[-0.12, 0.12]}>
                <companionConfig.Model
                  {...companionConfig.props}
                  renderOrder={COMPANION_RENDER_ORDER}
                  position={[
                    companionConfig.position[0] * facing,
                    companionConfig.position[1],
                    companionConfig.position[2],
                  ]}
                  rotation={[
                    companionConfig.rotation[0],
                    companionConfig.rotation[1],
                    companionConfig.rotation[2] * facing,
                  ]}
                />
              </Float>
            </Suspense>
          </>
        ) : null}
      </group>
    </>
  );
}
