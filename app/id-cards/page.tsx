"use client";

/**
 * BadgeFlow — ID Cards page with LIVE data + Batch PDF Export
 *
 * How it finds data (first match wins):
 * 1) URL query ?batchId=XXXX  → fetches from Supabase (adjust mapping below if column names differ)
 * 2) localStorage "badgeflow_people" → JSON array of { id, name, role, department, photoUrl }
 *
 * Requires env:
 *  - NEXT_PUBLIC_SUPABASE_URL
 *  - NEXT_PUBLIC_SUPABASE_ANON_KEY
 *
 * Uses your existing IdCardPreview component and exports:
 *  - A4 fronts PDF
 *  - A4 backs PDF
 *  - ZIP of single-card PDFs (front+back per person)
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient } from "@supabase/supabase-js";
import { saveAs } from "file-saver";
import IdCardPreview from "@/components/IdCardPreview"; // ⬅️ your real preview component
import {
  Person,
  CARD_PX,
  CARD_PT,
  makeA4SheetPdfs,
  makeSinglesZip,
  pngDataUrlFromNode
} from "@/lib/pdfExport";

/** ---------- Supabase setup ---------- */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase =
  SUPABASE_URL && SUPABASE_ANON ? createClient(SUPABASE_URL, SUPABASE_ANON) : null;

/**
 * Edit this mapping to match your view/table shape.
 * We assume a view of "public.matches_view" with the columns below,
 * but the code simply remaps whatever you return.
 */
type Row = {
  employee_id: string;
  full_name: string;
  role?: string | null;
  department?: string | null;
  photo_url?: string | null;
};

function mapRowToPerson(r: Row): Person {
  return {
    id: r.employee_id,
    name: r.full_name,
    role: r.role ?? undefined,
    department: r.department ?? undefined,
    photoUrl: r.photo_url ?? undefined
  };
}

/** Fetch from Supabase by batchId (adjust table/view + filters to your schema) */
async function fetchPeopleByBatchId(batchId: string): Promise<Person[]> {
  if (!supabase) return [];
  // Example: a materialized view "matches_view" keyed by batch_id
  const { data, error } = await supabase
    .from("matches_view")
    .select("employee_id, full_name, role, department, photo_url")
    .eq("batch_id", batchId)
    .order("full_name", { ascending: true });

  if (error) {
    // eslint-disable-next-line no-console
    console.error("Supabase fetch error:", error);
    return [];
  }
  return (data as Row[]).map(mapRowToPerson);
}

/** Try multiple data sources in order: URL ?batchId=..., then localStorage */
function usePeople(): { people: Person[]; loading: boolean; source: string } {
  const [people, setPeople] = useState<Person[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<string>("");

  useEffect(() => {
    let isMounted = true;

    (async () => {
      setLoading(true);

      // 1) ?batchId=...
      const params = new URLSearchParams(window.location.search);
      const batchId = params.get("batchId");
      if (batchId) {
        const live = await fetchPeopleByBatchId(batchId);
        if (isMounted && live.length) {
          setPeople(live);
          setSource(`supabase:batchId=${batchId}`);
          setLoading(false);
          return;
        }
      }

      // 2) localStorage fallback
      try {
        const raw = localStorage.getItem("badgeflow_people");
        if (raw) {
          const arr = JSON.parse(raw) as Person[];
          if (isMounted && Array.isArray(arr) && arr.length) {
            setPeople(arr);
            setSource("localStorage:badgeflow_people");
            setLoading(false);
            return;
          }
        }
      } catch {
        /* ignore */
      }

      // Nothing found → empty
      if (isMounted) {
        setPeople([]);
        setSource("none");
        setLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return { people, loading, source };
}

/** ------------- Page ------------- */
export default function IdCardsPage() {
  const { people, loading, source } = usePeople();
  const [exporting, setExporting] = useState<string | null>(null);

  // Hidden export container (exact 300-DPI pixel box per side)
  const exportRef = useRef<HTMLDivElement>(null);

  // Create the flat render list: [p1-front, p1-back, p2-front, p2-back, ...]
  const renderTargets = useMemo(
    () =>
      people.flatMap((p) => [
        { key: `${p.id}_front`, person: p, side: "front" as const },
        { key: `${p.id}_back`, person: p, side: "back" as const }
      ]),
    [people]
  );

  const doExport = useCallback(async () => {
    if (!exportRef.current) return;
    if (!people.length) {
      alert("No people to export yet.");
      return;
    }

    setExporting("Rendering images…");

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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">BadgeFlow — ID Cards & PDF Export</h1>
        <div className="text-xs text-gray-500">
          Data source: <span className="font-mono">{loading ? "loading…" : source}</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={doExport}
          disabled={!!exporting || loading || people.length === 0}
          className="rounded-xl px-4 py-2 bg-black text-white disabled:opacity-50"
        >
          {exporting ?? "Export PDFs"}
        </button>
        <p className="text-sm text-gray-500">
          Creates A4 sheets (fronts & backs) and a ZIP of single-card PDFs.
        </p>
      </div>

      {/* Quick visual check — show first person front/back at true card size */}
      {people.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="max-w-sm">
            <div
              style={{
                width: CARD_PT.w,
                height: CARD_PT.h,
                border: "1px dashed #e5e7eb",
                background: "#fff"
              }}
            >
              <IdCardPreview person={people[0]} side="front" />
            </div>
            <div className="text-xs text-gray-500 mt-2">CR80 preview (front)</div>
          </div>
          <div className="max-w-sm">
            <div
              style={{
                width: CARD_PT.w,
                height: CARD_PT.h,
                border: "1px dashed #e5e7eb",
                background: "#fff"
              }}
            >
              <IdCardPreview person={people[0]} side="back" />
            </div>
            <div className="text-xs text-gray-500 mt-2">CR80 preview (back)</div>
          </div>
        </div>
      )}

      {(!loading && people.length === 0) && (
        <div className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
          No people found. Load via <code>?batchId=YOUR_BATCH_ID</code> (Supabase) or set{" "}
          <code>localStorage.badgeflow_people</code> to a JSON array of{" "}
          <code>{`{ id, name, role?, department?, photoUrl? }`}</code>.
        </div>
      )}

      {/* Hidden 300-DPI render stage — this is what actually gets rasterized */}
      <div
        ref={exportRef}
        style={{
          position: "absolute",
          left: -99999,
          top: 0,
          width: 0,
          height: 0,
          overflow: "hidden"
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
              background: "#ffffff"
            }}
          >
            {/* Your real preview component must fill its parent (100%/100%) and avoid outer shadows/margins */}
            <IdCardPreview person={person} side={side} />
          </div>
        ))}
      </div>

      <div className="text-sm text-gray-600 leading-6">
        <strong>Print spec:</strong> CR80 85.6×54.0 mm (3.370×2.125 in) at 300-DPI (1011×638 px). Cards are placed at true
        physical size (242.64×153 pt) on A4 (595×842 pt). For duplex printing, print the two PDFs in order.
      </div>
    </div>
  );
}
