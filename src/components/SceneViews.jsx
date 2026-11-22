import { Suspense, useEffect } from "react";
import { Canvas } from "@react-three/fiber";
import { View } from "@react-three/drei";
import ShowcasePhone from "./ShowcasePhone";
import WaypointJourney from "./WaypointJourney";
import { phoneGrab } from "./phoneGrab.js";

// Everything that needs three.js, in one module the page loads after its first
// paint. Each view is a <div> the canvas draws into (see drei's View).

export function PhoneView({ className, ...phoneProps }) {
  return (
    <View className={className}>
      <Suspense fallback={null}>
        <ShowcasePhone {...phoneProps} />
      </Suspense>
    </View>
  );
}

export function JourneyView({ className, ...journeyProps }) {
  return (
    <View className={className}>
      <Suspense fallback={null}>
        <WaypointJourney {...journeyProps} />
      </Suspense>
    </View>
  );
}

// Events come from the page, so each view's own element (under this
// pass-through layer) receives the pointer, e.g. to drag a phone.
export function SceneCanvas({ eventSource }) {
  // Touch: while a finger holds a phone, the page doesn't scroll, so the drag
  // spins the phone. Anywhere else, touches scroll as usual.
  useEffect(() => {
    const page = eventSource.current;
    if (!page) {
      return undefined;
    }
    const holdStill = (event) => {
      if (phoneGrab.active && event.cancelable) {
        event.preventDefault();
      }
    };
    const letGo = () => {
      phoneGrab.active = false;
    };
    page.addEventListener("touchmove", holdStill, { passive: false });
    window.addEventListener("pointerup", letGo);
    window.addEventListener("pointercancel", letGo);
    window.addEventListener("touchend", letGo);
    window.addEventListener("touchcancel", letGo);
    return () => {
      page.removeEventListener("touchmove", holdStill);
      window.removeEventListener("pointerup", letGo);
      window.removeEventListener("pointercancel", letGo);
      window.removeEventListener("touchend", letGo);
      window.removeEventListener("touchcancel", letGo);
    };
  }, [eventSource]);

  return (
    <Canvas dpr={[1, 2]} gl={{ antialias: true, alpha: true }} eventSource={eventSource} eventPrefix="client">
      <View.Port />
    </Canvas>
  );
}
