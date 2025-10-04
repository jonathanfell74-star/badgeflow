"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { saveAs } from "file-saver";
import { PDFDocument } from "pdf-lib";
import * as htmlToImage from "html-to-image";

/**
 * BadgeFlow – Simple Test Page
 * Press one button to make printable PDFs.
 */

export default function TestCards() {
  // Three pretend people just to test the export
  const people = [
    { id: "E1234", name: "Alex Smith", role: "Engineer" },
    { id: "E5678", name: "Jen Nguyen", role: "Supervisor" },
    { id: "E9012", name: "Chris Taylor", role: "Analyst" },
  ];

  const [making, setMaking] = useState(false);
  const hiddenRef = useRef<HTMLDivElement>(null);

  // A CR80 card is 85.6 mm × 54 mm → about 242 × 153 points
  const cardSize = { w: 242, h: 153 };

  // For export we draw both sides for each person
  const renderList = useMemo(
    () =>
      people.flatMap((p) => [
        { key: p.id + "_front", person: p, side: "front" },
        { key: p.id + "_back", person: p, side: "back" },
      ]),
    [people]
  );

  /** makes one A4 PDF of all cards */
  async function makePdf(images: string[], label: string) {
    const doc = await PDFDocument.create();
    const page = doc.addPage([595, 842]); // A4 portrait
    let x = 40,
      y = 842 - 180; // start near top
    for (let i = 0; i < images.length; i++) {
      const imgBytes = await fetch(images[i]).then((r) => r.arrayBuffer());
      const img = await doc.embedPng(imgBytes);
      page.drawImage(img, { x, y, width: cardSize.w, height: cardSize.h });
      x += cardSize.w + 10;
      if (x + cardSize.w > 595) {
        x = 40;
        y -= cardSize.h + 10;
      }
    }
    const bytes = await doc.save();
    saveAs(new Blob([bytes], { type: "application/pdf" }), `BadgeFlow_${label}.pdf`);
  }

  const handleExport = useCallback(async () => {
    if (!hiddenRef.current) return;
    setMaking(true);

    const nodes = hiddenRef.current.querySelectorAll("[data-card]");
    const fronts: string[] = [];
    const backs: string[] = [];

    for (let i = 0; i < nodes.length; i += 2) {
      const f = (await htmlToImage.toPng(nodes[i] as HTMLElement)) as string;
      const b = (await htmlToImage.toPng(nodes[i + 1] as HTMLElement)) as string;
      fronts.push(f);
      backs.push(b);
    }

    await makePdf(fronts, "Fronts");
    await makePdf(backs, "Backs");

    setMaking(false);
    alert("All done! 🎉  Check your downloads folder.");
  }, []);

  return (
    <div style={{ padding: 30 }}>
      <h1 style={{ fontSize: 24, fontWeight: 600 }}>BadgeFlow – Test Export</h1>
      <p style={{ marginTop: 8 }}>Click the button below to make sample PDFs.</p>

      <button
        onClick={handleExport}
        disabled={making}
        style={{
          marginTop: 20,
          background: "black",
          color: "white",
          padding: "10px 20px",
          borderRadius: 8,
          fontSize: 16,
        }}
      >
        {making ? "Working…" : "Export PDFs"}
      </button>

      {/* Hidden 1-to-1 cards for export */}
      <div
        ref={hiddenRef}
        style={{ position: "absolute", left: -9999, top: 0, width: 0, height: 0 }}
      >
        {renderList.map(({ key, person, side }) => (
          <div
            key={key}
            data-card
            style={{
              width: 1011, // 300 DPI true size
              height: 638,
              background: "#fff",
              border: "1px solid #ddd",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "sans-serif",
              fontSize: 20,
            }}
          >
            {side === "front" ? (
              <div>
                <strong>{person.name}</strong>
                <div>{person.role}</div>
              </div>
            ) : (
              <div>Back of card for {person.name}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
