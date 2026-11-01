"use client";
// src/components/canvas/CanvasBridgeLoader.tsx
// Client Component boundary - allows ssr:false in next/dynamic.
// Mounted exactly once in the root layout: this is the WebGL singleton.
import dynamic from "next/dynamic";

const CanvasBridge = dynamic(() => import("./CanvasBridge"), { ssr: false });

export default function CanvasBridgeLoader() {
  return <CanvasBridge />;
}

