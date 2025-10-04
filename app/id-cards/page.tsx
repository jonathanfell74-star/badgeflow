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

    setExporting("Rendering images…
