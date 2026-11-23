import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { apps } from "../apps";
import { posterFor } from "../models/PhoneModel";
import ShowcasePhone from "./ShowcasePhone";
import WaypointJourney from "./WaypointJourney";
import { phoneGrab } from "./phoneGrab.js";

// Everything that needs three.js, in one module the page loads after its first
// paint. Each phone has its own canvas inside its section, so it scrolls with
// the page natively (a single fixed canvas lagged a frame behind fast
// scrolling, and the phones swam and flickered against their text).
//
// So a phone is already there when you reach it:
//  - every model and first frame starts downloading as soon as this loads
//    (the models preload themselves; the first frames are below);
//  - a canvas near the screen is built straight away, and the rest are built
//    in the background, one at a time while the browser is idle, nearest
//    first (not on software-rendered WebGL, i.e. no GPU, where each build
//    takes seconds). A built canvas stops drawing while it's far off screen.

apps.forEach((app) => {
  if (app.video) {
    useTexture.preload(posterFor(app.video));
  }
});

// ---------- Building off-screen canvases in the background ----------

const waiting = new Set();
let building = null;
let cancelPending = null;
let softwareRendering = false;

// Called as each canvas is created; the first one tells us what's drawing.
function noteRenderer({ gl }) {
  const context = gl.getContext();
  const info = context.getExtension("WEBGL_debug_renderer_info");
  const renderer = info ? String(context.getParameter(info.UNMASKED_RENDERER_WEBGL)) : "";
  if (/swiftshader|llvmpipe|softpipe|software/i.test(renderer)) {
    softwareRendering = true;
  }
}

function whenIdle(callback) {
  if (typeof window.requestIdleCallback === "function") {
    const id = window.requestIdleCallback(callback, { timeout: 1500 });
    return () => window.cancelIdleCallback(id);
  }
  const id = window.setTimeout(callback, 200); // Safari has no requestIdleCallback
  return () => window.clearTimeout(id);
}

// Start the waiting canvas nearest the screen, once nothing else is building.
function buildNext() {
  if (building || cancelPending || waiting.size === 0) {
    return;
  }
  cancelPending = whenIdle(() => {
    cancelPending = null;
    if (building || waiting.size === 0 || softwareRendering) {
      return;
    }
    let nearest = null;
    waiting.forEach((job) => {
      if (!nearest || job.distance() < nearest.distance()) {
        nearest = job;
      }
    });
    waiting.delete(nearest);
    building = nearest;
    nearest.start();
  });
}

function finishBuilding(job) {
  if (job && building === job) {
    building = null;
    buildNext();
  }
}

// How far an element is from the screen, in pixels (0 when on screen).
function distanceFromScreen(element) {
  if (!element) {
    return Infinity;
  }
  const { top, bottom } = element.getBoundingClientRect();
  if (top > window.innerHeight) {
    return top - window.innerHeight;
  }
  return bottom < 0 ? -bottom : 0;
}

// ---------- Canvases ----------

// Let go of a phone when the finger or mouse comes up anywhere.
function letGo() {
  phoneGrab.active = false;
}
if (typeof window !== "undefined") {
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((type) => window.addEventListener(type, letGo));
}

// Mounts with the scene (only once everything in it has loaded) and reports
// after two frames, by which point shaders are compiled and textures uploaded.
function Ready({ onReady }) {
  const frames = useRef(0);
  useFrame(() => {
    frames.current += 1;
    if (frames.current === 2) {
      onReady();
    }
  });
  return null;
}

/**
 * A canvas filling `className`'s box. Built straight away when `near` (its
 * section is within a screen), otherwise in the background (see above). Once
 * ready, it only draws while `near`; the last frame stays up otherwise.
 */
function SceneCanvas({ className, near, children }) {
  const wrapRef = useRef(null);
  const jobRef = useRef(null);
  const [started, setStarted] = useState(near);
  const [ready, setReady] = useState(false);
  const live = started || near;

  // Not near and not built yet: wait for a turn in the background.
  useEffect(() => {
    if (live) {
      return undefined;
    }
    const job = {
      distance: () => distanceFromScreen(wrapRef.current),
      start: () => {
        jobRef.current = job;
        setStarted(true);
      },
    };
    waiting.add(job);
    buildNext();
    return () => waiting.delete(job);
  }, [live]);

  // Keep it once built, even after scrolling away.
  useEffect(() => {
    if (near) {
      setStarted(true);
    }
  }, [near]);

  // Free the background builder if this goes away mid-build.
  useEffect(() => () => finishBuilding(jobRef.current), []);

  const handleReady = useCallback(() => {
    setReady(true);
    finishBuilding(jobRef.current);
    jobRef.current = null;
  }, []);

  // Touch: while a finger holds the phone, the page doesn't scroll, so the
  // drag spins it. Anywhere else, touches scroll as usual.
  useEffect(() => {
    const wrap = wrapRef.current;
    const holdStill = (event) => {
      if (phoneGrab.active && event.cancelable) {
        event.preventDefault();
      }
    };
    wrap.addEventListener("touchmove", holdStill, { passive: false });
    return () => wrap.removeEventListener("touchmove", holdStill);
  }, []);

  return (
    <div ref={wrapRef} className={className}>
      {live ? (
        <Canvas
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: true }}
          frameloop={near || !ready ? "always" : "never"}
          onCreated={noteRenderer}
        >
          <Suspense fallback={null}>
            {children}
            <Ready onReady={handleReady} />
          </Suspense>
        </Canvas>
      ) : null}
    </div>
  );
}

export function PhoneView({ className, near = true, ...phoneProps }) {
  return (
    <SceneCanvas className={className} near={near}>
      <ShowcasePhone {...phoneProps} />
    </SceneCanvas>
  );
}

export function JourneyView({ className, near = true, ...journeyProps }) {
  return (
    <SceneCanvas className={className} near={near}>
      <WaypointJourney {...journeyProps} />
    </SceneCanvas>
  );
}
