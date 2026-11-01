import React from "react";
import type { Metadata } from "next";
import "./globals.css";
import CanvasBridgeLoader from "@/components/canvas/CanvasBridgeLoader";
import { SmoothScroll } from "@/components/smooth-scroll";

export const metadata: Metadata = {
  title: "Iceland Immersive - Rare Light Media",
  description: "Immersive Iceland plate archive.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#0B0B0C] text-white antialiased" suppressHydrationWarning>
        {/* Root Canvas singleton - client-only WebGL host */}
        <CanvasBridgeLoader />
        <SmoothScroll>
          <main className="relative z-10">{children}</main>
        </SmoothScroll>
      </body>
    </html>
  );
}

