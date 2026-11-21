import { useEffect, useMemo, useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

// Three-point goniometer, after the Angulo app icon: a vertex joint and two arm
// endpoints, with a solid wedge filling the angle and a live degree pill.
// It animates on its own until the pointer comes within range; then it holds
// still and any of the three joints can be dragged, like in the app.
const HOME_ARM_LENGTH = 1.6;
const JOINT_RADIUS = 0.2;
const JOINT_HIT_RADIUS = 0.42;
const ARM_RADIUS = 0.09;
const MIN_ANGLE_DEG = 62;
const MAX_ANGLE_DEG = 128;
const MIN_ARM_LENGTH = 1.15;
const MAX_ARM_LENGTH = 2.6;
const DRAG_BOUNDS = 2.6;
const RANGE_RADIUS = 2.5;
const RESUME_DELAY_SECONDS = 0.8;
const MIN_WEDGE_DEG = 8;
const SIDE_FADE_SECONDS = 0.12;

// Centre of the home pose, so the shape sits in the middle of the slide.
const LAYOUT_CENTER = new THREE.Vector2(0.35, 0.55);

// The wedge's straight sides run parallel to each arm at WEDGE_ARM_GAP,
// so it never cuts into the arm cylinders.
const WEDGE_INNER_RADIUS = 0.36;
const WEDGE_OUTER_RADIUS = 0.86;
const WEDGE_ARM_GAP = 0.15;
const WEDGE_DEPTH = 0.14;
const WEDGE_BEVEL = 0.03;
const PILL_DISTANCE = WEDGE_OUTER_RADIUS + 0.55;

function createWedgeGeometry(angle) {
  // Narrow angles can't fit the full arm gap, so the gap shrinks with the angle.
  const innerEdge = Math.min(Math.asin(WEDGE_ARM_GAP / WEDGE_INNER_RADIUS), angle * 0.3);
  const outerEdge = Math.min(Math.asin(WEDGE_ARM_GAP / WEDGE_OUTER_RADIUS), angle * 0.3);
  const shape = new THREE.Shape();
  shape.moveTo(Math.cos(innerEdge) * WEDGE_INNER_RADIUS, Math.sin(innerEdge) * WEDGE_INNER_RADIUS);
  shape.absarc(0, 0, WEDGE_OUTER_RADIUS, outerEdge, angle - outerEdge, false);
  shape.absarc(0, 0, WEDGE_INNER_RADIUS, angle - innerEdge, innerEdge, true);

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: WEDGE_DEPTH,
    curveSegments: 48,
    bevelEnabled: true,
    bevelThickness: WEDGE_BEVEL,
    bevelSize: WEDGE_BEVEL,
    bevelSegments: 4,
  });
  geometry.translate(0, 0, -WEDGE_DEPTH / 2);
  return geometry;
}

// Index 0 is the vertex; 1 and 2 are the arm endpoints.
function homePoints(angleDeg) {
  const angle = THREE.MathUtils.degToRad(angleDeg);
  return [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(HOME_ARM_LENGTH, 0),
    new THREE.Vector2(Math.cos(angle) * HOME_ARM_LENGTH, Math.sin(angle) * HOME_ARM_LENGTH),
  ];
}

function autoAngleDeg(time) {
  const wave = (Math.sin(time * 0.7) + 1) / 2;
  return MIN_ANGLE_DEG + (MAX_ANGLE_DEG - MIN_ANGLE_DEG) * wave;
}

function isValidPose(points) {
  const [vertex, a, b] = points;
  const lengths = [vertex.distanceTo(a), vertex.distanceTo(b)];
  return (
    lengths.every((length) => length >= MIN_ARM_LENGTH && length <= MAX_ARM_LENGTH) &&
    points.every(
      (point) =>
        Math.abs(point.x - LAYOUT_CENTER.x) <= DRAG_BOUNDS &&
        Math.abs(point.y - LAYOUT_CENTER.y) <= DRAG_BOUNDS
    )
  );
}

function setCursor(value) {
  if (typeof document !== "undefined") {
    document.body.style.cursor = value;
  }
}

export function GoniometerModel({
  accentColor = "#0a6b58",
  pillColor = "#34d3b4",
  tilt = [0, 0, 0],
  isActive = false,
  interactionEnabled = true,
  holdStill = false,
  onDragStart,
  onDragEnd,
  onReady,
  ...props
}) {
  const floatRef = useRef(null);
  const planeRef = useRef(null);
  const jointRefs = [useRef(null), useRef(null), useRef(null)];
  const armRefs = [useRef(null), useRef(null)];
  const wedgeRef = useRef(null);
  const pillAnchorRef = useRef(null);
  const pillTextRef = useRef(null);
  const hasNotifiedReadyRef = useRef(false);

  const pointsRef = useRef(homePoints(MIN_ANGLE_DEG));
  const autoTimeRef = useRef(0);
  const floatTimeRef = useRef(Math.random() * 100);
  const isHoveringRef = useRef(false);
  const dragRef = useRef(null);
  const idleSinceRef = useRef(Infinity);
  const lastLabelRef = useRef("");
  const displayedSideRef = useRef(null);
  const sideFadeRef = useRef(1);
  const shownSweepRef = useRef({ start: 0, angle: THREE.MathUtils.degToRad(MIN_ANGLE_DEG) });
  const [hoveredJoint, setHoveredJoint] = useState(null);

  useEffect(() => {
    if (!onReady || hasNotifiedReadyRef.current) {
      return;
    }
    hasNotifiedReadyRef.current = true;
    onReady();
  }, [onReady]);

  // Base colours are darker than they render: the scene's strong ambient light
  // (shared with the other slides) would otherwise wash out all shading.
  const jointMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#8a9296", roughness: 0.25, metalness: 0.05 }),
    []
  );
  const activeJointMaterial = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: "#8a9296",
        roughness: 0.25,
        metalness: 0.05,
        emissive: pillColor,
        emissiveIntensity: 0.35,
      }),
    [pillColor]
  );
  const armMaterial = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#737b80", roughness: 0.3, metalness: 0.1 }),
    []
  );
  const wedgeMaterial = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: accentColor,
        roughness: 0.3,
        metalness: 0.1,
        clearcoat: 0.5,
        clearcoatRoughness: 0.25,
        envMapIntensity: 0.8,
        emissive: accentColor,
        emissiveIntensity: 0.12,
        transparent: true,
      }),
    [accentColor]
  );
  const hitMaterial = useMemo(
    () => new THREE.MeshBasicMaterial({ transparent: true, opacity: 0, depthWrite: false, colorWrite: false }),
    []
  );

  // One wedge geometry per whole degree, built on first use and reused.
  const wedgeGeometries = useMemo(() => new Map(), []);
  const getWedgeGeometry = (degrees) => {
    let geometry = wedgeGeometries.get(degrees);
    if (!geometry) {
      geometry = createWedgeGeometry(THREE.MathUtils.degToRad(degrees));
      wedgeGeometries.set(degrees, geometry);
    }
    return geometry;
  };
  const initialWedgeGeometry = getWedgeGeometry(MIN_ANGLE_DEG);

  // Scratch objects for the per-move maths.
  const scratch = useMemo(
    () => ({
      plane: new THREE.Plane(),
      normal: new THREE.Vector3(),
      origin: new THREE.Vector3(),
      hit: new THREE.Vector3(),
    }),
    []
  );

  useEffect(
    () => () => {
      [jointMaterial, activeJointMaterial, armMaterial, wedgeMaterial, hitMaterial].forEach((m) => m.dispose());
      wedgeGeometries.forEach((geometry) => geometry.dispose());
      wedgeGeometries.clear();
    },
    [jointMaterial, activeJointMaterial, armMaterial, wedgeMaterial, hitMaterial, wedgeGeometries]
  );

  const canInteract = isActive && interactionEnabled;

  // Leaving the slide or turning interaction off ends any hover or drag.
  useEffect(() => {
    if (canInteract) {
      return;
    }
    isHoveringRef.current = false;
    if (dragRef.current) {
      dragRef.current = null;
      onDragEnd?.();
    }
    setHoveredJoint(null);
    setCursor("");
  }, [canInteract, onDragEnd]);

  useEffect(() => () => setCursor(""), []);

  const pointerToPlane = (event) => {
    const plane = planeRef.current;
    if (!plane) {
      return null;
    }
    plane.updateWorldMatrix(true, false);
    scratch.normal.set(0, 0, 1).transformDirection(plane.matrixWorld);
    scratch.origin.setFromMatrixPosition(plane.matrixWorld);
    scratch.plane.setFromNormalAndCoplanarPoint(scratch.normal, scratch.origin);
    if (!event.ray.intersectPlane(scratch.plane, scratch.hit)) {
      return null;
    }
    const local = plane.worldToLocal(scratch.hit);
    return new THREE.Vector2(local.x, local.y);
  };

  const handleJointDown = (index) => (event) => {
    if (!canInteract) {
      return;
    }
    event.stopPropagation();
    const hit = pointerToPlane(event);
    if (!hit) {
      return;
    }
    event.target.setPointerCapture(event.pointerId);
    dragRef.current = { index, pointerId: event.pointerId, offset: hit.sub(pointsRef.current[index]) };
    setCursor("grabbing");
    onDragStart?.();
  };

  const handleJointMove = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    const hit = pointerToPlane(event);
    if (!hit) {
      return;
    }
    const next = pointsRef.current.map((point) => point.clone());
    const target = hit.sub(drag.offset);
    target.x = THREE.MathUtils.clamp(target.x, LAYOUT_CENTER.x - DRAG_BOUNDS, LAYOUT_CENTER.x + DRAG_BOUNDS);
    target.y = THREE.MathUtils.clamp(target.y, LAYOUT_CENTER.y - DRAG_BOUNDS, LAYOUT_CENTER.y + DRAG_BOUNDS);
    if (drag.index !== 0) {
      // Endpoints slide along the arm-length limits instead of sticking.
      const arm = target.clone().sub(next[0]);
      const length = THREE.MathUtils.clamp(arm.length(), MIN_ARM_LENGTH, MAX_ARM_LENGTH);
      target.copy(next[0]).add(arm.setLength(length));
    }
    next[drag.index].copy(target);
    if (isValidPose(next)) {
      pointsRef.current = next;
    }
  };

  const handleJointUp = (event) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }
    event.stopPropagation();
    event.target.releasePointerCapture(event.pointerId);
    dragRef.current = null;
    setCursor(hoveredJoint !== null ? "grab" : "");
    onDragEnd?.();
  };

  const handleJointOver = (index) => () => {
    if (!canInteract) {
      return;
    }
    setHoveredJoint(index);
    if (!dragRef.current) {
      setCursor("grab");
    }
  };

  const handleJointOut = () => {
    setHoveredJoint(null);
    if (!dragRef.current) {
      setCursor("");
    }
  };

  useFrame((state, delta) => {
    const dt = Math.min(delta, 0.1);
    const now = state.clock.elapsedTime;
    const engaged = canInteract && (holdStill || isHoveringRef.current || dragRef.current !== null);
    if (engaged) {
      idleSinceRef.current = Infinity;
    } else if (idleSinceRef.current === Infinity) {
      idleSinceRef.current = now;
    }
    const isAuto = !engaged && now - idleSinceRef.current >= RESUME_DELAY_SECONDS;

    // Gentle float, paused (not reset) while the user is engaged.
    if (!engaged) {
      floatTimeRef.current += dt;
    }
    if (floatRef.current) {
      const t = (floatTimeRef.current * 1.4) / 4;
      floatRef.current.rotation.set((Math.cos(t) / 8) * 0.6, (Math.sin(t) / 8) * 0.6, (Math.sin(t) / 20) * 0.6);
      floatRef.current.position.y = (Math.sin(t) / 10) * 0.4;
    }

    // Auto mode glides the joints back to the home pose and sweeps the angle.
    if (isAuto) {
      autoTimeRef.current += dt;
      const targets = homePoints(autoAngleDeg(autoTimeRef.current));
      const blend = 1 - Math.exp(-dt * 5);
      pointsRef.current.forEach((point, i) => point.lerp(targets[i], blend));
    }

    const points = pointsRef.current;
    const [vertex, a, b] = points;

    jointRefs.forEach((ref, i) => {
      ref.current?.position.set(points[i].x, points[i].y, 0);
    });

    [a, b].forEach((end, i) => {
      const arm = armRefs[i].current;
      if (!arm) {
        return;
      }
      const dx = end.x - vertex.x;
      const dy = end.y - vertex.y;
      arm.position.set((vertex.x + end.x) / 2, (vertex.y + end.y) / 2, 0);
      arm.rotation.set(0, 0, Math.atan2(dy, dx) - Math.PI / 2);
      arm.scale.set(1, Math.hypot(dx, dy), 1);
    });

    // Inner angle at the vertex; the wedge sweeps counter-clockwise
    // from whichever arm comes first.
    const angleA = Math.atan2(a.y - vertex.y, a.x - vertex.x);
    const angleB = Math.atan2(b.y - vertex.y, b.x - vertex.x);
    const signedSweep = Math.atan2(Math.sin(angleB - angleA), Math.cos(angleB - angleA));
    const innerAngle = Math.abs(signedSweep);
    const innerDeg = THREE.MathUtils.radToDeg(innerAngle);

    // When an arm crosses the other (through 0° or 180°) the wedge and pill
    // switch sides. Rather than jump, the old side fades out in place, then the
    // new side fades in.
    const side = signedSweep >= 0 ? 1 : -1;
    if (displayedSideRef.current === null) {
      displayedSideRef.current = side;
    }
    const fadeStep = dt / SIDE_FADE_SECONDS;
    if (side !== displayedSideRef.current) {
      sideFadeRef.current = Math.max(0, sideFadeRef.current - fadeStep);
      if (sideFadeRef.current === 0) {
        displayedSideRef.current = side;
      }
    } else {
      sideFadeRef.current = Math.min(1, sideFadeRef.current + fadeStep);
    }
    if (side === displayedSideRef.current) {
      shownSweepRef.current.start = side > 0 ? angleA : angleB;
      shownSweepRef.current.angle = innerAngle;
    }
    const { start, angle: shownAngle } = shownSweepRef.current;
    const opacity = sideFadeRef.current;

    const wedge = wedgeRef.current;
    if (wedge) {
      const wholeDeg = Math.round(THREE.MathUtils.radToDeg(shownAngle));
      wedge.visible = wholeDeg >= MIN_WEDGE_DEG && opacity > 0;
      if (wedge.visible) {
        const geometry = getWedgeGeometry(wholeDeg);
        if (wedge.geometry !== geometry) {
          wedge.geometry = geometry;
        }
      }
      wedge.position.set(vertex.x, vertex.y, 0);
      wedge.rotation.set(0, 0, start);
      wedgeMaterial.opacity = opacity;
    }

    if (pillTextRef.current) {
      pillTextRef.current.style.opacity = String(opacity);
    }
    const bisector = start + shownAngle / 2;
    pillAnchorRef.current?.position.set(
      vertex.x + Math.cos(bisector) * PILL_DISTANCE,
      vertex.y + Math.sin(bisector) * PILL_DISTANCE,
      0
    );
    const label = `${innerDeg.toFixed(1)}°`;
    if (pillTextRef.current && label !== lastLabelRef.current) {
      pillTextRef.current.textContent = label;
      lastLabelRef.current = label;
    }
  });

  const renderJoint = (index) => (
    <group
      key={index}
      ref={jointRefs[index]}
      onPointerDown={handleJointDown(index)}
      onPointerMove={handleJointMove}
      onPointerUp={handleJointUp}
      onPointerCancel={handleJointUp}
      onPointerOver={handleJointOver(index)}
      onPointerOut={handleJointOut}
    >
      <mesh material={canInteract && hoveredJoint === index ? activeJointMaterial : jointMaterial}>
        <sphereGeometry args={[JOINT_RADIUS, 48, 48]} />
      </mesh>
      {canInteract ? (
        <mesh material={hitMaterial}>
          <sphereGeometry args={[JOINT_HIT_RADIUS, 16, 16]} />
        </mesh>
      ) : null}
    </group>
  );

  return (
    <group {...props} dispose={null}>
      <group ref={floatRef}>
        <group rotation={tilt}>
          <group ref={planeRef} position={[-LAYOUT_CENTER.x, -LAYOUT_CENTER.y, 0]}>
            {canInteract ? (
              <mesh
                material={hitMaterial}
                position={[LAYOUT_CENTER.x, LAYOUT_CENTER.y, -0.1]}
                onPointerOver={() => {
                  isHoveringRef.current = true;
                }}
                onPointerOut={() => {
                  isHoveringRef.current = false;
                }}
              >
                <circleGeometry args={[RANGE_RADIUS, 48]} />
              </mesh>
            ) : null}

            <mesh ref={wedgeRef} geometry={initialWedgeGeometry} material={wedgeMaterial} />

            {[0, 1].map((i) => (
              <mesh key={i} ref={armRefs[i]} material={armMaterial}>
                <cylinderGeometry args={[ARM_RADIUS, ARM_RADIUS, 1, 32]} />
              </mesh>
            ))}

            {[0, 1, 2].map(renderJoint)}

            <group ref={pillAnchorRef}>
              {isActive ? (
                <Html center zIndexRange={[4, 0]} pointerEvents="none">
                  <span
                    ref={pillTextRef}
                    className="goniometer-pill"
                    style={{ "--goniometer-pill-color": pillColor }}
                  >
                    {lastLabelRef.current || `${MIN_ANGLE_DEG.toFixed(1)}°`}
                  </span>
                </Html>
              ) : null}
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
