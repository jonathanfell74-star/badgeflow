"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { priceForQuantity } from "../../lib/pricing";

// --- Client component that reads the query string and handles the forms
function OrderClient() {
  const params = useSearchParams();
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";
  const sessionId = params.get("session_id") || "";

  const [qty, setQty] = useState<number>(10);
  const [wallet, setWallet] = useState<boolean>(true);

  const prices = useMemo(() => priceForQuantity(qty), [qty]);
  const total = qty * prices.cardUnit + (wallet ? qty * prices.walletUnit : 0);

  // Start Stripe Checkout
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

  // Upload logo + roster + many photos, then show validation summary
  async function onUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    form.append("session_id", sessionId);

    const res = await fetch("/api/upload", { method: "POST", body: form });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Upload failed");
      return;
    }

    if (json.summary) {
      const s = json.summary as {
        uploaded_photos: number;
        roster_rows: number;
        matched: number;
        missing: number;
        missing_list?: string[];
      };
      alert(
        `Upload complete:
- Photos uploaded: ${s.uploaded_photos}
- Roster rows: ${s.roster_rows}
- Matched: ${s.matched}
- Missing: ${s.missing}${
          s.missing ? `\nMissing files:\n${(s.missing_list || []).join("\n")}` : ""
        }`
      );
    } else {
      alert("Files received. We’ll start processing your order.");
    }

    e.currentTarget.reset();
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Start an order</h1>

      {canceled && (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          ❌ Payment was canceled. You can try again below.
        </div>
      )}

      {/* BEFORE PAYMENT: quantity + wallet add-on */}
      {!success && (
        <form onSubmit={onCheckout} style={{ display: "grid", gap: 16, maxWidth: 520 }}>
          <label>
            Quantity
            <input
              type="number"
              min={1}
              value={qty}
              onChange={(e) => setQty(parseInt(e.target.value || "1", 10))}
              style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
            />
          </label>

          <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input
              type="checkbox"
              checked={wallet}
              onChange={(e) => setWallet(e.target.checked)}
            />
            Add Mobile Wallet Pass (+£4.95 base, same % discounts)
          </label>

          <div style={{ border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
            <div>
              Card unit price: <strong>£{prices.cardUnit.toFixed(2)}</strong>
            </div>
            {wallet && (
              <div>
                Wallet unit price: <strong>£{prices.walletUnit.toFixed(2)}</strong>
              </div>
            )}
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
      )}

      {/* AFTER PAYMENT: show upload panel when we have success + session_id */}
      {success && sessionId && (
        <div style={{ marginTop: 24 }}>
          <div style={{ background: "#ecfdf5", border: "1px solid #10b981", padding: 12, borderRadius: 8, marginBottom: 12 }}>
            ✅ Payment received. Upload your files to complete the order.
          </div>

          <form onSubmit={onUpload} style={{ display: "grid", gap: 12, maxWidth: 560 }}>
            <label>
              Company
              <input
                name="company"
                required
                style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </label>

            <label>
              Contact email
              <input
                type="email"
                name="contact_email"
                required
                style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </label>

            <label>
              Shipping address
              <textarea
                name="shipping_address"
                rows={3}
                required
                style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </label>

            <label>
              Company logo (PNG/SVG/JPG)
              <input type="file" name="logo" accept=".png,.svg,.jpg,.jpeg" required />
            </label>

            <label>
              Staff rota (CSV/XLSX — must include a column named "photo_filename")
              <input type="file" name="roster" accept=".csv,.xls,.xlsx" required />
            </label>

            <label>
              Staff photos (JPG/PNG) — filenames must match the "photo_filename" column
              <input type="file" name="photos" accept=".jpg,.jpeg,.png" multiple />
            </label>

            <label>
              Notes (optional)
              <textarea
                name="notes"
                rows={3}
                style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }}
              />
            </label>

            <button
              type="submit"
              style={{
                padding: "10px 16px",
                borderRadius: 10,
                background: "#059669",
                color: "white",
                border: 0,
                cursor: "pointer"
              }}
            >
              Upload files
            </button>

            <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
              Tip: in your roster, add a column <code>photo_filename</code> and ensure each value matches exactly the
              corresponding image filename you upload (e.g. <code>E1234.jpg</code>).
            </p>
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

// --- Page wrapped in Suspense (required when using useSearchParams)
export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Loading…</div>}>
      <OrderClient />
    </Suspense>
  );
}
