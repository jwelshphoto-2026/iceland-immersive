# Iceland Immersive: RLM Studio Invariants & Execution Protocol

## 1. Zero-Friction Execution
Never instruct the operator to manually copy-paste code, run terminal commands, or switch windows. You must natively execute scripts (e.g., node scripts/inspect-focal.mjs, npm run build) and edit files directly.

## 2. Visual Architecture
- **Aesthetic:** RLM 2027 dark mode only. Obsidian `#0B0B0C` canvases, `#121316` scrims. The old light/charcoal-pastel background is retired.
- **Grid:** Strictly enforce the 12-column asymmetric spatial layout.
- **Housing:** All images and WebGL plates must use flush housing with border tokens: border border-white/10 rounded-xs.
- **Hero Scrim:** Always apply the exact studio scrim token: h-[48%] bg-gradient-to-t from-[#121316] from-15% via-[#121316]/75 via-50% to-transparent.
- **Plates:** Optimize WebP landscape plates (e.g., _ingvallavatn, Reynisdrangar) for fast WebGL loading.

## 3. Engineering Stack
Use Next.js App Router, React Three Fiber (R3F) for spatial canvases, Tailwind v4, and GSAP/Lenis for kinetic scrolling. Prevent WebGL context loss by strictly managing R3F component lifecycles.

## 4. WebGL Memory Safeguards
- Single `CanvasBridgeLoader` singleton mounted once in the root layout; content is injected via `canvasTunnel.In` (`src/lib/tunnel.ts`). Never create a second renderer or `<Canvas>`.
- `<Canvas dpr={[1, 1.5]} frameloop="demand">`; animation drivers (GSAP/Lenis) must call `invalidate()`.
- `ContextGuard` handles context loss/restore and disposes geometries, materials and textures (including ShaderMaterial uniforms) on unmount.

## 5. Asset Archive
`D:\RLM Projects\iceland-staging` is a read-only Asset Archive. Never modify, commit or stash there.
