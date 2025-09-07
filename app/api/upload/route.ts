import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";
const BUCKET = "orders";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

async function readTextFromStorage(path: string) {
  const { data, error } = await supabaseAdmin.storage.from(BUCKET).download(path);
  if (error) throw error;
  const buf = Buffer.from(await data.arrayBuffer());
  return buf.toString("utf-8");
}

export async function POST(req: NextRequest) {
  const form = await req.formData();

  const sessionId = String(form.get("session_id") || "");
  const company = String(form.get("company") || "");
  const contact_email = String(form.get("contact_email") || "");
  const shipping_address = String(form.get("shipping_address") || "");
  const notes = String(form.get("notes") || "");

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const logo = form.get("logo") as File | null;
  const roster = form.get("roster") as File | null;
  const photos = form.getAll("photos") as File[]; // can be empty

  const uploadFile = async (file: File, key: string) => {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (error) throw error;
  };

  let logo_path: string | null = null;
  let roster_path: string | null = null;

  try {
    // Upload logo/roster if provided
    if (logo) {
      logo_path = `${sessionId}/logo-${Date.now()}-${logo.name}`;
      await uploadFile(logo, logo_path);
    }
    if (roster) {
      roster_path = `${sessionId}/roster-${Date.now()}-${roster.name}`;
      await uploadFile(roster, roster_path);
    }

    // Upload photos (if any)
    for (const photo of photos) {
      if (!photo?.name) continue;
      await uploadFile(photo, `${sessionId}/photos/${photo.name}`);
    }

    // -----------------------------------------
    // Build validation picture (all photos + the latest roster)
    // -----------------------------------------
    // Get existing order (for existing roster_path if not provided)
    const { data: existing, error: selErr } = await supabaseAdmin
      .from("orders")
      .select("roster_path")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (selErr) throw selErr;

    // Determine which roster text to use:
    // 1) the new one just uploaded, else
    // 2) the previously saved one (if any)
    let rosterText: string | null = null;
    if (roster) {
      const buf = Buffer.from(await roster.arrayBuffer());
      rosterText = buf.toString("utf-8");
      roster_path = roster_path!; // set above
    } else if (existing?.roster_path) {
      roster_path = existing.roster_path;
      rosterText = await readTextFromStorage(roster_path);
    }

    // List ALL current photo filenames for this session
    const { data: list, error: listErr } = await supabaseAdmin.storage
      .from(BUCKET)
      .list(`${sessionId}/photos`, { limit: 1000 });
    if (listErr) throw listErr;

    const allPhotoNames = (list || []).map((f) => f.name.toLowerCase());

    // Validate roster vs photos (simple CSV)
    let rosterRows = 0;
    let matched = 0;
    let missing = 0;
    let missingList: string[] = [];

    if (rosterText) {
      const lines = rosterText.split(/\r?\n/).filter((l) => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const photoIdx = headers.indexOf("photo_filename");
        if (photoIdx === -1) {
          return NextResponse.json(
            {
              error:
                'The roster is missing a "photo_filename" column. Please add it and re-upload.',
            },
            { status: 400 }
          );
        }
        const set = new Set(allPhotoNames);
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length < headers.length) continue;
          const fname = (cols[photoIdx] || "").trim().toLowerCase();
          if (!fname) continue;
          rosterRows++;
          if (set.has(fname)) matched++;
          else {
            missing++;
            missingList.push(fname);
          }
        }
      }
    }

    // Save metadata & counts
    const { error: updErr } = await supabaseAdmin
      .from("orders")
      .update({
        logo_path: logo_path ?? undefined,
        roster_path: roster_path ?? undefined,
        company,
        contact_email,
        shipping_address,
        notes,
        photo_count: allPhotoNames.length,
        roster_rows: rosterRows,
        photo_matched: matched,
        photo_missing: missing,
      })
      .eq("stripe_session_id", sessionId);
    if (updErr) throw updErr;

    return NextResponse.json({
      ok: true,
      summary: {
        uploaded_photos: allPhotoNames.length,
        roster_rows: rosterRows,
        matched,
        missing,
        missing_list: missingList,
      },
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
