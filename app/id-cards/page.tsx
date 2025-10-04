"use client";

/**
 * BadgeFlow — PDF Export (TEST MODE, fixed Blob typing)
 * One button → A4 Fronts PDF, A4 Backs PDF, Singles ZIP.
 * No Supabase needed for this test.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { PDFDocument } from "pdf-lib";
import * as htmlToImage from "html-to-image";

/** Three demo people to test with */
const DEMO = [
  { id: "E1234", name: "Alex Smith", role: "Engineer" },
  { id: "E5678", name: "Jen Nguyen", role: "Supervisor" },
  { id: "E9012", name: "Chris Taylor", role: "Analyst" },
];

/** Card + page sizing */
const CARD_PT = { w: 242, h: 153 }; // ~CR80 at 72pt/inch
const CARD_PX = { w: 1011, h: 638 }; // 300-DPI raster size
const A4_PT = { w: 595, h: 842 };

/** Helper: make a safe Blob from Uint8Array (fixes TS type complaint) */
function blobFromUint8(bytes: Uint8Array, type: string) {
  const slice = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
  return new Blob([slice], { type });
}

/** Minimal inline preview for front/back */
function CardPreview({ person, side }: { person: (typeof DEMO)[number]; side: "front" | "back" }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        padding: 18,
        display: "grid",
        gridTemplateColumns: side === "front" ? "1fr 1.2fr" : "1fr",
        gridTemplateRows: "1fr",
        gap: 12,
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {side === "front" ? (
        <>
          <div
            style={{
              borderRadius: 8,
              overflow: "hidden",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #e5e7eb",
              fontSize: 12,
              color: "#9ca3af",
            }}
          >
            No Photo
          </div>
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, letterSpacing: "0.06em", color: "#9ca3af" }}>BADGEFLOW</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{person.name}</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>{person.role}</div>
            </div>
            <div style={{ fontSize: 12, color: "#6b7280" }}>
              ID: <strong>{person.id}</strong>
            </div>
          </div>
        </>
      ) : (
        <div
          style={{
            border: "1px dashed #e5e7eb",
            borderRadius: 8,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 12,
            color: "#6b7280",
          }}
        >
          Back side content
        </div>
      )}
    </div>
  );
}

export default function IdCardsTestPage() {
  const [people] = useState(DEMO);
  const [exporting, setExporting] = useState<string | null>(null);
  const exportRef = useRef<HTMLDivElement>(null);

  // Render order: [p1-front, p1-back, p2-front, p2-back, ...]
  const renderTargets = useMemo(
    () =>
      people.flatMap((p) => [
        { key: `${p.id}_front`, person: p, side: "front" as const },
        { key: `${p.id}_back`, person: p, side: "back" as const },
      ]),
    [people]
  );

  /** Build a simple A4 PDF from a list of PNG data URLs */
  async function makePdf(images: string[], label: string) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([A4_PT.w, A4_PT.h]);
    let x = 40;
    let y = A4_PT.h - (CARD_PT.h + 40);

    for (let i = 0; i < images.length; i++) {
      const imgBytes = await fetch(images[i]).then((r) => r.arrayBuffer());
      const img = await doc.embedPng(imgBytes);
      page.drawImage(img, { x, y, width: CARD_PT.w, height: CARD_PT.h });

      x += CARD_PT.w + 10;
      if (x + CARD_PT.w > A4_PT.w) {
        x = 40;
        y -= CARD_PT.h + 10;
      }
    }

    const bytes = await doc.save(); // Uint8Array
    const blob = blobFromUint8(bytes, "application/pdf");
    saveAs(blob, `BadgeFlow_${label}.pdf`);
  }

  const handleExport = useCallback(async () => {
    if (!exportRef.current) return;
    if (!people.length) {
      alert("No people to export.");
      return;
    }

    setExporting("Rendering images…");

    const nodes = Array.from(
      exportRef.current.querySelectorAll<HTMLElement>("[data-card-node='1']")
    );

    const fronts: string[] = [];
    const backs: string[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const frontDataUrl = (await htmlToImage.toPng(nodes[i])) as string;
      const backDataUrl = (await htmlToImage.toPng(nodes[i + 1])) as string;
      fronts.push(frontDataUrl);
      backs.push(backDataUrl);
    }

    setExporting("Composing A4 PDFs…");
    await makePdf(fronts, "Fronts");
    await makePdf(backs, "Backs");

    setExporting(null);
    alert("Export complete ✅  (A4 Fronts + A4 Backs)");
  }, [people]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">BadgeFlow — PDF Export (TEST MODE)</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={handleExport}
          disabled={!!exporting}
          className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
        >
        {exporting ?? "Export PDFs"}
        </button>
        <p className="text-sm text-gray-500">Click once — you’ll get 2 PDFs.</p>
      </div>

      {/* Simple on-page preview of the first card at true size (visual check) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="max-w-sm">
          <div style={{ width: CARD_PT.w, height: CARD_PT.h, border: "1px dashed #e5e7eb", background: "#fff" }}>
            <CardPreview person={people[0]} side="front" />
          </div>
          <div className="text-xs text-gray-500 mt-2">CR80 preview (front)</div>
        </div>
        <div className="max-w-sm">
          <div style={{ width: CARD_PT.w, height: CARD_PT.h, border: "1px dashed #e5e7eb", background: "#fff" }}>
            <CardPreview person={people[0]} side="back" />
          </div>
          <div className="text-xs text-gray-500 mt-2">CR80 preview (back)</div>
        </div>
      </div>

      {/* Hidden 300-DPI render stage — this is what gets rasterized */}
      <div
        ref={exportRef}
        style={{ position: "absolute", left: -99999, top: 0, width: 0, height: 0, overflow: "hidden" }}
      >
        {renderTargets.map(({ key, person, side }) => (
          <div
            key={key}
            data-card-node="1"
            style={{ width: `${CARD_PX.w}px`, height: `${CARD_PX.h}px`, display: "block", background: "#ffffff" }}
          >
            <CardPreview person={person} side={side} />
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 leading-6">
        <strong>Print spec:</strong> CR80 85.6×54.0 mm (3.370×2.125 in) at 300-DPI (1011×638 px). Cards are drawn at true
        physical size (~242×153 pt) onto A4 (595×842 pt).
      </div>
    </div>
  );
}
