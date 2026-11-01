"use client";
// src/components/canvas/CanvasBridge.tsx
//
// The persistent root Canvas singleton (mounted once via CanvasBridgeLoader).
// Content arrives through canvasTunnel.In from anywhere in the component tree.
//
// Memory safeguards (WebGL context-loss / VRAM overflow prevention):
// - dpr capped at [1, 1.5] to bound framebuffer VRAM for monumental plates.
// - frameloop="demand": anything that animates (GSAP tick, Lenis scroll
//   callback) MUST call invalidate() from @react-three/fiber.
// - ContextGuard handles webglcontextlost / webglcontextrestored and, on
//   unmount, disposes geometries, materials, textures (including ShaderMaterial
//   uniform textures) and releases the GL context.

import React, { useEffect } from "react";
import { Canvas, useThree } from "@react-three/fiber";
import type { Material, Mesh, Object3D, Texture } from "three";
import { canvasTunnel } from "@/components/canvas/tunnel";

const DPR_RANGE: [number, number] = [1, 1.5];

function disposeValue(value: unknown) {
  if (value && (value as Texture).isTexture) (value as Texture).dispose();
}

function disposeMaterial(material: Material) {
  for (const value of Object.values(material)) disposeValue(value);
  const uniforms = (material as Material & {
    uniforms?: Record<string, { value: unknown }>;
  }).uniforms;
  if (uniforms) {
    for (const u of Object.values(uniforms)) disposeValue(u?.value);
  }
  material.dispose();
}

function disposeObject(root: Object3D) {
  root.traverse((obj) => {
    const mesh = obj as Mesh;
    if (mesh.geometry) mesh.geometry.dispose();
    if (mesh.material) {
      if (Array.isArray(mesh.material)) mesh.material.forEach(disposeMaterial);
      else disposeMaterial(mesh.material);
    }
  });
}

function ContextGuard() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const invalidate = useThree((s) => s.invalidate);

  useEffect(() => {
    const canvas = gl.domElement;

    const onLost = (event: Event) => {
      // Required: allows the browser to restore the context.
      event.preventDefault();
      console.warn("[CanvasBridge] WebGL context lost; awaiting restoration.");
    };
    const onRestored = () => {
      console.info("[CanvasBridge] WebGL context restored.");
      invalidate();
    };

    canvas.addEventListener("webglcontextlost", onLost, false);
    canvas.addEventListener("webglcontextrestored", onRestored, false);

    return () => {
      canvas.removeEventListener("webglcontextlost", onLost, false);
      canvas.removeEventListener("webglcontextrestored", onRestored, false);
      disposeObject(scene);
      gl.renderLists.dispose();
      gl.dispose();
      gl.forceContextLoss();
    };
  }, [gl, scene, invalidate]);

  return null;
}

export default function CanvasBridge() {
  return (
    <div
      aria-hidden="true"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        pointerEvents: "none",
        zIndex: -1,
      }}
    >
      <Canvas
        dpr={DPR_RANGE}
        frameloop="demand"
        gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        camera={{ position: [0, 0, 5], fov: 45 }}
        style={{ width: "100%", height: "100%" }}
      >
        <ContextGuard />
        <canvasTunnel.Out />
      </Canvas>
    </div>
  );
}

