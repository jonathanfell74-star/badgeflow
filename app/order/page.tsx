"use client";

import { useState, useMemo } from "react";
import { priceForQuantity } from "../../lib/pricing";

export default function OrderPage() {
  const [qty, setQty] = useState<number>(10);
  const [wallet, setWallet] = useState<boolean>(true);
  const prices = useMemo(() => priceForQuantity(qty), [qty]);
  const total = qty * prices.cardUnit + (wallet ? qty * prices.walletUnit : 0);

  async function onCheckout(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, wallet })
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Failed to start checkout");
      return;
    }
    window.location.href = json.url;
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Start an order</h1>

      <form onSubmit={onCheckout} style={{ display: "grid", gap: 16, maxWidth: 520 }}>
        <label>
          Quantity
          <input
            type="number"
            min={1}
            value={qty}
            onChange={(e) => setQty(parseInt(e.target.value || "1"))}
            style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
          />
        </label>

        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input type="checkbox" checked={wallet} onChange={(e) => setWallet(e.target.checked)} />
          Add Mobile Wallet Pass (+£4.95 base, same % discounts)
        </label>

        <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
          <div>Card unit price: <strong>£{prices.cardUnit.toFixed(2)}</strong></div>
          {wallet && <div>Wallet unit price: <strong>£{prices.walletUnit.toFixed(2)}</strong></div>}
          <div style={{ marginTop: 8, color: "#475569" }}>
            Subtotal: <strong>£{total.toFixed(2)}</strong> (ex VAT)
          </div>
        </div>

        <button
          type="submit"
          style={{
            padding: "10px 16px",
            borderRadius: 10,
            background: "#4f46e5",
            color: "white",
            border: 0,
            cursor: "pointer"
          }}
        >
          Proceed to payment
        </button>

        <p style={{ color: "#64748b", fontSize: 14 }}>
          Orders confirmed before <strong>3pm</strong> dispatch <strong>same day</strong>. After 3pm → <strong>next day</strong>.
        </p>
      </form>
    </div>
  );
}
