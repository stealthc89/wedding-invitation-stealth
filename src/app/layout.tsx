import type { Metadata } from "next";
import { FIRST_PHOTO } from "@/lib/slideshow-photos";
import "./globals.css";

export const metadata: Metadata = {
  title: "Wedding RSVP",
  description: "You're invited to celebrate with us",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        {/* Preload first slideshow image so it downloads in parallel with JS bundle */}
        <link rel="preload" href={FIRST_PHOTO} as="image" fetchPriority="high" />
      </head>
      <body>{children}</body>
    </html>
  );
}
