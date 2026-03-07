import { useEffect, useRef, useState } from "react";
import { Html } from "@react-three/drei";
import { useFrame, useThree } from "@react-three/fiber";
import { Perf } from "r3f-perf";

const UPDATE_INTERVAL_SECONDS = 0.35;
const EMPTY_SNAPSHOT = {
  fps: 0,
  frameTimeMs: 0,
  drawCalls: 0,
  triangles: 0,
  geometries: 0,
  textures: 0,
  programs: 0,
  dpr: 1,
};

function formatFloat(value, decimals = 1) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return value.toFixed(decimals);
}

function formatInteger(value) {
  if (!Number.isFinite(value)) {
    return "0";
  }
  return Math.round(value).toLocaleString();
}

export default function SceneDiagnostics({ enabled = false }) {
  const { gl } = useThree();
  const [snapshot, setSnapshot] = useState(EMPTY_SNAPSHOT);
  const sampleRef = useRef({
    elapsedSeconds: 0,
    frameCount: 0,
    frameTimeSumMs: 0,
  });

  useEffect(() => {
    if (!enabled) {
      sampleRef.current.elapsedSeconds = 0;
      sampleRef.current.frameCount = 0;
      sampleRef.current.frameTimeSumMs = 0;
      setSnapshot(EMPTY_SNAPSHOT);
    }
  }, [enabled]);

  useFrame((_, delta) => {
    if (!enabled) {
      return;
    }

    sampleRef.current.elapsedSeconds += delta;
    sampleRef.current.frameCount += 1;
    sampleRef.current.frameTimeSumMs += delta * 1000;

    if (sampleRef.current.elapsedSeconds < UPDATE_INTERVAL_SECONDS) {
      return;
    }

    const info = gl.info;
    const elapsedSeconds = sampleRef.current.elapsedSeconds;
    const frameCount = Math.max(sampleRef.current.frameCount, 1);
    const fps = frameCount / Math.max(elapsedSeconds, 0.0001);
    const frameTimeMs = sampleRef.current.frameTimeSumMs / frameCount;

    setSnapshot({
      fps,
      frameTimeMs,
      drawCalls: info.render.calls ?? 0,
      triangles: info.render.triangles ?? 0,
      geometries: info.memory.geometries ?? 0,
      textures: info.memory.textures ?? 0,
      programs: Array.isArray(info.programs) ? info.programs.length : 0,
      dpr: gl.getPixelRatio(),
    });

    sampleRef.current.elapsedSeconds = 0;
    sampleRef.current.frameCount = 0;
    sampleRef.current.frameTimeSumMs = 0;
  });

  if (!enabled) {
    return null;
  }

  return (
    <>
      <Perf position="top-left" />
      <Html
        fullscreen
        zIndexRange={[100, 0]}
        style={{
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      >
        <div className="scene-diagnostics-layer">
          <section className="scene-diagnostics-hud" aria-label="3D diagnostics">
            <p className="scene-diagnostics-title">3D Diagnostics</p>
            <dl className="scene-diagnostics-grid">
              <dt>FPS</dt>
              <dd>{formatFloat(snapshot.fps)}</dd>
              <dt>Frame</dt>
              <dd>{formatFloat(snapshot.frameTimeMs, 2)} ms</dd>
              <dt>Draw Calls</dt>
              <dd>{formatInteger(snapshot.drawCalls)}</dd>
              <dt>Triangles</dt>
              <dd>{formatInteger(snapshot.triangles)}</dd>
              <dt>Geometries</dt>
              <dd>{formatInteger(snapshot.geometries)}</dd>
              <dt>Textures</dt>
              <dd>{formatInteger(snapshot.textures)}</dd>
              <dt>Programs</dt>
              <dd>{formatInteger(snapshot.programs)}</dd>
              <dt>DPR</dt>
              <dd>{formatFloat(snapshot.dpr, 2)}</dd>
            </dl>
            <p className="scene-diagnostics-hint">Toggle: Shift + D</p>
          </section>
        </div>
      </Html>
    </>
  );
}
