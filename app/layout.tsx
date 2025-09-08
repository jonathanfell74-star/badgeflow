// app/layout.tsx
import "./globals.css";
import type { Metadata } from "next";
import Nav from "@/components/nav"; // <— lowercase to match your file

export const metadata: Metadata = {
  title: "BadgeFlow",
  description: "Minimal site is live. Next: add pricing, order, Stripe & Supabase."
};

export default function RootLayout({
  children
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
