// src/lib/tunnel.ts
// tunnel-rat singleton - the Out end lives in CanvasBridge (the single WebGL
// host mounted in the root layout); the In end is used anywhere in the tree to
// inject R3F content into the shared renderer without a second WebGLRenderer.
import tunnel from "tunnel-rat";

export const canvasTunnel = tunnel();

