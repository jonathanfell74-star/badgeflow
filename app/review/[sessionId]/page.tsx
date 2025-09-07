"use client";

import { Suspense, useEffect, useState } from "react";

type Person = {
  employee_id: string;
  first_name: string;
  last_name: string;
  role: string;
  site: string;
  email: string;
  photo_filename: string;
  photo_url: string | null;
  matched: boolean;
};

function Card({ p }: { p: Person }) {
  // credit-card-ish aspect ~1.586 (85.6x54mm). We'll render 320x202
  const W = 320, H = 202;
  return (
    <div style={{
      width: W, height: H, borderRadius: 16, boxShadow: "0 6px 16px rgba(0,0,0,0.08)",
      border: "1px solid #e5e7eb", background: "#fff", overflow: "hidden", display: "grid",
      gridTemplateColumns: "1fr 120px"
    }}>
      {/* left text panel */}
      <div style={{ padding: 12, display: "grid", gridTemplateRows: "auto 1fr auto", gap: 6 }}>
        {/* brand bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div style={{ width: 18, height: 18, borderRadius: 4, background: "#4f46e5" }} />
          <div style={{ fontWeight: 800, fontSize: 12, letterSpacing: 0.4, color: "#1f2937" }}>BadgeFlow</div>
        </div>
        {/* name + details */}
        <div style={{ marginTop: 2 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: "#0f172a", lineHeight: 1.1 }}>
            {p.first_name || p.last_name ? `${p.first_name} ${p.last_name}`.trim() : "(No name)"}
          </div>
          <div style={{ fontSize: 12, color: "#475569", marginTop: 2 }}>
            {p.role || "—"} {p.site ? `• ${p.site}` : ""}
          </div>
          <div style={{ fontSize: 11, color: "#64748b", marginTop: 6 }}>
            ID: <span style={{ fontFamily: "monospace" }}>{p.employee_id || "—"}</span>
          </div>
        </div>
        {/* footer line */}
        <div style={{ fontSize: 10, color: p.matched ? "#16a34a" : "#b91c1c" }}>
          {p.matched ? "Photo matched" : `Missing photo ${p.photo_filename ? `(${p.photo_filename})` : ""}`}
        </div>
      </div>

      {/* right photo panel */}
      <div style={{ position: "relative", background: "#f1f5f9" }}>
        {p.photo_url ? (
          <img
            src={p.photo_url}
            alt={p.photo_filename || "photo"}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: "#94a3b8", fontSize: 12 }}>
            No photo
          </div>
        )}
        {/* corner notch for style */}
        <div style={{
          position: "absolute", right: 0, top: 0, width: 0, height: 0,
          borderLeft: "18px solid transparent", borderBottom: "18px solid rgba(79,70,229,0.9)"
        }}/>
      </div>
    </div>
  );
}

function ReviewClient({ sessionId }: { sessionId: string }) {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/orders/${encodeURIComponent(sessionId)}/review`);
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || "Failed to load review data");
        setPeople(j.people || []);
      } catch (e: any) {
        setErr(e.message || "Failed to load review data");
      } finally {
        setLoading(false);
      }
    })();
  }, [sessionId]);

  if (loading) return <div style={{ color: "#64748b" }}>Loading…</div>;
  if (err) return <div style={{ color: "#b91c1c" }}>{err}</div>;

  const matched = people.filter(p => p.matched).length;
  const missing = people.length - matched;

  return (
    <div style={{ padding: "12px 16px" }}>
      <h1 style={{ fontSize: 24, fontWeight: 800, marginBottom: 8 }}>ID Card Preview</h1>
      <div style={{ color: "#334155", marginBottom: 12 }}>
        Total: <strong>{people.length}</strong> • Matched: <strong style={{ color: "#16a34a" }}>{matched}</strong> • Missing: <strong style={{ color: "#b91c1c" }}>{missing}</strong>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 12 }}>
        {people.map((p, i) => <Card key={i} p={p} />)}
      </div>
    </div>
  );
}

export default function Page({ params }: { params: { sessionId: string } }) {
  return (
    <Suspense fallback={<div style={{ color: "#64748b" }}>Loading…</div>}>
      <ReviewClient sessionId={params.sessionId} />
    </Suspense>
  );
}
