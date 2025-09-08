// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/Nav"; // NOTE: Capital N to match the filename

export const metadata: Metadata = {
  title: "BadgeFlow",
  description: "Minimal site is live. Next: uploads, review & ordering."
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <Nav />
        <main className="mx-auto max-w-5xl p-6">{children}</main>
      </body>
    </html>
  );
}
