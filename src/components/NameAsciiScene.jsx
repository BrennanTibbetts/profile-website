import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AsciiRenderer, Text3D, useFont } from "@react-three/drei";
import { Leva, folder, useControls } from "leva";
import { TextGeometry } from "three/examples/jsm/geometries/TextGeometry.js";

const FONT_PRESETS = {
  helvetikerBold: { label: "Helvetiker Bold", path: "/fonts/helvetiker_bold.typeface.json" },
  helvetikerRegular: { label: "Helvetiker Regular", path: "/fonts/helvetiker_regular.typeface.json" },
  optimerBold: { label: "Optimer Bold", path: "/fonts/optimer_bold.typeface.json" },
  optimerRegular: { label: "Optimer Regular", path: "/fonts/optimer_regular.typeface.json" },
  gentilisBold: { label: "Gentilis Bold", path: "/fonts/gentilis_bold.typeface.json" },
  gentilisRegular: { label: "Gentilis Regular", path: "/fonts/gentilis_regular.typeface.json" },
  droidSansRegular: { label: "Droid Sans Regular", path: "/fonts/droid_sans_regular.typeface.json" },
  droidSansBold: { label: "Droid Sans Bold", path: "/fonts/droid_sans_bold.typeface.json" },
  droidSerifRegular: { label: "Droid Serif Regular", path: "/fonts/droid_serif_regular.typeface.json" },
  droidSerifBold: { label: "Droid Serif Bold", path: "/fonts/droid_serif_bold.typeface.json" },
  droidSansMonoRegular: { label: "Droid Sans Mono", path: "/fonts/droid_sans_mono_regular.typeface.json" },
};

const FONT_PRESET_OPTIONS = Object.fromEntries(
  Object.entries(FONT_PRESETS).map(([key, preset]) => [preset.label, key])
);
const ASCII_CHARACTER_SET_DEFAULT = " .:-=+*#%@";
const ASCII_CHARACTER_SETS = {
  default: ASCII_CHARACTER_SET_DEFAULT,
  broad: " .'`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$",
  ultra: " .'`^\",:;Il!i~+_-?][}{1)(|\\/*tfjrxnuvczXYUJCLQ0OZmwqpdbkhao*#MW&8%B@$%@#*+=-:. ",
  blocksOnly: " ░▒▓█",
  blocks: " .:-=+*#%@█▓▒░",
};
const ASCII_SET_OPTIONS = {
  "Default (clean)": "default",
  "Broad (dense)": "broad",
  "Ultra (very dense)": "ultra",
  "Blocks only": "blocksOnly",
  "Blocks + symbols": "blocks",
  Custom: "custom",
};
const ASCII_RESOLUTION_DESKTOP = 0.21;
const ASCII_RESOLUTION_MOBILE = 0.36;
const MOBILE_BREAKPOINT = 768;
const MOBILE_HINT_STORAGE_KEY = "homeAsciiTouchHintSeen";
const LEVA_THEME = {
  sizes: {
    rootWidth: "360px",
    controlWidth: "200px",
  },
};

function NameText3D({
  isMobileHintActive,
  pointerRef,
  useMatcap,
  fontPresetKey = "helvetikerBold",
  matcapRotationDeg = 0,
  matcapLightDistance = 0.3,
}) {
  const rootRef = useRef();
  const matcapCanvasRef = useRef(null);
  const matcapContextRef = useRef(null);
  const { size, viewport } = useThree();
  const isMobile = size.width <= MOBILE_BREAKPOINT;
  const selectedFontPreset = FONT_PRESETS[fontPresetKey] ?? FONT_PRESETS.helvetikerBold;
  const generatedMatcapTexture = useMemo(() => {
    if (typeof document === "undefined") {
      return null;
    }

    const size = 256;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;

    const context = canvas.getContext("2d");
    if (!context) {
      return null;
    }

    matcapCanvasRef.current = canvas;
    matcapContextRef.current = context;

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, []);

  useEffect(() => {
    if (!generatedMatcapTexture || !matcapCanvasRef.current || !matcapContextRef.current) {
      return;
    }

    const canvas = matcapCanvasRef.current;
    const context = matcapContextRef.current;
    const size = canvas.width;
    const half = size * 0.5;
    const rotationRadians = (matcapRotationDeg * Math.PI) / 180;
    const lightDistance = THREE.MathUtils.clamp(matcapLightDistance, 0, 0.55) * size;
    const lightX = half + Math.cos(rotationRadians) * lightDistance;
    const lightY = half + Math.sin(rotationRadians) * lightDistance;
    const sweepX = Math.cos(rotationRadians + Math.PI * 0.5) * size * 0.7;
    const sweepY = Math.sin(rotationRadians + Math.PI * 0.5) * size * 0.7;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, size, size);
    context.fillStyle = "#111111";
    context.fillRect(0, 0, size, size);

    const baseGradient = context.createRadialGradient(lightX, lightY, size * 0.06, half, half, size * 0.74);
    baseGradient.addColorStop(0, "#ffffff");
    baseGradient.addColorStop(0.2, "#dddddd");
    baseGradient.addColorStop(0.52, "#b5b5b5");
    baseGradient.addColorStop(0.78, "#757575");
    baseGradient.addColorStop(1, "#242424");
    context.fillStyle = baseGradient;
    context.fillRect(0, 0, size, size);

    const sweepGradient = context.createLinearGradient(half - sweepX, half - sweepY, half + sweepX, half + sweepY);
    sweepGradient.addColorStop(0, "rgba(255,255,255,0.0)");
    sweepGradient.addColorStop(0.35, "rgba(255,255,255,0.17)");
    sweepGradient.addColorStop(0.65, "rgba(0,0,0,0.12)");
    sweepGradient.addColorStop(1, "rgba(0,0,0,0.28)");
    context.fillStyle = sweepGradient;
    context.fillRect(0, 0, size, size);

    const hotspotGradient = context.createRadialGradient(lightX, lightY, size * 0.02, lightX, lightY, size * 0.38);
    hotspotGradient.addColorStop(0, "rgba(255,255,255,0.95)");
    hotspotGradient.addColorStop(0.28, "rgba(255,255,255,0.45)");
    hotspotGradient.addColorStop(1, "rgba(255,255,255,0)");
    context.fillStyle = hotspotGradient;
    context.fillRect(0, 0, size, size);
    generatedMatcapTexture.needsUpdate = true;
  }, [generatedMatcapTexture, matcapRotationDeg, matcapLightDistance]);

  useEffect(() => {
    return () => {
      generatedMatcapTexture?.dispose();
    };
  }, [generatedMatcapTexture]);
  const interaction = useControls("Home ASCII", {
    interaction: folder(
      {
        effectMode: { value: "repel", options: ["repel", "lift"] },
        demoStrength: { value: 0.5, min: 0, max: 1, step: 0.01 },
        letterLerpDesktop: { value: 0.18, min: 0.01, max: 0.5, step: 0.01 },
        letterLerpMobile: { value: 0.16, min: 0.01, max: 0.5, step: 0.01 },
        letterRotLerp: { value: 0.16, min: 0.01, max: 0.5, step: 0.01 },
      },
      { collapsed: false }
    ),
    groupFollow: folder(
      {
        groupBaseYDesktop: { value: 0.2, min: -1, max: 1, step: 0.01 },
        groupBaseYMobile: { value: 0, min: -1, max: 1, step: 0.01 },
        groupMoveXDesktop: { value: 0.12, min: 0, max: 0.6, step: 0.01 },
        groupMoveXMobile: { value: 0.08, min: 0, max: 0.6, step: 0.01 },
        groupMoveYDesktop: { value: 0.08, min: 0, max: 0.6, step: 0.01 },
        groupMoveYMobile: { value: 0.06, min: 0, max: 0.6, step: 0.01 },
        groupRotX: { value: 0.075, min: 0, max: 0.6, step: 0.005 },
        groupRotY: { value: 0.13, min: 0, max: 0.6, step: 0.005 },
        groupRotZ: { value: 0.02, min: 0, max: 0.3, step: 0.005 },
        groupSmoothing: { value: 0.08, min: 0.01, max: 0.4, step: 0.01 },
      },
      { collapsed: false }
    ),
    lift: folder(
      {
        liftIntensity: { value: 1, min: 0, max: 2, step: 0.01 },
        liftAmplitudeDesktop: { value: 0.3, min: 0, max: 1, step: 0.01 },
        liftAmplitudeMobile: { value: 0.2, min: 0, max: 1, step: 0.01 },
        liftFalloffDesktop: { value: 1.65, min: 0.2, max: 4, step: 0.01 },
        liftFalloffMobile: { value: 1.95, min: 0.2, max: 4, step: 0.01 },
      },
      { collapsed: false }
    ),
    repel: folder(
      {
        repelIntensity: { value: 0.61, min: 0, max: 2, step: 0.01 },
        repelRadiusDesktop: { value: 0.2, min: 0.2, max: 5, step: 0.01 },
        repelRadiusMobile: { value: 1.85, min: 0.2, max: 5, step: 0.01 },
        repelPushDesktop: { value: 0.56, min: 0, max: 1.2, step: 0.01 },
        repelPushMobile: { value: 0.28, min: 0, max: 1.2, step: 0.01 },
        repelFalloffPower: { value: 0.0, min: 0.0, max: 4, step: 0.01 },
        repelTiltDesktop: { value: 0.41, min: 0, max: 1.2, step: 0.01 },
        repelTiltMobile: { value: 0.32, min: 0, max: 1.2, step: 0.01 },
      },
      { collapsed: false }
    ),
  });

  const lines = ["Brennan", "Tibbetts"];
  const fontSize = isMobile ? 0.84 : 1.18;
  const textHeight = isMobile ? 0.2 : 0.3;
  const lineGap = isMobile ? 1 : 1.28;
  const tracking = fontSize * (isMobile ? 0.085 : 0.095);

  const parsedFont = useFont(selectedFontPreset.path);

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
      centerX: letter.baseX - centerX + (letter.minX + letter.maxX) * 0.5,
      centerY: letter.baseY - centerY + (letter.minY + letter.maxY) * 0.5,
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
  const mobileDriftProfiles = useMemo(
    () =>
      letterLayout.map((letter, index) => {
        const hashBase = `${letter.key}-${index}`;
        let hash = 0;
        for (let i = 0; i < hashBase.length; i += 1) {
          hash = (hash << 5) - hash + hashBase.charCodeAt(i);
          hash |= 0;
        }

        const normalized = (Math.abs(hash) % 1000) / 1000;
        const phaseA = normalized * Math.PI * 2;
        const phaseB = ((normalized * 1.73) % 1) * Math.PI * 2;
        const phaseC = ((normalized * 2.31) % 1) * Math.PI * 2;

        return {
          phaseA,
          phaseB,
          phaseC,
          speedA: 0.55 + ((index * 7) % 9) * 0.06,
          speedB: 0.75 + ((index * 11) % 7) * 0.07,
          speedC: 0.45 + ((index * 13) % 11) * 0.04,
        };
      }),
    [letterLayout]
  );

  useEffect(() => {
    letterRefs.current = letterLayout.map((_, index) => letterRefs.current[index] ?? null);
  }, [letterLayout]);

  useFrame(() => {
    const pointer = pointerRef.current;
    const demoEnabled = isMobile && isMobileHintActive && !pointer.active;
    const nowSeconds = performance.now() * 0.001;
    const demoSeconds = (performance.now() - (pointer.demoStartedAt || 0)) * 0.001;
    const demoTargetX = 0;
    const demoTargetY = demoEnabled ? Math.cos(demoSeconds * 1.7) * 0.14 : 0;
    const targetX = pointer.active ? pointer.targetX : demoTargetX;
    const targetY = pointer.active ? pointer.targetY : demoTargetY;
    pointer.x += (targetX - pointer.x) * 0.08;
    pointer.y += (targetY - pointer.y) * 0.08;

    const baseGroupY = isMobile ? interaction.groupBaseYMobile : interaction.groupBaseYDesktop;

    if (rootRef.current) {
      const targetRotX = pointer.y * interaction.groupRotX;
      const targetRotY = pointer.x * interaction.groupRotY;
      const targetRotZ = pointer.x * interaction.groupRotZ;

      const targetGroupX = pointer.x * (isMobile ? interaction.groupMoveXMobile : interaction.groupMoveXDesktop);
      const targetGroupY = baseGroupY + pointer.y * (isMobile ? interaction.groupMoveYMobile : interaction.groupMoveYDesktop);

      rootRef.current.rotation.x += (targetRotX - rootRef.current.rotation.x) * interaction.groupSmoothing;
      rootRef.current.rotation.y += (targetRotY - rootRef.current.rotation.y) * interaction.groupSmoothing;
      rootRef.current.rotation.z += (targetRotZ - rootRef.current.rotation.z) * interaction.groupSmoothing;
      rootRef.current.position.x += (targetGroupX - rootRef.current.position.x) * interaction.groupSmoothing;
      rootRef.current.position.y += (targetGroupY - rootRef.current.position.y) * interaction.groupSmoothing;
    }

    const pointerWorldX = pointer.x * (viewport.width * 0.5);
    const pointerWorldY = pointer.y * (viewport.height * 0.5);
    const rootX = rootRef.current?.position.x ?? 0;
    const rootY = rootRef.current?.position.y ?? 0;
    const pointerLocalX = (pointerWorldX - rootX) / layoutScale;
    const pointerLocalY = (pointerWorldY - rootY) / layoutScale;

    const interactionStrength = pointer.active ? 1 : demoEnabled ? interaction.demoStrength : 0;
    const positionLerp = isMobile ? interaction.letterLerpMobile : interaction.letterLerpDesktop;
    const rotationLerp = interaction.letterRotLerp;

    for (let index = 0; index < letterLayout.length; index += 1) {
      const letter = letterLayout[index];
      const ref = letterRefs.current[index];

      if (!ref) {
        continue;
      }

      if (isMobile) {
        // Mobile-only ambient drift: bypass lift/repel interaction for a subtle random-like motion.
        const drift = mobileDriftProfiles[index];
        const driftX =
          Math.sin(nowSeconds * drift.speedA + drift.phaseA) * 0.035 +
          Math.sin(nowSeconds * drift.speedC + drift.phaseC) * 0.012;
        const driftY =
          Math.cos(nowSeconds * drift.speedB + drift.phaseB) * 0.065 +
          Math.sin(nowSeconds * drift.speedA * 0.9 + drift.phaseA) * 0.014;
        const targetX = letter.baseX + driftX;
        const targetY = letter.baseY + driftY;
        const targetRotX = Math.sin(nowSeconds * drift.speedC + drift.phaseB) * 0.05;
        const targetRotY = Math.cos(nowSeconds * drift.speedA + drift.phaseC) * 0.05;

        ref.position.x += (targetX - ref.position.x) * positionLerp;
        ref.position.y += (targetY - ref.position.y) * positionLerp;
        ref.rotation.x += (targetRotX - ref.rotation.x) * rotationLerp;
        ref.rotation.y += (targetRotY - ref.rotation.y) * rotationLerp;
      } else if (interaction.effectMode === "lift") {
        // Legacy mode: push letters up/down by row based on pointer proximity.
        const dx = letter.baseX - pointerLocalX;
        const dy = letter.influenceY - pointerLocalY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const amplitude = isMobile ? interaction.liftAmplitudeMobile : interaction.liftAmplitudeDesktop;
        const falloff = isMobile ? interaction.liftFalloffMobile : interaction.liftFalloffDesktop;
        const influence = Math.exp(-distance * falloff) * interactionStrength * interaction.liftIntensity;
        const targetY = letter.baseY + letter.direction * amplitude * influence;

        ref.position.x += (letter.baseX - ref.position.x) * positionLerp;
        ref.position.y += (targetY - ref.position.y) * positionLerp;
        ref.rotation.x += (0 - ref.rotation.x) * rotationLerp;
        ref.rotation.y += (0 - ref.rotation.y) * rotationLerp;
      } else {
        // Repel mode: push each glyph away from pointer center and tilt away.
        const dx = letter.centerX - pointerLocalX;
        const dy = letter.centerY - pointerLocalY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const safeDistance = Math.max(distance, 0.0001);
        const repelRadius = Math.max(isMobile ? interaction.repelRadiusMobile : interaction.repelRadiusDesktop, 0.0001);
        const normalizedDistance = distance / repelRadius;
        // Continuous falloff (no radius cutoff): all letters are affected, but farther letters get less force.
        const influence =
          (1 / Math.pow(1 + normalizedDistance, interaction.repelFalloffPower)) *
          interactionStrength *
          interaction.repelIntensity;
        const pushDistance = (isMobile ? interaction.repelPushMobile : interaction.repelPushDesktop) * influence;
        const nx = dx / safeDistance;
        const ny = dy / safeDistance;

        const targetX = letter.baseX + nx * pushDistance;
        const targetY = letter.baseY + ny * pushDistance;
        const tiltStrength = (isMobile ? interaction.repelTiltMobile : interaction.repelTiltDesktop) * influence;
        const targetRotY = nx * tiltStrength;
        const targetRotX = -ny * tiltStrength;

        ref.position.x += (targetX - ref.position.x) * positionLerp;
        ref.position.y += (targetY - ref.position.y) * positionLerp;
        ref.rotation.x += (targetRotX - ref.rotation.x) * rotationLerp;
        ref.rotation.y += (targetRotY - ref.rotation.y) * rotationLerp;
      }
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
          <Text3D font={selectedFontPreset.path} size={fontSize} height={textHeight} curveSegments={6} bevelEnabled={false}>
            {letter.char}
            {useMatcap && generatedMatcapTexture ? (
              <meshMatcapMaterial matcap={generatedMatcapTexture} color="#ffffff" />
            ) : (
              <meshStandardMaterial color="#ffffff" roughness={0.42} metalness={0.12} flatShading />
            )}
          </Text3D>
        </group>
      ))}
    </group>
  );
}

function HomeCameraRig({ isMobile, controls }) {
  const { camera } = useThree();

  useFrame(() => {
    const targetX = isMobile ? controls.cameraXMobile : controls.cameraXDesktop;
    const targetY = isMobile ? controls.cameraYMobile : controls.cameraYDesktop;
    const targetZ = isMobile ? controls.cameraZMobile : controls.cameraZDesktop;
    const targetFov = isMobile ? controls.cameraFovMobile : controls.cameraFovDesktop;

    camera.position.x += (targetX - camera.position.x) * controls.cameraLerp;
    camera.position.y += (targetY - camera.position.y) * controls.cameraLerp;
    camera.position.z += (targetZ - camera.position.z) * controls.cameraLerp;

    const nextFov = camera.fov + (targetFov - camera.fov) * controls.cameraLerp;
    if (Math.abs(nextFov - camera.fov) > 0.0001) {
      camera.fov = nextFov;
      camera.updateProjectionMatrix();
    }
  });

  return null;
}

export default function NameAsciiScene() {
  const containerRef = useRef(null);
  const [showLeva, setShowLeva] = useState(false);
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
  const renderControls = useControls("Home Render", {
    asciiEnabled: { value: true },
    matcapMode: { value: true },
    Text: folder(
      {
        fontPreset: { value: "helvetikerBold", options: FONT_PRESET_OPTIONS },
      },
      { collapsed: false }
    ),
    Matcap: folder(
      {
        matcapRotation: { value: 17, min: -180, max: 180, step: 1 },
        matcapLightDistance: { value: 0.46, min: 0, max: 0.55, step: 0.01 },
      },
      { collapsed: false }
    ),
    ASCII: folder(
      {
        asciiSet: { value: "ultra", options: ASCII_SET_OPTIONS },
        customCharacters: { value: ASCII_CHARACTER_SET_DEFAULT },
      },
      { collapsed: false }
    ),
  });
  const customAsciiCharacters = (renderControls.customCharacters ?? "").replace(/\r?\n/g, "");
  const activeAsciiCharacters =
    renderControls.asciiSet === "custom"
      ? customAsciiCharacters.length > 0
        ? customAsciiCharacters
        : ASCII_CHARACTER_SET_DEFAULT
      : ASCII_CHARACTER_SETS[renderControls.asciiSet] ?? ASCII_CHARACTER_SET_DEFAULT;
  const asciiRendererKey = `${renderControls.asciiSet}:${activeAsciiCharacters}:${asciiResolution}`;
  const cameraControls = useControls("Home Camera", {
    cameraXDesktop: { value: 0, min: -6, max: 6, step: 0.01 },
    cameraYDesktop: { value: 0, min: -6, max: 6, step: 0.01 },
    cameraZDesktop: { value: 10.2, min: 4, max: 24, step: 0.01 },
    cameraFovDesktop: { value: 36, min: 15, max: 80, step: 0.1 },
    cameraXMobile: { value: 0, min: -6, max: 6, step: 0.01 },
    cameraYMobile: { value: 0, min: -6, max: 6, step: 0.01 },
    cameraZMobile: { value: 10.2, min: 4, max: 24, step: 0.01 },
    cameraFovMobile: { value: 36, min: 15, max: 80, step: 0.1 },
    cameraLerp: { value: 0.1, min: 0.01, max: 0.4, step: 0.01 },
  });
  const lightControls = useControls("Home Lights", {
    ambient: folder(
      {
        ambientIntensity: { value: 0.58, min: 0, max: 2.5, step: 0.01 },
        ambientColor: { value: "#ffffff" },
      },
      { collapsed: false }
    ),
    "Main Light (front)": folder(
      {
        mainIntensity: { value: 1.2, min: 0, max: 4, step: 0.01 },
        mainColor: { value: "#ffffff" },
        mainX: { value: 7, min: -20, max: 20, step: 0.1 },
        mainY: { value: 6, min: -20, max: 20, step: 0.1 },
        mainZ: { value: 8, min: -20, max: 20, step: 0.1 },
      },
      { collapsed: false }
    ),
    "Secondary Light (back/fill)": folder(
      {
        secondaryIntensity: { value: 0.35, min: 0, max: 4, step: 0.01 },
        secondaryColor: { value: "#ffffff" },
        secondaryX: { value: -7, min: -20, max: 20, step: 0.1 },
        secondaryY: { value: -5, min: -20, max: 20, step: 0.1 },
        secondaryZ: { value: -7, min: -20, max: 20, step: 0.1 },
      },
      { collapsed: false }
    ),
  });

  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.shiftKey && event.key.toLowerCase() === "h") {
        setShowLeva((state) => !state);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    <>
      <Leva hidden={!showLeva} theme={LEVA_THEME} />
      <div ref={containerRef} className="home-scene-canvas" aria-hidden="true">
        <Canvas camera={{ position: [0, 0, 10.2], fov: 36 }} dpr={[1, 1.5]} gl={{ antialias: false }}>
          <HomeCameraRig isMobile={isMobileViewport} controls={cameraControls} />
          <color attach="background" args={["#000000"]} />
          {!renderControls.matcapMode ? (
            <>
              <ambientLight intensity={lightControls.ambientIntensity} color={lightControls.ambientColor} />
              <directionalLight
                position={[lightControls.mainX, lightControls.mainY, lightControls.mainZ]}
                intensity={lightControls.mainIntensity}
                color={lightControls.mainColor}
              />
              <directionalLight
                position={[lightControls.secondaryX, lightControls.secondaryY, lightControls.secondaryZ]}
                intensity={lightControls.secondaryIntensity}
                color={lightControls.secondaryColor}
              />
            </>
          ) : null}

          <NameText3D
            isMobileHintActive={isMobileViewport && showMobileHint}
            pointerRef={pointerRef}
            useMatcap={renderControls.matcapMode}
            fontPresetKey={renderControls.fontPreset}
            matcapRotationDeg={renderControls.matcapRotation}
            matcapLightDistance={renderControls.matcapLightDistance}
          />

          {renderControls.asciiEnabled ? (
            <AsciiRenderer
              key={asciiRendererKey}
              fgColor="white"
              bgColor="black"
              characters={activeAsciiCharacters}
              invert
              resolution={asciiResolution}
            />
          ) : null}
        </Canvas>
      </div>
    </>
  );
}
