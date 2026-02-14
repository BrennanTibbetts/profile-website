import { useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AsciiRenderer, Text3D } from "@react-three/drei";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontData from "three/examples/fonts/helvetiker_bold.typeface.json";

const FONT_PATH = "/fonts/helvetiker_bold.typeface.json";
const ASCII_CHARACTER_SET = " .:-=+*#%@";
const ASCII_RESOLUTION_DESKTOP = 0.21;
const ASCII_RESOLUTION_MOBILE = 0.36;
const MOBILE_BREAKPOINT = 768;
const MOBILE_HINT_STORAGE_KEY = "homeAsciiTouchHintSeen";

function NameText3D({ isMobileHintActive, pointerRef }) {
  const rootRef = useRef();
  const { size, viewport } = useThree();
  const isMobile = size.width <= MOBILE_BREAKPOINT;

  const lines = ["Brennan", "Tibbetts"];
  const fontSize = isMobile ? 0.84 : 1.18;
  const textHeight = isMobile ? 0.2 : 0.3;
  const lineGap = isMobile ? 1 : 1.28;
  const tracking = fontSize * (isMobile ? 0.085 : 0.095);

  const parsedFont = useMemo(() => {
    const loader = new FontLoader();
    return loader.parse(fontData);
  }, []);

  const { letterLayout, layoutWidth } = useMemo(() => {
    const geometryOptions = {
      font: parsedFont,
      size: fontSize,
      height: textHeight,
      curveSegments: 6,
      bevelEnabled: false,
    };

    let widestLine = 0;

    const rawLetters = lines.flatMap((line, lineIndex) => {
      const characters = line.split("");
      const baseY = (lines.length - 1) * 0.5 * lineGap - lineIndex * lineGap;
      const direction = lineIndex === 0 ? 1 : -1;
      const glyphMetrics = characters.map((char) => {
        const geometry = new TextGeometry(char, geometryOptions);
        geometry.computeBoundingBox();

        const minX = geometry.boundingBox?.min.x ?? 0;
        const maxX = geometry.boundingBox?.max.x ?? fontSize * 0.5;
        const minY = geometry.boundingBox?.min.y ?? 0;
        const maxY = geometry.boundingBox?.max.y ?? fontSize;
        const width = Math.max(maxX - minX, fontSize * 0.25);

        geometry.dispose();
        return { minX, maxX, maxY, minY, width };
      });

      const lineWidth =
        glyphMetrics.reduce((sum, metric) => sum + metric.width, 0) + tracking * (glyphMetrics.length - 1);
      widestLine = Math.max(widestLine, lineWidth);

      let cursorX = -lineWidth * 0.5;

      return characters.map((char, charIndex) => {
        const metric = glyphMetrics[charIndex];
        const baseX = cursorX - metric.minX;
        const influenceY = direction > 0 ? baseY + metric.minY : baseY + metric.maxY;
        cursorX += metric.width + tracking;

        return {
          key: `${lineIndex}-${charIndex}-${char}`,
          char,
          baseX,
          baseY,
          direction,
          influenceY,
          minX: metric.minX,
          maxX: metric.maxX,
          minY: metric.minY,
          maxY: metric.maxY,
        };
      });
    });

    const bounds = rawLetters.reduce(
      (acc, letter) => {
        const left = letter.baseX + letter.minX;
        const right = letter.baseX + letter.maxX;
        const bottom = letter.baseY + letter.minY;
        const top = letter.baseY + letter.maxY;

        return {
          minX: Math.min(acc.minX, left),
          maxX: Math.max(acc.maxX, right),
          minY: Math.min(acc.minY, bottom),
          maxY: Math.max(acc.maxY, top),
        };
      },
      { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity }
    );

    const centerX = Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) ? (bounds.minX + bounds.maxX) * 0.5 : 0;
    const centerY = Number.isFinite(bounds.minY) && Number.isFinite(bounds.maxY) ? (bounds.minY + bounds.maxY) * 0.5 : 0;

    const centeredLetters = rawLetters.map((letter) => ({
      ...letter,
      baseX: letter.baseX - centerX,
      baseY: letter.baseY - centerY,
      influenceY: letter.influenceY - centerY,
    }));

    const measuredWidth =
      Number.isFinite(bounds.minX) && Number.isFinite(bounds.maxX) ? Math.max(bounds.maxX - bounds.minX, 0) : widestLine;

    return { letterLayout: centeredLetters, layoutWidth: measuredWidth };
  }, [lineGap, fontSize, parsedFont, textHeight, tracking]);

  const layoutScale = useMemo(() => {
    const safeWidth = viewport.width * (isMobile ? 0.94 : 0.9);
    if (layoutWidth <= 0) {
      return 1;
    }

    return Math.min(1, safeWidth / layoutWidth);
  }, [isMobile, layoutWidth, viewport.width]);

  const letterRefs = useRef([]);

  useEffect(() => {
    letterRefs.current = letterLayout.map((_, index) => letterRefs.current[index] ?? null);
  }, [letterLayout]);

  useFrame(() => {
    const pointer = pointerRef.current;
    const demoEnabled = isMobile && isMobileHintActive && !pointer.active;
    const demoSeconds = (performance.now() - (pointer.demoStartedAt || 0)) * 0.001;
    const demoTargetX = 0;
    const demoTargetY = demoEnabled ? Math.cos(demoSeconds * 1.7) * 0.14 : 0;
    const targetX = pointer.active ? pointer.targetX : demoTargetX;
    const targetY = pointer.active ? pointer.targetY : demoTargetY;
    pointer.x += (targetX - pointer.x) * 0.08;
    pointer.y += (targetY - pointer.y) * 0.08;

    const baseGroupY = isMobile ? 0 : 0.2;

    if (rootRef.current) {
      const targetRotX = pointer.y * 0.075;
      const targetRotY = pointer.x * 0.13;
      const targetRotZ = pointer.x * 0.02;

      const targetGroupX = pointer.x * (isMobile ? 0.08 : 0.12);
      const targetGroupY = baseGroupY + pointer.y * (isMobile ? 0.06 : 0.08);

      rootRef.current.rotation.x += (targetRotX - rootRef.current.rotation.x) * 0.08;
      rootRef.current.rotation.y += (targetRotY - rootRef.current.rotation.y) * 0.08;
      rootRef.current.rotation.z += (targetRotZ - rootRef.current.rotation.z) * 0.08;
      rootRef.current.position.x += (targetGroupX - rootRef.current.position.x) * 0.08;
      rootRef.current.position.y += (targetGroupY - rootRef.current.position.y) * 0.08;
    }

    const pointerWorldX = pointer.x * (viewport.width * 0.5);
    const pointerWorldY = pointer.y * (viewport.height * 0.5);
    const rootX = rootRef.current?.position.x ?? 0;
    const rootY = rootRef.current?.position.y ?? 0;
    const pointerLocalX = (pointerWorldX - rootX) / layoutScale;
    const pointerLocalY = (pointerWorldY - rootY) / layoutScale;

    const amplitude = isMobile ? 0.2 : 0.3;
    const falloff = isMobile ? 1.95 : 1.65;
    const yLerp = 0.2;

    for (let index = 0; index < letterLayout.length; index += 1) {
      const letter = letterLayout[index];
      const ref = letterRefs.current[index];

      if (!ref) {
        continue;
      }

      const dx = letter.baseX - pointerLocalX;
      const dy = letter.influenceY - pointerLocalY;
      const distance = Math.sqrt(dx * dx + dy * dy);
      const interactionStrength = pointer.active ? 1 : demoEnabled ? 0.5 : 0;
      const influence = Math.exp(-distance * falloff) * interactionStrength;

      const targetY = letter.baseY + letter.direction * amplitude * influence;

      ref.position.x = letter.baseX;
      ref.position.y += (targetY - ref.position.y) * yLerp;
    }
  });

  return (
    <group ref={rootRef} scale={layoutScale}>
      {letterLayout.map((letter, index) => (
        <group
          key={letter.key}
          ref={(node) => {
            letterRefs.current[index] = node;
          }}
          position={[letter.baseX, letter.baseY, 0]}
        >
          <Text3D font={FONT_PATH} size={fontSize} height={textHeight} curveSegments={6} bevelEnabled={false}>
            {letter.char}
            <meshStandardMaterial color="#ffffff" roughness={0.42} metalness={0.12} flatShading />
          </Text3D>
        </group>
      ))}
    </group>
  );
}

export default function NameAsciiScene({ theme = "dark" }) {
  const isLight = theme === "light";
  const containerRef = useRef(null);
  const pointerRef = useRef({
    x: 0,
    y: 0,
    targetX: 0,
    targetY: 0,
    active: false,
    demoStartedAt: 0,
  });
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const [showMobileHint, setShowMobileHint] = useState(false);
  const asciiResolution = isMobileViewport ? ASCII_RESOLUTION_MOBILE : ASCII_RESOLUTION_DESKTOP;

  useEffect(() => {
    const updateViewportState = () => {
      setIsMobileViewport(window.innerWidth <= MOBILE_BREAKPOINT);
    };

    updateViewportState();
    window.addEventListener("resize", updateViewportState, { passive: true });

    return () => {
      window.removeEventListener("resize", updateViewportState);
    };
  }, []);

  useEffect(() => {
    pointerRef.current.demoStartedAt = performance.now();
    pointerRef.current.x = 0;
    pointerRef.current.y = 0;
    pointerRef.current.targetX = 0;
    pointerRef.current.targetY = 0;
    pointerRef.current.active = false;

    if (!isMobileViewport) {
      setShowMobileHint(false);
      return;
    }

    let seenHint = false;
    try {
      seenHint = window.localStorage.getItem(MOBILE_HINT_STORAGE_KEY) === "1";
    } catch {
      seenHint = false;
    }

    if (seenHint) {
      setShowMobileHint(false);
      return;
    }

    setShowMobileHint(true);
  }, [isMobileViewport]);

  useEffect(() => {
    const dismissMobileHint = () => {
      if (!isMobileViewport || !showMobileHint) {
        return;
      }

      setShowMobileHint(false);
      try {
        window.localStorage.setItem(MOBILE_HINT_STORAGE_KEY, "1");
      } catch {
        // Storage access can fail in private mode; ignore and continue.
      }
    };

    const updatePointer = (clientX, clientY) => {
      const bounds = containerRef.current?.getBoundingClientRect();

      if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
        const width = window.innerWidth || 1;
        const height = window.innerHeight || 1;
        const normalizedX = Math.min(1, Math.max(0, clientX / width));
        const normalizedY = Math.min(1, Math.max(0, clientY / height));
        pointerRef.current.targetX = normalizedX * 2 - 1;
        pointerRef.current.targetY = 1 - normalizedY * 2;
      } else {
        const localX = Math.min(1, Math.max(0, (clientX - bounds.left) / bounds.width));
        const localY = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
        pointerRef.current.targetX = localX * 2 - 1;
        pointerRef.current.targetY = 1 - localY * 2;
      }

      pointerRef.current.active = true;
    };

    const handleMouseMove = (event) => {
      if (isMobileViewport) {
        return;
      }
      updatePointer(event.clientX, event.clientY);
    };

    const handleTouchStart = (event) => {
      dismissMobileHint();

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      updatePointer(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (event) => {
      dismissMobileHint();

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      updatePointer(touch.clientX, touch.clientY);
    };

    const handlePointerReset = () => {
      pointerRef.current.targetX = 0;
      pointerRef.current.targetY = 0;
      pointerRef.current.active = false;
    };

    if (!isMobileViewport) {
      window.addEventListener("mousemove", handleMouseMove, { passive: true });
      document.addEventListener("mouseleave", handlePointerReset);
    }
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handlePointerReset, { passive: true });
    window.addEventListener("touchcancel", handlePointerReset, { passive: true });
    window.addEventListener("blur", handlePointerReset);

    return () => {
      if (!isMobileViewport) {
        window.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseleave", handlePointerReset);
      }
      window.removeEventListener("touchstart", handleTouchStart);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handlePointerReset);
      window.removeEventListener("touchcancel", handlePointerReset);
      window.removeEventListener("blur", handlePointerReset);
    };
  }, [isMobileViewport, showMobileHint]);

  return (
    <div ref={containerRef} className="home-scene-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 10.2], fov: 36 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[7, 6, 8]} intensity={1.2} />
        <directionalLight position={[-7, -5, -7]} intensity={0.35} />

        <NameText3D isMobileHintActive={isMobileViewport && showMobileHint} pointerRef={pointerRef} />

        <AsciiRenderer
          fgColor={isLight ? "#080808" : "white"}
          bgColor={isLight ? "#efefef" : "black"}
          characters={ASCII_CHARACTER_SET}
          invert
          resolution={asciiResolution}
        />
      </Canvas>
      {isMobileViewport && showMobileHint ? <div className="home-scene-hint">Drag the text</div> : null}
    </div>
  );
}
