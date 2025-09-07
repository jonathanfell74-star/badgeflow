"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { priceForQuantity } from "../../lib/pricing";

type Summary = {
  uploaded_photos: number;
  roster_rows: number;
  matched: number;
  missing: number;
  missing_list?: string[];
} | null;

type PreviewItem = { name: string; url: string };

function OrderClient() {
  const params = useSearchParams();
  const success = params.get("success") === "1";
  const canceled = params.get("canceled") === "1";
  const sessionId = params.get("session_id") || "";

  const [qty, setQty] = useState<number>(10);
  const [wallet, setWallet] = useState<boolean>(true);
  const [summary, setSummary] = useState<Summary>(null);
  const [previews, setPreviews] = useState<PreviewItem[] | null>(null);
  const [loadingPrev, setLoadingPrev] = useState(false);

  const prices = useMemo(() => priceForQuantity(qty), [qty]);
  const total = qty * prices.cardUnit + (wallet ? qty * prices.walletUnit : 0);

  async function onCheckout(e: React.FormEvent) {
    e.preventDefault();
    const res = await fetch("/api/stripe/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: qty, wallet }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert(json.error || "Failed to start checkout");
      return;
    }
    window.location.href = json.url;
  }

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
    setSummary(json.summary ?? null);
    setPreviews(null); // clear previews after new upload
    e.currentTarget.reset();
  }

  async function loadPreviews() {
    setLoadingPrev(true);
    try {
      const res = await fetch(`/api/orders/${encodeURIComponent(sessionId)}/photos`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load previews");
      setPreviews(json.previews as PreviewItem[]);
    } catch (e: any) {
      alert(e.message || "Failed to load previews");
    } finally {
      setLoadingPrev(false);
    }
  }

  function downloadMissingCSV() {
    if (!summary?.missing || !summary.missing_list?.length) return;
    const lines = ["photo_filename", ...summary.missing_list];
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "missing_photos.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Start an order</h1>

      {canceled && (
        <div style={{ background: "#fef2f2", border: "1px solid #ef4444", padding: 12, borderRadius: 8, marginBottom: 12 }}>
          ❌ Payment was canceled. You can try again below.
        </div>
      )}

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

          <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#4f46e5", color: "white", border: 0, cursor: "pointer" }}>
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
            <label>
              Company
              <input name="company" required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>

            <label>
              Contact email
              <input type="email" name="contact_email" required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>

            <label>
              Shipping address
              <textarea name="shipping_address" rows={3} required style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
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
              <textarea name="notes" rows={3} style={{ width: "100%", padding: 8, border: "1px solid #e5e7eb", borderRadius: 8 }} />
            </label>

            <button type="submit" style={{ padding: "10px 16px", borderRadius: 10, background: "#059669", color: "white", border: 0, cursor: "pointer" }}>
              Upload files
            </button>

            <p style={{ color: "#64748b", fontSize: 13, marginTop: 8 }}>
              Tip: your roster needs a <code>photo_filename</code> column whose values exactly match the image filenames (e.g. <code>E1234.jpg</code>).
            </p>
          </form>

          {/* Summary & preview */}
          {summary && (
            <div style={{ marginTop: 20, border: "1px solid #e5e7eb", borderRadius: 12, padding: 12 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 600 }}>Upload summary</h3>
              <div style={{ marginTop: 8, color: "#334155" }}>
                Photos uploaded: <strong>{summary.uploaded_photos}</strong><br />
                Roster rows: <strong>{summary.roster_rows}</strong><br />
                Matched: <strong>{summary.matched}</strong><br />
                Missing: <strong>{summary.missing}</strong>
              </div>

              {summary.missing > 0 && (
                <div style={{ marginTop: 8 }}>
                  <details>
                    <summary style={{ cursor: "pointer" }}>Show missing filenames</summary>
                    <pre style={{ background: "#f8fafc", padding: 8, borderRadius: 8, overflowX: "auto" }}>
                      {(summary.missing_list || []).join("\n")}
                    </pre>
                  </details>
                  <button onClick={downloadMissingCSV} style={{ marginTop: 8, padding: "6px 10px", borderRadius: 8, border: 0, background: "#0ea5e9", color: "white", cursor: "pointer" }}>
                    Download missing list (CSV)
                  </button>
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button onClick={loadPreviews} disabled={loadingPrev} style={{ padding: "8px 12px", borderRadius: 10, border: 0, background: "#4f46e5", color: "white", cursor: "pointer" }}>
                  {loadingPrev ? "Loading previews…" : "Preview uploaded photos"}
                </button>
              </div>

              {previews && (
                <div style={{ marginTop: 12, display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 8 }}>
                  {previews.length === 0 && <div style={{ color: "#64748b" }}>No photos uploaded yet.</div>}
                  {previews.map((p) => (
                    <figure key={p.name} style={{ margin: 0 }}>
                      <img src={p.url} alt={p.name} style={{ width: "100%", height: 120, objectFit: "cover", borderRadius: 8, border: "1px solid #e5e7eb" }} />
                      <figcaption style={{ fontSize: 12, color: "#64748b", marginTop: 4, wordBreak: "break-all" }}>{p.name}</figcaption>
                    </figure>
                  ))}
                </div>
              )}
            </div>
          )}
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

export default function Page() {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Loading…</div>}>
      <OrderClient />
    </Suspense>
  );
}
