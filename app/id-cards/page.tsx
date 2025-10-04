"use client";

/**
 * BadgeFlow — ID Cards page with Batch PDF Export
 * - Renders hidden card nodes at exact 300-DPI pixel dimensions (CR80).
 * - Exports A4 fronts/backs PDFs and a ZIP of single-card PDFs.
 *
 * Replace the demo people with your matched roster result.
 * If you have an existing IdCardPreview component, swap the inline <CardPreview/> with yours.
 */

import React, { useCallback, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import {
  Person,
  CARD_PX,
  CARD_PT,
  makeA4SheetPdfs,
  makeSinglesZip,
  pngDataUrlFromNode,
} from "@/lib/pdfExport";

/** ===== Demo data — replace with your roster/match results ===== */
const PEOPLE: Person[] = [
  { id: "E1234", name: "Alex Smith", role: "Engineer", department: "R&D", photoUrl: "/alex.jpg" },
  { id: "E5678", name: "Jen Nguyen", role: "Supervisor", department: "Ops", photoUrl: "/jen.jpg" },
  { id: "E9012", name: "Chris Taylor", role: "Analyst", department: "Finance", photoUrl: "/chris.jpg" }
];

/** ===== Simple inline card preview (front/back) — swap with your own if you have one ===== */
function CardPreview({
  person,
  side = "front",
}: {
  person: Person;
  side: "front" | "back";
}) {
  // This keeps a clean, printer-friendly export. No outer shadows/margins!
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        boxSizing: "border-box",
        background: "#ffffff",
        border: "1px solid #e5e7eb",
        padding: "18px",
        display: "grid",
        gridTemplateColumns: side === "front" ? "1fr 1.2fr" : "1fr",
        gridTemplateRows: "1fr",
        gap: "12px",
        fontFamily:
          '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, "Apple Color Emoji","Segoe UI Emoji"',
      }}
    >
      {side === "front" ? (
        <>
          {/* Photo block */}
          <div
            style={{
              borderRadius: "8px",
              overflow: "hidden",
              background: "#f3f4f6",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "1px solid #e5e7eb",
            }}
          >
            {person.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={person.photoUrl}
                alt={person.name}
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              <div style={{ fontSize: 12, color: "#9ca3af" }}>No Photo</div>
            )}
          </div>

          {/* Details */}
          <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 14, letterSpacing: "0.06em", color: "#9ca3af" }}>BADGEFLOW</div>
              <div style={{ fontSize: 22, fontWeight: 700, marginTop: 4 }}>{person.name}</div>
              <div style={{ fontSize: 14, color: "#6b7280", marginTop: 2 }}>
                {person.role || "Team Member"}{person.department ? ` · ${person.department}` : ""}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 6,
                  background: "#111827",
                }}
              />
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                ID: <strong>{person.id}</strong>
              </div>
            </div>
          </div>
        </>
      ) : (
        // Back side — placeholder for barcode, terms, contact, etc.
        <div
          style={{
            display: "grid",
            gridTemplateRows: "auto 1fr auto",
            height: "100%",
          }}
        >
          <div style={{ fontSize: 14, letterSpacing: "0.06em", color: "#9ca3af" }}>BADGEFLOW</div>
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
            Back side content (barcode/NFC info/RTW text)
          </div>
          <div style={{ fontSize: 10, color: "#9ca3af" }}>
            If found, please return to your company’s security desk.
          </div>
        </div>
      )}
    </div>
  );
}

export default function IdCardsPage() {
  const [people] = useState<Person[]>(PEOPLE);
  const [exporting, setExporting] = useState<string | null>(null);

  // Hidden export container (exact 300-DPI pixel box per side)
  const exportRef = useRef<HTMLDivElement>(null);

  // Create the flat render list: [p1-front, p1-back, p2-front, p2-back, ...]
  const renderTargets = useMemo(
    () =>
      people.flatMap((p) => [
        { key: `${p.id}_front`, person: p, side: "front" as const },
        { key: `${p.id}_back`, person: p, side: "back" as const },
      ]),
    [people]
  );

  const doExport = useCallback(async () => {
    if (!exportRef.current) return;

    setExporting("Rendering images…");

    // Query nodes in DOM order
    const nodes = Array.from(
      exportRef.current.querySelectorAll<HTMLElement>("[data-card-node='1']")
    );

    const fronts: string[] = [];
    const backs: string[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const frontNode = nodes[i];
      const backNode = nodes[i + 1];

      const frontDataUrl = await pngDataUrlFromNode(frontNode);
      const backDataUrl = await pngDataUrlFromNode(backNode);

      fronts.push(frontDataUrl);
      backs.push(backDataUrl);
    }

    setExporting("Composing A4 PDFs…");
    const { frontBlob, backBlob } = await makeA4SheetPdfs(fronts, backs);
    saveAs(frontBlob, "badgeflow_A4_fronts.pdf");
    saveAs(backBlob, "badgeflow_A4_backs.pdf");

    setExporting("Building single-card PDFs (zip)…");
    const zipBlob = await makeSinglesZip(fronts, backs, people);
    saveAs(zipBlob, "badgeflow_single_cards.zip");

    setExporting(null);
    alert("Export complete ✅  (A4 Fronts + A4 Backs + Singles ZIP)");
  }, [people]);

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">BadgeFlow — ID Cards & PDF Export</h1>

      <div className="flex items-center gap-3">
        <button
          onClick={doExport}
          disabled={!!exporting}
          className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {exporting ?? "Export PDFs"}
        </button>
        <p className="text-sm text-gray-500">
          Creates A4 sheets (fronts & backs) and a ZIP of single-card PDFs.
        </p>
      </div>

      {/* Optional: simple on-page preview of the first card (not used for export) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="max-w-sm">
          <div
            style={{
              width: CARD_PT.w,
              height: CARD_PT.h,
              border: "1px dashed #e5e7eb",
              background: "#fff",
            }}
          >
            <CardPreview person={people[0]} side="front" />
          </div>
          <div className="text-xs text-gray-500 mt-2">CR80 preview (front)</div>
        </div>
        <div className="max-w-sm">
          <div
            style={{
              width: CARD_PT.w,
              height: CARD_PT.h,
              border: "1px dashed #e5e7eb",
              background: "#fff",
            }}
          >
            <CardPreview person={people[0]} side="back" />
          </div>
          <div className="text-xs text-gray-500 mt-2">CR80 preview (back)</div>
        </div>
      </div>

      {/* Hidden 300-DPI render stage — this is what actually gets rasterized */}
      <div
        ref={exportRef}
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: 0,
          height: 0,
          overflow: "hidden",
        }}
      >
        {renderTargets.map(({ key, person, side }) => (
          <div
            key={key}
            data-card-node="1"
            style={{
              width: `${CARD_PX.w}px`,
              height: `${CARD_PX.h}px`,
              display: "block",
              background: "#ffffff",
            }}
          >
            <CardPreview person={person} side={side} />
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 leading-6">
        <strong>Print spec:</strong> CR80 85.6×54.0 mm (3.370×2.125 in) at 300-DPI (1011×638 px). Cards are placed at
        true physical size (242.64×153 pt) on A4 (595×842 pt). For duplex printing, print the two PDFs in order.
      </div>
    </div>
  );
}
