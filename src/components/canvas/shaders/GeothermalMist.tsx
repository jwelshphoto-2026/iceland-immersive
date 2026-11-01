"use client";
// src/components/canvas/shaders/GeothermalMist.tsx
//
// Station 10 - domain-warped FBM solfatara steam, migrated from the legacy
// standalone GeothermalSteamCanvas. It renders as a full-viewport alpha quad
// inside the shared CanvasBridge (injected via canvasTunnel.In) - there is no
// private WebGLRenderer, no private RAF loop and no React state for density.
//
// Protocol:
// - Uniforms (uTime, uDensity) are mutated ONLY inside useFrame, in place.
//   No objects are allocated per frame.
// - Density is fed through a shared mutable ref (written by ScrollTrigger,
//   outside React) so scrolling never causes a re-render.
// - The canvas is frameloop="demand": while `state.active` is true this
//   component calls invalidate() each frame to keep the mist drifting; when
//   inactive it stops requesting frames.
// - Geometry + material are disposed in a useEffect cleanup.
import { useEffect, useMemo, type MutableRefObject } from "react";
import { useFrame } from "@react-three/fiber";
import { PlaneGeometry, ShaderMaterial, Mesh, type IUniform } from "three";

export interface MistState {
  /** Target density, 0.25 (ambient draft) -> 0.78 (choking vent). */
  density: number;
  /** True while Station 10 is in view; gates continuous rendering. */
  active: boolean;
}

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
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
    gl_FragColor = vec4(steamColor, steamAlpha);
  }
`;

export default function GeothermalMist({ state }: { state: MutableRefObject<MistState> }) {
  const { geometry, material, mesh } = useMemo(() => {
    const uniforms: Record<string, IUniform<number>> = {
      uTime: { value: 0 },
      uDensity: { value: 0.25 },
    };
    const geometry = new PlaneGeometry(2, 2);
    const material = new ShaderMaterial({
      vertexShader: VERTEX_SHADER,
      fragmentShader: FRAGMENT_SHADER,
      uniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false,
      toneMapped: false,
    });
    const mesh = new Mesh(geometry, material);
    // Clip-space quad: it must never be frustum-culled.
    mesh.frustumCulled = false;
    return { geometry, material, mesh };
  }, []);

  useFrame((frame) => {
    const uniforms = material.uniforms;
    // In-place uniform mutation inside the render loop is the R3F protocol;
    // the React Compiler lint cannot tell useFrame apart from render.
    /* eslint-disable react-hooks/immutability */
    uniforms.uTime.value = frame.clock.elapsedTime;
    uniforms.uDensity.value = state.current.density;
    /* eslint-enable react-hooks/immutability */
    // frameloop="demand": keep drifting only while Station 10 is on screen.
    if (state.current.active) frame.invalidate();
  });

  useEffect(() => {
    return () => {
      geometry.dispose();
      material.dispose();
      // No textures are held by the mist, but sweep uniforms defensively so a
      // future sampler uniform can never leak VRAM.
      for (const u of Object.values(material.uniforms)) {
        const v = u.value as { isTexture?: boolean; dispose?: () => void } | null;
        if (v && v.isTexture && v.dispose) v.dispose();
      }
    };
  }, [geometry, material]);

  return <primitive object={mesh} />;
}
