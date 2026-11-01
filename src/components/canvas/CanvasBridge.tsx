'use client';

import { Canvas } from '@react-three/fiber';
import { webglTunnel } from '@/lib/tunnel';

export default function CanvasBridge() {
  return (
    <Canvas
      frameloop="demand"
      camera={{ position: [0, 0, 1] }}
      gl={{ antialias: false, powerPreference: 'high-performance' }}
      className="w-full h-full"
    >
      <webglTunnel.Out />
    </Canvas>
  );
}
