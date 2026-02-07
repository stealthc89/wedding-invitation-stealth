import type { Metadata } from "next";
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
      <body>{children}</body>
    </html>
  );
}
