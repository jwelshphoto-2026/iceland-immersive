import React from "react";
import type { Metadata } from "next";
import "./globals.css";
// CanvasBridgeLoader is a client boundary that dynamically imports CanvasBridge
// with { ssr: false } (next/dynamic ssr:false is disallowed in Server Components).
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
        <SmoothScroll>
          <main className="relative z-10">{children}</main>
        </SmoothScroll>
        {/* Root Canvas singleton - client-only WebGL host, mounted once below children */}
        <CanvasBridgeLoader />
      </body>
    </html>
  );
}
