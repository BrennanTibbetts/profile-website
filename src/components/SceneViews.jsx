import { Suspense, useEffect, useRef } from "react";
import { Canvas } from "@react-three/fiber";
import ShowcasePhone from "./ShowcasePhone";
import WaypointJourney from "./WaypointJourney";
import { phoneGrab } from "./phoneGrab.js";

// Everything that needs three.js, in one module the page loads after its first
// paint. Each phone has its own canvas inside its section, so it scrolls with
// the page natively (a single fixed canvas lagged a frame behind fast
// scrolling, and the phones swam and flickered against their text).

// Let go of a phone when the finger or mouse comes up anywhere.
function letGo() {
  phoneGrab.active = false;
}
if (typeof window !== "undefined") {
  ["pointerup", "pointercancel", "touchend", "touchcancel"].forEach((type) => window.addEventListener(type, letGo));
}

/**
 * A canvas filling `className`'s box. `active` false stops drawing (the last
 * frame stays up) while its section is far off screen.
 */
function SceneCanvas({ className, active, children }) {
  const wrapRef = useRef(null);

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
      <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} frameloop={active ? "always" : "never"}>
        <Suspense fallback={null}>{children}</Suspense>
      </Canvas>
    </div>
  );
}

export function PhoneView({ className, active = true, ...phoneProps }) {
  return (
    <SceneCanvas className={className} active={active}>
      <ShowcasePhone {...phoneProps} />
    </SceneCanvas>
  );
}

export function JourneyView({ className, active = true, ...journeyProps }) {
  return (
    <SceneCanvas className={className} active={active}>
      <WaypointJourney {...journeyProps} />
    </SceneCanvas>
  );
}
