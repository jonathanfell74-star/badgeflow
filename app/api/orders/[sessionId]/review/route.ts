import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

export const runtime = "nodejs";
const BUCKET = "orders";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE!
);

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const sessionId = params.sessionId;
  if (!sessionId) return NextResponse.json({ error: "Missing sessionId" }, { status: 400 });

  // 1) get order -> roster_path
  const { data: order, error: ordErr } = await supabaseAdmin
    .from("orders")
    .select("roster_path")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();
  if (ordErr) return NextResponse.json({ error: ordErr.message }, { status: 500 });
  if (!order?.roster_path) {
    return NextResponse.json({ error: "No roster uploaded for this session." }, { status: 400 });
  }

  // 2) download roster
  const { data: file, error: dlErr } = await supabaseAdmin.storage.from(BUCKET).download(order.roster_path as string);
  if (dlErr) return NextResponse.json({ error: dlErr.message }, { status: 500 });
  const rosterText = Buffer.from(await file.arrayBuffer()).toString("utf-8");

  // 3) list photos
  const prefix = `${sessionId}/photos`;
  const { data: list, error: listErr } = await supabaseAdmin.storage
    .from(BUCKET)
    .list(prefix, { limit: 2000 });
  if (listErr) return NextResponse.json({ error: listErr.message }, { status: 500 });
  const photoSet = new Set((list || []).map(f => f.name.toLowerCase()));

  // 4) parse simple CSV
  const lines = rosterText.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return NextResponse.json({ people: [] });
  const headers = lines[0].split(",").map(h => h.trim().toLowerCase());

  // columns we care about
  const idx = {
    employee_id: headers.indexOf("employee_id"),
    first_name: headers.indexOf("first_name"),
    last_name: headers.indexOf("last_name"),
    role: headers.indexOf("role"),
    site: headers.indexOf("site"),
    email: headers.indexOf("email"),
    photo_filename: headers.indexOf("photo_filename"),
  };
  if (idx.photo_filename === -1) {
    return NextResponse.json({ error: 'Roster is missing "photo_filename" column.' }, { status: 400 });
  }

  const people: any[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(",");
    if (cols.length < headers.length) continue;
    const photoName = (cols[idx.photo_filename] || "").trim();
    const hasPhoto = !!photoName && photoSet.has(photoName.toLowerCase());

    let photoUrl: string | null = null;
    if (hasPhoto) {
      const full = `${prefix}/${photoName}`;
      const { data: urlData } = await supabaseAdmin.storage.from(BUCKET).createSignedUrl(full, 600);
      photoUrl = urlData?.signedUrl || null;
    }

    people.push({
      employee_id: idx.employee_id >= 0 ? cols[idx.employee_id].trim() : "",
      first_name: idx.first_name >= 0 ? cols[idx.first_name].trim() : "",
      last_name: idx.last_name >= 0 ? cols[idx.last_name].trim() : "",
      role: idx.role >= 0 ? cols[idx.role].trim() : "",
      site: idx.site >= 0 ? cols[idx.site].trim() : "",
      email: idx.email >= 0 ? cols[idx.email].trim() : "",
      photo_filename: photoName,
      photo_url: photoUrl,
      matched: hasPhoto
    });
  }

  return NextResponse.json({ people });
}
