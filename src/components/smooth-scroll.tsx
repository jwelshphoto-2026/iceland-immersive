"use client";
// Lenis + GSAP ScrollTrigger bridge. Lenis has no RAF loop of its own: it is
// driven by the global Three.js render loop via addEffect(), so scroll and
// WebGL share a single frame source.
//
// The canvas runs frameloop="demand", so addEffect callbacks only fire when a
// frame is requested. To keep Lenis alive we invalidate() (a) on any user
// input that can start a scroll and (b) every frame while Lenis is still
// animating.
import { useEffect } from "react";
import Lenis from "lenis";
import { addEffect, invalidate } from "@react-three/fiber";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import gsap from "gsap";

export function SmoothScroll({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    // Single RAF source: disable GSAP's own ticker-driven lag smoothing and
    // never register Lenis on gsap.ticker or a native requestAnimationFrame.
    gsap.ticker.lagSmoothing(0);

    const lenis = new Lenis({ duration: 1.2, orientation: "vertical", autoRaf: false });
    lenis.on("scroll", ScrollTrigger.update);

    // addEffect passes a DOMHighResTimeStamp in milliseconds, which is what
    // lenis.raf expects.
    const removeEffect = addEffect((time: number) => {
      lenis.raf(time);
      if (lenis.isScrolling) invalidate();
    });

    const wake = () => invalidate();
    const events = ["wheel", "touchstart", "touchmove", "keydown", "resize"] as const;
    events.forEach((e) => window.addEventListener(e, wake, { passive: true }));
    invalidate();

    return () => {
      events.forEach((e) => window.removeEventListener(e, wake));
      removeEffect();
      lenis.destroy();
    };
  }, []);

  return <>{children}</>;
}
