import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { BokehPass } from "three/examples/jsm/postprocessing/BokehPass.js";

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export default function PortfolioDepthOfField({
  enabled = false,
  focus = 10,
  aperture = 0.00018,
  maxBlur = 0.008,
  resolutionScale = 1,
}) {
  const { gl, scene, camera, size } = useThree();
  const composerRef = useRef(null);
  const bokehPassRef = useRef(null);

  useEffect(() => {
    if (!enabled) {
      return undefined;
    }

    const composer = new EffectComposer(gl);
    const renderPass = new RenderPass(scene, camera);
    const bokehPass = new BokehPass(scene, camera, {
      focus,
      aperture,
      maxblur: maxBlur,
    });

    composer.addPass(renderPass);
    composer.addPass(bokehPass);

    composerRef.current = composer;
    bokehPassRef.current = bokehPass;

    return () => {
      composerRef.current = null;
      bokehPassRef.current = null;
      bokehPass.dispose();
      composer.dispose();
    };
  }, [camera, enabled, gl, scene]);

  useEffect(() => {
    if (!enabled || !composerRef.current) {
      return;
    }

    const scale = clamp(resolutionScale, 0.25, 1);
    const width = Math.max(1, Math.floor(size.width * scale));
    const height = Math.max(1, Math.floor(size.height * scale));
    composerRef.current.setSize(width, height);
  }, [enabled, resolutionScale, size.height, size.width]);

  useEffect(() => {
    if (!enabled || !bokehPassRef.current) {
      return;
    }

    bokehPassRef.current.uniforms.focus.value = focus;
    bokehPassRef.current.uniforms.aperture.value = aperture;
    bokehPassRef.current.uniforms.maxblur.value = maxBlur;
  }, [aperture, enabled, focus, maxBlur]);

  useFrame((_, delta) => {
    if (!enabled || !composerRef.current) {
      return;
    }

    composerRef.current.render(delta);
  }, 1);

  return null;
}
