import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "tsproxy marketplace — App Router",
  description: "Faceted product search over an embedded tsproxy handler.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
