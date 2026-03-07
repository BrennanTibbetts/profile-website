import { useEffect, useLayoutEffect, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { AsciiEffect } from "three-stdlib";

function createAsciiEffect(gl, characters, options) {
  if (typeof HTMLCanvasElement === "undefined") {
    return new AsciiEffect(gl, characters, options);
  }

  const originalGetContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function patchedGetContext(type, attributes) {
    if (type !== "2d") {
      return originalGetContext.call(this, type, attributes);
    }

    const mergedAttributes =
      attributes && typeof attributes === "object"
        ? { ...attributes, willReadFrequently: true }
        : { willReadFrequently: true };

    return originalGetContext.call(this, type, mergedAttributes);
  };

  try {
    return new AsciiEffect(gl, characters, options);
  } finally {
    HTMLCanvasElement.prototype.getContext = originalGetContext;
  }
}

export default function AsciiRendererOptimized({
  renderIndex = 1,
  bgColor = "black",
  fgColor = "white",
  characters = " .:-+*=%@#",
  invert = true,
  color = false,
  resolution = 0.15,
}) {
  const { size, gl, scene, camera } = useThree();

  const effect = useMemo(() => {
    const nextEffect = createAsciiEffect(gl, characters, {
      invert,
      color,
      resolution,
    });

    nextEffect.domElement.style.position = "absolute";
    nextEffect.domElement.style.top = "0px";
    nextEffect.domElement.style.left = "0px";
    nextEffect.domElement.style.pointerEvents = "none";
    return nextEffect;
  }, [gl, characters, invert, color, resolution]);

  useLayoutEffect(() => {
    effect.domElement.style.color = fgColor;
    effect.domElement.style.backgroundColor = bgColor;
  }, [effect, fgColor, bgColor]);

  useEffect(() => {
    gl.domElement.style.opacity = "0";
    gl.domElement.parentNode.appendChild(effect.domElement);
    return () => {
      gl.domElement.style.opacity = "1";
      gl.domElement.parentNode.removeChild(effect.domElement);
    };
  }, [effect, gl]);

  useEffect(() => {
    effect.setSize(size.width, size.height);
  }, [effect, size]);

  useFrame(() => {
    effect.render(scene, camera);
  }, renderIndex);

  return null;
}
