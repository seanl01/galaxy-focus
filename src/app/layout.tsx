import type { Metadata, Viewport } from "next";
import { StoreProvider } from "@/lib/store";
import "./globals.css";

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
    <html lang="en" className="dark">
      <body className="min-h-screen bg-space-950">
        <StoreProvider>{children}</StoreProvider>
      </body>
    </html>
  );
}
