"use client";

import { useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { priceForQuantity } from "../../lib/pricing";

// Make sure this route never gets statically cached
export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function OrderPage() {
  const params = useSearchParams();
  const success = params.get("success") === "1";
  const sessionId = params.get("session_id") || "";

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
    if (!res.ok) return alert(json.error || "Failed to start checkout");
    window.location.href = json.url;
  }

  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.append("session_id", sessionId);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) return alert(json.error || "Upload failed");
    alert("Files received. We’ll start processing your order.");
    e.currentTarget.reset();
  }

  return (
    <div>
      {/* DEBUG: remove later. Confirms you’re on the new build. */}
      <div style={{ fontSize: 12, color: "#64748b", marginBottom: 8 }}>
        v2 · success={String(success)} · session_id={sessionId || "(none)"}
      </div>

      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Start an order</h1>

      {!success && (
        <form onSubmit={onCheckout} style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <label>Quantity
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

          <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#4f46e5", color: "white", border: 0 }}>
            Proceed to payment
          </button>

          <p style={{ color: "#64748b", fontSize: 14 }}>
            Orders confirmed before <strong>3pm</strong> dispatch <strong>same day</strong>. After 3pm → <strong>next day</strong>.
          </p>
        </form>
      )}

      {success && sessionId && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: "#ecfdf5", border: "1px solid #10b981", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            ✅ Payment received. Upload your files to complete the order.
          </div>

          <form onSubmit={onUpload} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
            <label>Company
              <input name="company" required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>
            <label>Contact email
              <input type="email" name="contact_email" required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>
            <label>Shipping address
              <textarea name="shipping_address" rows={3} required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>
            <label>Company logo (PNG/SVG/JPG)
              <input type="file" name="logo" accept=".png,.svg,.jpg,.jpeg" required />
            </label>
            <label>Staff rota (CSV/XLSX)
              <input type="file" name="roster" accept=".csv,.xls,.xlsx" required />
            </label>
            <label>Notes (optional)
              <textarea name="notes" rows={3} style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>
            <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#059669", color: "white", border: 0 }}>
              Upload files
            </button>
          </form>
        </div>
      )}

      {success && !sessionId && (
        <p style={{ color: "#b45309", marginTop: 16 }}>
          Payment confirmed but missing session_id. Please open the success link that includes the session id.
        </p>
      )}
    </div>
  );
}
