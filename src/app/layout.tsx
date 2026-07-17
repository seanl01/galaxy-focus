import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

// Aurebesh display face (Droidobesh Depot, Public Domain). Only used for the
// scramble glyphs in GlyphReveal, exposed as a CSS variable.
const aurebesh = localFont({
  src: "../fonts/droidobesh-depot.otf",
  variable: "--font-aurebesh",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = {
  title: "Focus Flight",
  description:
    "Every focus session is a journey across the galaxy. Choose a destination, take a valid hyperspace route, and stay focused until you arrive.",
};

export const viewport: Viewport = {
  themeColor: "#04060f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`dark ${aurebesh.variable}`}>
      <body className="min-h-screen bg-space-950">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
