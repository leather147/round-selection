import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import "@round-selection/react/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Round Selection — text selection with shape",
  description:
    "Three precise text-selection renderers for React 19, presented in a fast Next.js 16 monorepo.",
  metadataBase: new URL("https://github.com/leather147/round-selection"),
  openGraph: {
    title: "Round Selection",
    description: "Text selection with shape, continuity and intent.",
    type: "website",
  },
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#0b0d10",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
