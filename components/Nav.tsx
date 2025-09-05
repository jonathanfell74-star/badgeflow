import Link from "next/link";

export default function Nav() {
  return (
    <header style={{ borderBottom: "1px solid #e5e7eb", background: "#fff" }}>
      <div
        style={{
          maxWidth: 960,
          margin: "0 auto",
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center"
        }}
      >
        <Link href="/" style={{ fontWeight: 800, fontSize: 20 }}>
          BadgeFlow
        </Link>
        <nav style={{ display: "flex", gap: 16 }}>
          <Link href="/pricing">Pricing</Link>
          <Link href="/order">Start an order</Link>
        </nav>
      </div>
    </header>
  );
}
