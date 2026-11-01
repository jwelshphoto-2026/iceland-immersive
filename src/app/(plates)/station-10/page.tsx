"use client";
// Station 10 - The Solfatara Verge.
// Injects GeothermalMist into the global CanvasBridge via canvasTunnel.In.
// ScrollTrigger writes density into a mutable ref (never React state), so
// scrolling causes zero re-renders; the mist reads the ref inside useFrame.
import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { invalidate } from "@react-three/fiber";
import { canvasTunnel } from "@/components/canvas/tunnel";
import GeothermalMist, { type MistState } from "@/components/canvas/shaders/GeothermalMist";

const DENSITY_MIN = 0.25; // ambient draft
const DENSITY_MAX = 0.78; // choking steam vent

const plate10Text = {
  substrate: "Sublimated Sulfur Crust / Fractured Basalt / Hydrothermal Steam Nozzle",
  body: "Acidic ground heat fractures the horizontal crust into brittle ochre plates, vented by continuous sub-surface steam tracks. The horizon is eliminated; the frame is pressurized entirely by mineral scald, boiling silica silt, and heavy thermal vapor that saturates the yellow and iron-grey bedding planes.",
};

export default function Station10Page() {
  const sectionRef = useRef<HTMLElement>(null);
  const mistState = useRef<MistState>({ density: DENSITY_MIN, active: false });

  useEffect(() => {
    gsap.registerPlugin(ScrollTrigger);
    const state = mistState.current;

    const trigger = ScrollTrigger.create({
      trigger: sectionRef.current,
      start: "top 80%",
      end: "bottom 20%",
      scrub: 0.5,
      onToggle: (self) => {
        state.active = self.isActive;
        if (self.isActive) invalidate();
      },
      onUpdate: (self) => {
        state.density = DENSITY_MIN + self.progress * (DENSITY_MAX - DENSITY_MIN);
        invalidate();
      },
    });

    return () => {
      trigger.kill();
      state.active = false;
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      aria-label="Movement II: Station 10 - The Solfatara Verge"
      className="grid min-h-[220vh] grid-cols-12 gap-4 px-6 py-32"
    >
      {/* GeothermalMist is rendered by the root CanvasBridge, not here. */}
      <canvasTunnel.In>
        <GeothermalMist state={mistState} />
      </canvasTunnel.In>

      <header className="col-span-8 col-start-2 border-b border-white/10 pb-3">
        <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-[#C49A2B]">
          Movement II · Station 10
        </span>
        <h1 className="mt-5 font-serif text-5xl font-light leading-tight">The Solfatara Verge</h1>
        <p className="mt-2 font-serif text-lg italic text-white/70">
          Volumetric thermal steam drifting across pressurized horizontal crust.
        </p>
      </header>

      <div className="sticky top-[40vh] col-span-5 col-start-2 row-start-2 self-start">
        <p className="font-serif text-xl leading-[1.85] text-[#E2DCD5]">{plate10Text.body}</p>
      </div>

      <aside className="sticky top-[40vh] col-span-3 col-start-9 row-start-2 self-start border-l-2 border-[#C49A2B] pl-5">
        <span className="mb-1 block font-mono text-[10px] uppercase tracking-[0.2em] text-[#C49A2B]">
          Substrate Physical Analysis
        </span>
        <span className="block font-mono text-[11px] leading-normal tracking-widest text-white/85">
          {plate10Text.substrate}
        </span>
      </aside>
    </section>
  );
}
