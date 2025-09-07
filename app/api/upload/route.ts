import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";
const BUCKET = "orders";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

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

  // Accept multiple files named "photos"
  const photos = form.getAll("photos") as File[]; // can be empty

  let logo_path: string | null = null;
  let roster_path: string | null = null;

  async function uploadFile(file: File, key: string) {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)
      .upload(key, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (error) throw error;
  }

  // --- Upload files
  try {
    if (logo) {
      logo_path = `${sessionId}/logo-${Date.now()}-${logo.name}`;
      await uploadFile(logo, logo_path);
    }
    if (roster) {
      roster_path = `${sessionId}/roster-${Date.now()}-${roster.name}`;
      await uploadFile(roster, roster_path);
    }

    // Upload each photo into photos/ subfolder
    const uploadedPhotoNames: string[] = [];
    for (const photo of photos) {
      if (!photo || !photo.name) continue;
      const key = `${sessionId}/photos/${photo.name}`;
      await uploadFile(photo, key);
      uploadedPhotoNames.push(photo.name);
    }

    // --- Validate roster vs photo filenames (simple CSV parser)
    let rosterRows = 0;
    let matched = 0;
    let missing = 0;
    let missingList: string[] = [];

    if (roster) {
      const text = Buffer.from(await roster.arrayBuffer()).toString("utf-8");
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length > 0) {
        const headers = lines[0].split(",").map(h => h.trim().toLowerCase());
        const photoIdx = headers.indexOf("photo_filename");
        if (photoIdx === -1) {
          return NextResponse.json({
            error:
              `The roster is missing a "photo_filename" column. ` +
              `Please add it (e.g. E1234.jpg) and re-upload.`,
          }, { status: 400 });
        }
        const set = new Set(uploadedPhotoNames.map(n => n.toLowerCase()));
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(",");
          if (cols.length !== headers.length) continue; // skip malformed rows
          const fname = (cols[photoIdx] || "").trim().toLowerCase();
          if (!fname) continue;
          rosterRows++;
          if (set.has(fname)) matched++;
          else { missing++; missingList.push(fname); }
        }
      }
    }

    // Save metadata & validation counts
    const { error: dbErr } = await supabaseAdmin
      .from("orders")
      .update({
        logo_path,
        roster_path,
        company,
        contact_email,
        shipping_address,
        notes,
        photo_count: uploadedPhotoNames.length,
        roster_rows: rosterRows,
        photo_matched: matched,
        photo_missing: missing
      })
      .eq("stripe_session_id", sessionId);

    if (dbErr) {
      return NextResponse.json({ error: dbErr.message }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      summary: {
        uploaded_photos: uploadedPhotoNames.length,
        roster_rows: rosterRows,
        matched,
        missing,
        missing_list: missingList
      }
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
