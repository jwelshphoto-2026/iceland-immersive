"use client";
// src/components/canvas/shaders/GeothermalMist.tsx
//
// Station 10 - Plate 10 rendered inside the shared CanvasBridge with a
// domain-warped FBM solfatara steam blended directly over the plate texture.
// Injected via canvasTunnel.In - there is no private WebGLRenderer, no private
// RAF loop and no React state for density.
//
// Protocol:
// - Uniforms (uTime, uDensity) are mutated ONLY inside useFrame, in place.
//   No objects are allocated per frame.
// - The 3:1 hero plane is sized from the viewport inside useFrame by scaling a
//   unit plane (mesh.scale), so resizing never rebuilds geometry.
// - Density is fed through a shared mutable ref (written by ScrollTrigger,
//   outside React) so scrolling never causes a re-render.
// - The canvas is frameloop="demand": while `state.active` is true this
//   component calls invalidate() each frame to keep the mist drifting.
// - Geometry, material AND the plate texture are disposed in a useEffect
//   cleanup.
import { Suspense, useEffect, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { useTexture } from "@react-three/drei";
import { PlaneGeometry, ShaderMaterial, Mesh, type IUniform, type Texture } from "three";

export interface MistState {
  /** Target density, 0.25 (ambient draft) -> 0.78 (choking vent). */
  density: number;
  /** True while Station 10 is in view; gates continuous rendering. */
  active: boolean;
}

export const PLATE_10_SRC = "/reference-archive/Plate_10.webp";

/** RLM hero plate aspect ratio (width : height). */
const HERO_ASPECT = 3;

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uTime;
  uniform float uDensity;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
  }

  // Domain-warped fractional Brownian motion
  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    vec2 shift = vec2(100.0);
    mat2 rot = mat2(cos(0.5), sin(0.5), -sin(0.5), cos(0.5));
    for (int i = 0; i < 3; ++i) {
      v += a * noise(p);
      p = rot * p * 2.0 + shift;
      a *= 0.5;
    }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    vec4 baseColor = texture2D(uTexture, uv);

    // Horizontal fissure drift + slow upward thermal plume
    vec2 drift = vec2(uTime * 0.07, uTime * 0.04);
    vec2 q = vec2(fbm(uv * 3.5 + drift), fbm(uv * 3.0 - drift));
    vec2 r = vec2(fbm(uv * 4.0 + q + vec2(1.7, 9.2) + 0.15 * uTime),
                  fbm(uv * 4.0 + q + vec2(8.3, 2.8) + 0.126 * uTime));
    float f = fbm(uv * 3.0 + r);

    // Ground-plane concentration: heaviest near the bottom fissure
    float groundMask = smoothstep(0.40, 0.05, uv.y);

    // Calcined mineral white with faint sulfuric ochre warmth
    vec3 steamColor = mix(vec3(0.92, 0.90, 0.86), vec3(0.96, 0.88, 0.68), clamp(f * 0.35, 0.0, 1.0));

    float steamAlpha = clamp(pow(f, 1.6) * 1.85 * groundMask * uDensity, 0.0, 0.78);

    // Soft optical blend over the raw 35mm scan
    gl_FragColor = vec4(mix(baseColor.rgb, steamColor, steamAlpha), 1.0);
  }
`;

function MistPlate({ state }: { state: MutableRefObject<MistState> }) {
  // Suspends until the plate is decoded (see Suspense boundary below).
  const texture: Texture = useTexture(PLATE_10_SRC);

  const { geometry, material, mesh } = useMemo(() => {
    const uniforms: Record<string, IUniform> = {
      uTexture: { value: texture },
      uTime: { value: 0 },
      uDensity: { value: 0.25 },
    };
    // Unit plane; scaled to the 3:1 hero rectangle in useFrame.
    const geometry = new PlaneGeometry(1, 1);
    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const mesh = new Mesh(geometry, material);
    return { geometry, material, mesh };
  }, [texture]);

  useFrame((frame) => {
    const uniforms = material.uniforms;
    // In-place uniform mutation inside the render loop is the R3F protocol;
    // the React Compiler lint cannot tell useFrame apart from render.
    /* eslint-disable react-hooks/immutability */
    uniforms.uTime.value = frame.clock.elapsedTime;
    uniforms.uDensity.value = state.current.density;
    /* eslint-enable react-hooks/immutability */

    // Strict 3:1 hero plate, "contain"-fitted to the viewport (world units at
    // the z=0 plane). Width-limited on landscape, height-limited on narrow.
    const { width, height } = frame.viewport;
    const planeWidth = Math.min(width, height * HERO_ASPECT);
    mesh.scale.set(planeWidth, planeWidth / HERO_ASPECT, 1);

    // frameloop="demand": keep drifting only while Station 10 is on screen.
    if (state.current.active) frame.invalidate();
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      texture.dispose();
      // Drop drei's loader cache so a remount reloads instead of reusing a
      // disposed texture.
      useTexture.clear(PLATE_10_SRC);
    };
  }, [geometry, material, texture]);

  return <primitive object={mesh} />;
}

export default function GeothermalMist({ state }: { state: MutableRefObject<MistState> }) {
  // Suspense keeps the texture load from blanking the rest of the shared canvas.
  return (
    <Suspense fallback={null}>
      <MistPlate state={state} />
    </Suspense>
  );
}
