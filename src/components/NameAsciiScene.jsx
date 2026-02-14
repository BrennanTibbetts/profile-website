import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AsciiRenderer, Text3D } from "@react-three/drei";
import { FontLoader } from "three/examples/jsm/loaders/FontLoader.js";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";
import fontData from "three/examples/fonts/helvetiker_bold.typeface.json";

const FONT_PATH = "/fonts/helvetiker_bold.typeface.json";
const ASCII_CHARACTER_SET = " .:-=+*#%@";

function NameText3D({ pointerRef }) {
  const rootRef = useRef();
  const { size, viewport } = useThree();
  const isMobile = size.width <= 768;

  const lines = ["Brennan", "Tibbetts"];
  const fontSize = isMobile ? 0.84 : 1.18;
  const textHeight = isMobile ? 0.2 : 0.3;
  const lineGap = isMobile ? 1 : 1.28;
  const tracking = fontSize * (isMobile ? 0.085 : 0.095);

  const parsedFont = useMemo(() => {
    const loader = new FontLoader();
    return loader.parse(fontData);
  }, []);

  const { letterLayout, maxLineWidth } = useMemo(() => {
    const geometryOptions = {
      font: parsedFont,
      size: fontSize,
      height: textHeight,
      curveSegments: 6,
      bevelEnabled: false,
    };

    let widestLine = 0;

    const letters = lines.flatMap((line, lineIndex) => {
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
        return { minX, maxY, minY, width };
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
        };
      });
    });

    return { letterLayout: letters, maxLineWidth: widestLine };
  }, [lineGap, fontSize, parsedFont, textHeight, tracking]);

  const layoutScale = useMemo(() => {
    const safeWidth = viewport.width * (isMobile ? 0.94 : 0.9);
    if (maxLineWidth <= 0) {
      return 1;
    }

    return Math.min(1, safeWidth / maxLineWidth);
  }, [isMobile, maxLineWidth, viewport.width]);

  const letterRefs = useRef([]);

  useEffect(() => {
    letterRefs.current = letterLayout.map((_, index) => letterRefs.current[index] ?? null);
  }, [letterLayout]);

  useFrame(() => {
    const pointer = pointerRef.current;
    const targetX = pointer.active ? pointer.targetX : 0;
    const targetY = pointer.active ? pointer.targetY : 0;
    pointer.x += (targetX - pointer.x) * 0.08;
    pointer.y += (targetY - pointer.y) * 0.08;

    const baseGroupY = isMobile ? 0.55 : 0.2;

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
      const influence = pointer.active ? Math.exp(-distance * falloff) : 0;

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
  const pointerRef = useRef({ x: 0, y: 0, targetX: 0, targetY: 0, active: false });

  useEffect(() => {
    const updatePointer = (clientX, clientY) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;

      pointerRef.current.targetX = (clientX / width) * 2 - 1;
      pointerRef.current.targetY = 1 - (clientY / height) * 2;
      pointerRef.current.active = true;
    };

    const handleMouseMove = (event) => {
      updatePointer(event.clientX, event.clientY);
    };

    const handleTouchMove = (event) => {
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

    window.addEventListener("mousemove", handleMouseMove, { passive: true });
    window.addEventListener("touchstart", handleTouchMove, { passive: true });
    window.addEventListener("touchmove", handleTouchMove, { passive: true });
    window.addEventListener("touchend", handlePointerReset, { passive: true });
    window.addEventListener("touchcancel", handlePointerReset, { passive: true });
    window.addEventListener("blur", handlePointerReset);
    document.addEventListener("mouseleave", handlePointerReset);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchstart", handleTouchMove);
      window.removeEventListener("touchmove", handleTouchMove);
      window.removeEventListener("touchend", handlePointerReset);
      window.removeEventListener("touchcancel", handlePointerReset);
      window.removeEventListener("blur", handlePointerReset);
      document.removeEventListener("mouseleave", handlePointerReset);
    };
  }, []);

  return (
    <div className="home-scene-canvas" aria-hidden="true">
      <Canvas camera={{ position: [0, 0, 10.2], fov: 36 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
        <color attach="background" args={["#000000"]} />
        <ambientLight intensity={0.58} />
        <directionalLight position={[7, 6, 8]} intensity={1.2} />
        <directionalLight position={[-7, -5, -7]} intensity={0.35} />

        <NameText3D pointerRef={pointerRef} />

        <AsciiRenderer
          fgColor={isLight ? "#080808" : "white"}
          bgColor={isLight ? "#efefef" : "black"}
          characters={ASCII_CHARACTER_SET}
          invert
          resolution={0.21}
        />
      </Canvas>
    </div>
  );
}
