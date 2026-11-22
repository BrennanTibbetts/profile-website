import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Coffee steam: a tall, finely divided plane twisted around its vertical axis
// by slowly scrolling noise, drifted sideways near the top like a draught,
// and drawn as soft scrolling wisps that fade out at every edge. The noise is
// computed in the shader, so there's no texture to load.

const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  // Smooth value noise in 0..1.
  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }
`;

const vertexShader = /* glsl */ `
  uniform float uTime;
  varying vec2 vUv;

  ${NOISE_GLSL}

  vec2 rotate2D(vec2 value, float angle) {
    float s = sin(angle);
    float c = cos(angle);
    return mat2(c, s, -s, c) * value;
  }

  void main() {
    vec3 newPosition = position;

    // Twist: each height turns by a different, slowly changing amount.
    float twist = noise(vec2(3.7, uv.y * 2.2 - uTime * 0.12)) * 6.0;
    newPosition.xz = rotate2D(newPosition.xz, twist);

    // Wind: a gentle sideways drift that grows towards the top.
    vec2 wind = vec2(noise(vec2(1.3, uTime * 0.08)) - 0.5, noise(vec2(7.1, uTime * 0.08)) - 0.5);
    newPosition.xz += wind * pow(uv.y, 2.0) * 0.7;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
    vUv = uv;
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  uniform vec3 uColor;
  uniform float uOpacity;
  varying vec2 vUv;

  ${NOISE_GLSL}

  void main() {
    // Wisps rise: sample noise that scrolls upward over time.
    vec2 smokeUv = vec2(vUv.x * 2.5, vUv.y * 3.0 - uTime * 0.35);
    float smoke = noise(smokeUv) * 0.65 + noise(smokeUv * 2.1 + 4.3) * 0.35;
    smoke = smoothstep(0.3, 0.95, smoke);

    // Fade out at the sides, the cup rim and the top.
    smoke *= smoothstep(0.0, 0.18, vUv.x);
    smoke *= smoothstep(1.0, 0.82, vUv.x);
    smoke *= smoothstep(0.0, 0.12, vUv.y);
    smoke *= smoothstep(1.0, 0.4, vUv.y);

    gl_FragColor = vec4(uColor, smoke * uOpacity);
  }
`;

/**
 * Steam rising from its origin (put it at the cup's rim). `width` and
 * `height` are in scene units.
 */
export function CoffeeSmoke({ width = 0.9, height = 2.6, color = "#efe4d6", opacity = 1, ...props }) {
  const geometry = useMemo(() => {
    const plane = new THREE.PlaneGeometry(1, 1, 16, 64);
    plane.translate(0, 0.5, 0);
    return plane;
  }, []);

  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader,
        fragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uColor: { value: new THREE.Color(color) },
          uOpacity: { value: opacity },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    [color, opacity]
  );

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  useFrame((_, delta) => {
    material.uniforms.uTime.value += Math.min(delta, 0.1);
  });

  return <mesh geometry={geometry} material={material} scale={[width, height, width]} {...props} />;
}
