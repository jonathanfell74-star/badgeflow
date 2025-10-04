"use client";

/**
 * BadgeFlow — PDF Export helpers (CR80 at true print scale)
 * Runs entirely client-side.
 */

import { PDFDocument, StandardFonts } from "pdf-lib";

/** Person type (extend as you wish) */
export type Person = {
  id: string;
  name: string;
  role?: string;
  department?: string;
  photoUrl?: string;
};

/** Physical sizing (CR80) and layout constants */
export const INCH_TO_PT = 72;
export const CARD_IN = { w: 3.37, h: 2.125 };
export const CARD_PT = { w: CARD_IN.w * INCH_TO_PT, h: CARD_IN.h * INCH_TO_PT }; // 242.64 × 153.0
export const CARD_PX = { w: 1011, h: 638 }; // exact 300 DPI target
export const A4_PT = { w: 595, h: 842 }; // 72 pt/in (portrait)
export const GRID = { cols: 2, rows: 5 }; // 10 per page
export const PAGE_MARGINS = { x: 40, y: 36 };
export const CELL_GAP = { x: 10, y: 10 };

/** Precompute grid cell positions for A4 sheets */
export function calculateCellPositions() {
  const usableW = A4_PT.w - PAGE_MARGINS.x * 2;
  const usableH = A4_PT.h - PAGE_MARGINS.y * 2;

  const totalGapX = CELL_GAP.x * (GRID.cols - 1);
  const totalGapY = CELL_GAP.y * (GRID.rows - 1);

  const cellW = (usableW - totalGapX) / GRID.cols;
  const cellH = (usableH - totalGapY) / GRID.rows;

  const positions: { x: number; y: number }[] = [];
  for (let r = 0; r < GRID.rows; r++) {
    for (let c = 0; c < GRID.cols; c++) {
      const cellX = PAGE_MARGINS.x + c * (cellW + CELL_GAP.x);
      const cellY = PAGE_MARGINS.y + r * (cellH + CELL_GAP.y);
      const x = cellX + (cellW - CARD_PT.w) / 2;
      const y = A4_PT.h - (cellY + CARD_PT.h) - (cellH - CARD_PT.h) / 2; // origin bottom-left
      positions.push({ x, y });
    }
  }
  return positions;
}

export const POSITIONS = calculateCellPositions();

/** Convert a DOM node (sized to CARD_PX) into a PNG data URL */
export async function pngDataUrlFromNode(node: HTMLElement): Promise<string> {
  // Lazy import to keep this module tree-shakeable and avoid SSR import issues
  const htmlToImage = await import("html-to-image");
  return htmlToImage.toPng(node, {
    pixelRatio: 1, // node is already sized to exact pixel box
    cacheBust: true,
    backgroundColor: "#ffffff",
    // style: { transform: "translateZ(0)" }, // sometimes helps on Safari
  });
}

/** Build A4 sheet PDFs (fronts-only and backs-only). Returns Blobs. */
export async function makeA4SheetPdfs(fronts: string[], backs: string[]) {
  const docFront = await PDFDocument.create();
  const docBack = await PDFDocument.create();

  const fontFront = await docFront.embedFont(StandardFonts.Helvetica);
  const fontBack = await docBack.embedFont(StandardFonts.Helvetica);

  const addGridPages = async (
    doc: PDFDocument,
    images: string[],
    label: "FRONT" | "BACK",
    font: any
  ) => {
    let page: any | null = null;
    let slot = 0;

    for (let i = 0; i < images.length; i++) {
      if (slot === 0) {
        page = doc.addPage([A4_PT.w, A4_PT.h]);
        page.drawText(`BadgeFlow — ${label} sheet`, {
          x: 16,
          y: A4_PT.h - 16,
          size: 8,
          font,
        });
      }
      const pngBytes = await fetch(images[i]).then((r) => r.arrayBuffer());
      const embedded = await doc.embedPng(pngBytes);
      const { x, y } = POSITIONS[slot];
      page.drawImage(embedded, { x, y, width: CARD_PT.w, height: CARD_PT.h });

      slot++;
      if (slot >= POSITIONS.length) slot = 0;
    }
  };

  await addGridPages(docFront, fronts, "FRONT", fontFront);
  await addGridPages(docBack, backs, "BACK", fontBack);

  const frontPdfBytes = await docFront.save();
  const backPdfBytes = await docBack.save();

  return {
    frontBlob: new Blob([frontPdfBytes], { type: "application/pdf" }),
    backBlob: new Blob([backPdfBytes], { type: "application/pdf" })
  };
}

/** Build a ZIP of single-card PDFs (front then back per person). Returns a Blob. */
export async function makeSinglesZip(
  fronts: string[],
  backs: string[],
  people: Person[]
): Promise<Blob> {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  for (let i = 0; i < people.length; i++) {
    const p = people[i];
    const doc = await PDFDocument.create();

    const addSide = async (dataUrl: string) => {
      const page = doc.addPage([CARD_PT.w, CARD_PT.h]);
      const pngBytes = await fetch(dataUrl).then((r) => r.arrayBuffer());
      const embedded = await doc.embedPng(pngBytes);
      page.drawImage(embedded, { x: 0, y: 0, width: CARD_PT.w, height: CARD_PT.h });
    };

    if (fronts[i]) await addSide(fronts[i]);
    if (backs[i]) await addSide(backs[i]);

    const bytes = await doc.save();
    const safeName = `${p.id}_${p.name.replace(/\s+/g, "_")}.pdf`;
    zip.file(safeName, bytes);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return blob;
}
