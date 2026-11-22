import { useEffect, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute float aAlpha;
  attribute vec3 aColor;
  uniform float uScale;
  varying float vAlpha;
  varying float vHead;
  varying vec3 vColor;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    // World-sized points: shrink with distance like everything else.
    gl_PointSize = aSize * uScale / -mvPosition.z;
    vAlpha = aAlpha;
    vHead = step(0.999, aAlpha);
    vColor = aColor;
  }
`;

const fragmentShader = /* glsl */ `
  uniform vec3 uCoreColor;
  varying float vAlpha;
  varying float vHead;
  varying vec3 vColor;

  void main() {
    float d = length(gl_PointCoord - 0.5) * 2.0;
    if (d > 1.0) discard;
    // Soft falloff for the glow, plus a hot core that fades to the tail colour.
    float glow = pow(1.0 - d, 2.4);
    float core = smoothstep(0.42, 0.0, d) * mix(0.35, 1.0, vHead);
    vec3 color = mix(vColor, uCoreColor, core);
    float strength = glow * vAlpha;
    gl_FragColor = vec4(color * strength, strength);
  }
`;

/**
 * A glowing light travelling along `curve`, with a tail that shrinks and fades
 * the further back it is. Additive blending on the dark page gives it a bloom
 * without a post-processing pass. `headRef.current` is the head's position
 * along the curve (0..1), or null to hide it. `colorAt(t)` (optional) colours
 * each point of the light by where it is along the curve.
 */
export default function GlowTrail({
  curve,
  headRef,
  z = 0,
  count = 32,
  tailLength = 0.07, // fraction of the curve
  headSize = 1.1, // scene units
  color = "#ffb24d",
  colorAt = null,
  coreColor = "#fff4dc",
}) {
  const { geometry, material } = useMemo(() => {
    const trailGeometry = new THREE.BufferGeometry();
    trailGeometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    trailGeometry.setAttribute("aSize", new THREE.BufferAttribute(new Float32Array(count), 1));
    trailGeometry.setAttribute("aAlpha", new THREE.BufferAttribute(new Float32Array(count), 1));
    trailGeometry.setAttribute("aColor", new THREE.BufferAttribute(new Float32Array(count * 3), 3));
    const trailMaterial = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uScale: { value: 1 },
        uCoreColor: { value: new THREE.Color(coreColor) },
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    return { geometry: trailGeometry, material: trailMaterial };
  }, [count, coreColor]);

  useEffect(
    () => () => {
      geometry.dispose();
      material.dispose();
    },
    [geometry, material]
  );

  const point = useMemo(() => new THREE.Vector3(), []);
  const fallbackColor = useMemo(() => new THREE.Color(color), [color]);

  useFrame((state) => {
    // Pixels per scene unit at distance 1, so aSize can be in scene units.
    const camera = state.camera;
    const fov = camera.isPerspectiveCamera ? THREE.MathUtils.degToRad(camera.fov) : Math.PI / 4;
    material.uniforms.uScale.value = (state.size.height * state.gl.getPixelRatio()) / (2 * Math.tan(fov / 2));

    const head = headRef.current;
    const positions = geometry.attributes.position.array;
    const sizes = geometry.attributes.aSize.array;
    const alphas = geometry.attributes.aAlpha.array;
    const colors = geometry.attributes.aColor.array;
    for (let i = 0; i < count; i += 1) {
      const back = i / (count - 1); // 0 at the head, 1 at the tail's end
      const t = head === null ? -1 : head - back * tailLength;
      if (t < 0) {
        alphas[i] = 0;
        sizes[i] = 0;
        continue;
      }
      curve.getPointAt(Math.min(t, 1), point);
      positions[i * 3] = point.x;
      positions[i * 3 + 1] = point.y;
      positions[i * 3 + 2] = z;
      const fade = 1 - back;
      sizes[i] = headSize * (i === 0 ? 1 : 0.25 + 0.5 * fade);
      const pointColor = colorAt ? colorAt(t) : fallbackColor;
      colors[i * 3] = pointColor.r;
      colors[i * 3 + 1] = pointColor.g;
      colors[i * 3 + 2] = pointColor.b;
      alphas[i] = i === 0 ? 1 : 0.9 * fade * fade;
    }
    geometry.attributes.position.needsUpdate = true;
    geometry.attributes.aSize.needsUpdate = true;
    geometry.attributes.aAlpha.needsUpdate = true;
    geometry.attributes.aColor.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} frustumCulled={false} />;
}
