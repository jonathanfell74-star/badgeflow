import Link from "next/link";

export default function Page() {
  return (
    <div>
      <h1 style={{ fontSize: 32, marginBottom: 8 }}>BadgeFlow</h1>
      <p style={{ color: "#334155", marginBottom: 16 }}>
        Minimal site is live. Next: add pricing, order, Stripe & Supabase.
      </p>
      <Link href="https://vercel.com" target="_blank">Deploy on Vercel</Link>
    </div>
  );
}
