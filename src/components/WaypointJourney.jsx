import { useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { Float, Line, PerspectiveCamera, PresentationControls, RoundedBox, Text } from "@react-three/drei";
import * as THREE from "three";
import PhoneLighting from "./PhoneLighting.jsx";
import { PhoneModel } from "../models/PhoneModel.jsx";
import { grabPhone } from "./phoneGrab.js";
import GlowTrail from "./GlowTrail.jsx";

const DEG = Math.PI / 180;
const FONT = "/fonts/fraunces/fraunces-3d.woff";
const CAMERA_Z = 9;
const FOV = 40;
const TILE = { width: 1.4, height: 0.78, depth: 0.12 };

// The diagram, in order along the request's path. The two ends are phones:
// a submission is saved, the write emits a change event, and that triggers
// the Lambda that pushes a notification to another device.
const STOPS = [
  { id: "phoneA" },
  { id: "gateway", label: "API Gateway", sub: "Auth · routing", color: "#a77bff" },
  { id: "logic", label: "Lambda", sub: "Business logic", color: "#ff9a3d" },
  { id: "table", label: "DynamoDB", sub: "Saves the record", color: "#6d8cff" },
  { id: "stream", label: "Event", sub: "DynamoDB Streams", color: "#e2589b" },
  { id: "notify", label: "Lambda", sub: "Push via APNs", color: "#ff9a3d" },
  { id: "phoneB" },
];
const LAST = STOPS.length - 1;

// Tiles alternate to either side of the flow, so the path makes S-turns back
// and forth between them (left to right on desktop, top to bottom on phones).
// Phones sit on the centre line.
const SIDE_OFFSET = [0, 1, -1, 1, -1, 1, 0];


// Phones: the diagram runs straight down, taller than the screen, and the
// view pans down with the request (scene units between stops).
const VERTICAL_STEP = 1.6;
const VERTICAL_SWAY = 0.55;
// How far below the top/above the bottom stop the view rests on phones.
const VERTICAL_VIEW_INSET = 2;
// Half the phone's height at scale 1 (PhoneModel is about 5 units tall).
const PHONE_HALF_HEIGHT = 2.5;

// Scroll phases (fractions of the pinned track).
const MORPH = [0.14, 0.4]; // phone moves from its section pose into the diagram
const DIAGRAM_IN = [0.3, 0.46]; // tiles, lines and the second phone appear
const REQUEST = [0.5, 0.88]; // the submission travels to the second phone

const DRAG_POLAR = [-35 * DEG, 35 * DEG];
const DRAG_AZIMUTH = [-65 * DEG, 65 * DEG];
const DRAG_SPRING = { mass: 2.55, tension: 286, friction: 39 };
const DRAG_SNAP = { mass: 1.75, tension: 780, friction: 18 };

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

/** Layout for the current view size: stop positions and the phone's poses. */
function useJourneyLayout() {
  const size = useThree((state) => state.size);
  return useMemo(() => {
    const aspect = size.width / Math.max(size.height, 1);
    const height = 2 * CAMERA_Z * Math.tan((FOV / 2) * DEG);
    const width = height * aspect;
    const vertical = aspect < 0.9;

    const span = Math.min(width * 0.92, (Math.min(1280, size.width - 96) / size.width) * width);
    const stops = SIDE_OFFSET.map((side, i) => {
      const u = i / LAST;
      if (vertical) {
        return [side * VERTICAL_SWAY, -i * VERTICAL_STEP];
      }
      // Desktop: left to right under the "Under the hood" intro.
      return [(u - 0.5) * span * 0.94, -height * 0.24 + side * height * 0.12];
    });
    // Phones: where the view sits before and after the request travels.
    const viewTop = stops[0][1] - VERTICAL_VIEW_INSET;
    const viewBottom = stops[LAST][1] + VERTICAL_VIEW_INSET;

    // The section pose matches the other app sections: on desktop, centred in
    // the right-hand column of the 1120px layout; on phones, centred.
    const columnWidth = Math.min(1120, size.width - 96);
    const rightColumnX = ((columnWidth / 4) / size.width) * width;
    return {
      vertical,
      stops,
      viewTop,
      viewBottom,
      // On phones the phone starts near the top of the view, right under the
      // Waypoint text, instead of centred with a gap above it.
      startPose: vertical
        ? { position: [0, viewTop + Math.max(height / 2 - PHONE_HALF_HEIGHT * 0.62 - 0.3, 0)], scale: 0.62, turn: 0 }
        : { position: [rightColumnX, 0], scale: 0.9, turn: -18 * DEG },
      nodePhoneScale: vertical ? 0.26 : 0.34,
      tileScale: vertical ? 0.82 : 0.8,
    };
  }, [size.width, size.height]);
}

function Tile({ stop, position, glowRef, revealRef, index, scale = 1 }) {
  const groupRef = useRef(null);
  const tileMaterialRef = useRef(null);

  useFrame(() => {
    const glow = glowRef.current[index] ?? 0;
    const reveal = revealRef.current;
    if (groupRef.current) {
      // Swell as the light passes behind.
      groupRef.current.scale.setScalar(Math.max(reveal, 0.0001) * scale * (1 + glow * 0.16));
      groupRef.current.visible = reveal > 0.001;
    }
    if (tileMaterialRef.current) {
      // ...and light up in the tile's own colour.
      tileMaterialRef.current.emissiveIntensity = 0.06 + glow * 1.25;
    }
  });

  return (
    <group ref={groupRef} position={[position[0], position[1], 0]}>
      <RoundedBox args={[TILE.width, TILE.height, TILE.depth]} radius={0.12} smoothness={4}>
        <meshStandardMaterial
          ref={tileMaterialRef}
          color="#151515"
          emissive={stop.color}
          emissiveIntensity={0.06}
          roughness={0.55}
          metalness={0.1}
        />
      </RoundedBox>
      <mesh position={[0, TILE.height / 2 - 0.07, TILE.depth / 2 + 0.002]}>
        <planeGeometry args={[TILE.width - 0.36, 0.05]} />
        <meshBasicMaterial color={stop.color} toneMapped={false} />
      </mesh>
      <Text font={FONT} fontSize={0.2} color="#f4f4f4" anchorX="center" anchorY="middle" position={[0, 0.06, TILE.depth / 2 + 0.01]}>
        {stop.label}
      </Text>
      <Text font={FONT} fontSize={0.125} color={stop.color} anchorX="center" anchorY="middle" position={[0, -0.19, TILE.depth / 2 + 0.01]}>
        {stop.sub}
      </Text>
    </group>
  );
}

/** A notification banner across the top of the receiving phone's screen. */
function PushBanner({ bannerRef }) {
  return (
    <group ref={bannerRef} position={[0, 1.65, 0.35]} scale={0.0001}>
      <RoundedBox args={[2.15, 0.62, 0.03]} radius={0.14} smoothness={4}>
        <meshBasicMaterial color="#f2f2f2" toneMapped={false} />
      </RoundedBox>
      <Text font={FONT} fontSize={0.17} color="#111111" anchorX="left" anchorY="middle" position={[-0.9, 0.12, 0.03]}>
        Waypoint
      </Text>
      <Text font={FONT} fontSize={0.14} color="#444444" anchorX="left" anchorY="middle" position={[-0.9, -0.12, 0.03]}>
        Update received
      </Text>
    </group>
  );
}

/**
 * Waypoint's pinned scroll scene. `progressRef.current` (0..1) is how far the
 * page has scrolled through the section's track:
 *  - at first it's an ordinary app section (phone beside the text, draggable);
 *  - then the phone shrinks and moves into the first stop of a diagram;
 *  - then a submission travels from it through API Gateway and a Lambda into
 *    DynamoDB; the write's change event triggers another Lambda, which pushes
 *    a notification to a second phone running Waypoint.
 */
export default function WaypointJourney({ progressRef, videoSrc, videoLoad = false, isPlaying, draggable }) {
  const layout = useJourneyLayout();
  const { vertical, stops, viewTop, viewBottom, startPose, nodePhoneScale, tileScale } = layout;
  const camera = useThree((state) => state.camera);

  const phoneARef = useRef(null);
  const phoneBRef = useRef(null);
  const bannerRef = useRef(null);
  // Where the travelling light's head is along the path (0..1), or null.
  const lightHeadRef = useRef(null);
  const lineRef = useRef(null);
  const progressSmoothRef = useRef(0);
  const glowRef = useRef([]);
  const revealRef = useRef(0);
  const dragEnabledRef = useRef(true);

  // S-turns: each leg eases out of one stop and into the next (a half cosine
  // wave across the flow), so the path is level at every stop and swings
  // smoothly to the other side between them. The request moves along it at
  // an even speed (by arc length).
  const curve = useMemo(() => {
    const samples = [];
    const perLeg = 32;
    for (let leg = 0; leg < stops.length - 1; leg += 1) {
      const [ax, ay] = stops[leg];
      const [bx, by] = stops[leg + 1];
      for (let k = leg === 0 ? 0 : 1; k <= perLeg; k += 1) {
        const f = k / perLeg;
        const wave = (1 - Math.cos(Math.PI * f)) / 2;
        samples.push(
          vertical
            ? new THREE.Vector3(lerp(ax, bx, wave), lerp(ay, by, f), 0)
            : new THREE.Vector3(lerp(ax, bx, f), lerp(ay, by, wave), 0)
        );
      }
    }
    return new THREE.CatmullRomCurve3(samples, false, "centripetal");
  }, [stops, vertical]);
  // The light takes the colour of the last box it went through (warm white
  // until the first one). Each stop's position along the curve is found once.
  const lightColorAt = useMemo(() => {
    const samples = curve.getSpacedPoints(600);
    const stopTs = stops.map(([x, y]) => {
      let best = 0;
      let bestDistance = Infinity;
      samples.forEach((sample, k) => {
        const distance = Math.hypot(sample.x - x, sample.y - y);
        if (distance < bestDistance) {
          bestDistance = distance;
          best = k / (samples.length - 1);
        }
      });
      return best;
    });
    const colors = STOPS.map((stop) => new THREE.Color(stop.color ?? "#ffe2b8"));
    return (t) => {
      let last = 0;
      for (let i = 1; i < LAST; i += 1) {
        if (t >= stopTs[i]) {
          last = i;
        }
      }
      return colors[last];
    };
  }, [curve, stops]);

  const linePoints = useMemo(() => curve.getSpacedPoints(400).map((point) => [point.x, point.y, -0.45]), [curve]);
  const scratch = useMemo(() => new THREE.Vector3(), []);
  const pointAt = (t) => {
    curve.getPointAt(THREE.MathUtils.clamp(t, 0, 1), scratch);
    return [scratch.x, scratch.y];
  };

  useFrame((_, delta) => {
    const ease = 1 - Math.exp(-Math.min(delta, 0.1) * 8);
    progressSmoothRef.current += ((progressRef.current ?? 0) - progressSmoothRef.current) * ease;
    const p = progressSmoothRef.current;

    const morph = smoothstep(MORPH[0], MORPH[1], p);
    const reveal = smoothstep(DIAGRAM_IN[0], DIAGRAM_IN[1], p);
    const request = THREE.MathUtils.clamp((p - REQUEST[0]) / (REQUEST[1] - REQUEST[0]), 0, 1);
    revealRef.current = reveal;
    dragEnabledRef.current = morph < 0.02;

    // The Waypoint phone: from its section pose into the first stop.
    const phoneA = phoneARef.current;
    if (phoneA) {
      phoneA.position.set(lerp(startPose.position[0], stops[0][0], morph), lerp(startPose.position[1], stops[0][1], morph), 0);
      phoneA.scale.setScalar(lerp(startPose.scale, nodePhoneScale, morph));
      phoneA.rotation.y = lerp(startPose.turn, 0, morph);
    }

    // The receiving phone appears with the diagram.
    const phoneB = phoneBRef.current;
    if (phoneB) {
      phoneB.position.set(stops[LAST][0], stops[LAST][1], 0);
      phoneB.scale.setScalar(Math.max(nodePhoneScale * reveal, 0.0001));
      phoneB.visible = reveal > 0.001;
    }

    if (lineRef.current?.material) {
      lineRef.current.material.opacity = 0.25 * reveal;
    }

    // The submission and its trail.
    // The light, drawn behind the tiles (see GlowTrail below).
    const travelling = request > 0 && request < 1;
    lightHeadRef.current = travelling ? request : null;
    const head = pointAt(request);

    // Light up each stop as the light passes it.
    glowRef.current = stops.map(([x, y]) =>
      travelling ? THREE.MathUtils.clamp(1 - Math.hypot(head[0] - x, head[1] - y) / 1.2, 0, 1) : 0
    );

    // Phones: the view pans down with the request, resting at the top before
    // it leaves and at the bottom once it has arrived.
    const targetViewY = vertical ? THREE.MathUtils.clamp(head[1], viewBottom, viewTop) : 0;
    camera.position.y += (targetViewY - camera.position.y) * ease;

    // The notification pops onto the second phone when the push arrives.
    if (bannerRef.current) {
      const pop = smoothstep(0.96, 1, request);
      bannerRef.current.scale.setScalar(Math.max(pop, 0.0001));
    }
  });

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, CAMERA_Z]} fov={FOV} />
      <PhoneLighting />

      <Line ref={lineRef} points={linePoints} color="#ffffff" lineWidth={1.5} transparent opacity={0} />

      {STOPS.slice(1, LAST).map((stop, i) => (
        <Tile
          key={stop.id}
          stop={stop}
          index={i + 1}
          position={stops[i + 1]}
          scale={tileScale}
          glowRef={glowRef}
          revealRef={revealRef}
        />
      ))}

      <group ref={phoneARef}>
        <Float speed={1.05} rotationIntensity={0.2} floatIntensity={0.25} floatingRange={[-0.06, 0.06]}>
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
      </group>

      {/* The receiving phone runs Waypoint too, half a loop out of step. */}
      <group ref={phoneBRef} visible={false}>
        <PhoneModel screenVideoSrc={videoSrc} screenVideoLoad={videoLoad} screenVideoPlaying={isPlaying} screenVideoOffset={0.5} />
        <PushBanner bannerRef={bannerRef} />
      </group>

      {/* Behind the tiles (which hide it as it passes), in front of the line. */}
      <GlowTrail curve={curve} headRef={lightHeadRef} colorAt={lightColorAt} z={-0.32} tailLength={0.09} />
    </>
  );
}
