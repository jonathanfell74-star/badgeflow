"use client";

import { useEffect, useState } from "react";

type Order = {
  id: string;
  created_at: string;
  quantity: number;
  wallet_addon: boolean;
  amount_total_cents: number;
  cutoff_result: string | null;
  dispatch_target: string | null;
  stripe_session_id: string | null;
  status: string;
};

export default function Dashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const r = await fetch("/api/orders");
      const j = await r.json();
      if (r.ok) setOrders(j.orders || []);
      setLoading(false);
    })();
  }, []);

  return (
    <div>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 12 }}>Orders</h1>

      {loading ? (
        <p style={{ color: "#64748b" }}>Loading…</p>
      ) : orders.length === 0 ? (
        <p style={{ color: "#64748b" }}>No orders yet. Make a test payment on /order.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th>Created</th>
                <th>Qty</th>
                <th>Wallet</th>
                <th>Total</th>
                <th>Dispatch</th>
                <th>Status</th>
                <th>Stripe ID</th>
              </tr>
            </thead>
            <tbody>
              {orders.map(o => (
                <tr key={o.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td>{new Date(o.created_at).toLocaleString()}</td>
                  <td>{o.quantity}</td>
                  <td>{o.wallet_addon ? "Yes" : "No"}</td>
                  <td>£{(o.amount_total_cents / 100).toFixed(2)}</td>
                  <td>{o.cutoff_result} → {o.dispatch_target || "-"}</td>
                  <td>{o.status}</td>
                  <td style={{ fontFamily: "monospace" }}>{o.stripe_session_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
