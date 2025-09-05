import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { Buffer } from "node:buffer";

export const runtime = "nodejs"; // ensure Node runtime on Vercel
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

  let logo_path: string | null = null;
  let roster_path: string | null = null;

  async function uploadFile(file: File, key: string) {
    const buf = Buffer.from(await file.arrayBuffer());
    const { error } = await supabaseAdmin.storage
      .from(BUCKET)                // bucket name only here
      .upload(key, buf, {
        contentType: file.type || "application/octet-stream",
        upsert: true,
      });
    if (error) throw error;
  }

  try {
    // store object keys WITHOUT the bucket name
    if (logo) {
      logo_path = `${sessionId}/logo-${Date.now()}-${logo.name}`;
      await uploadFile(logo, logo_path);
    }
    if (roster) {
      roster_path = `${sessionId}/roster-${Date.now()}-${roster.name}`;
      await uploadFile(roster, roster_path);
    }

    const { error } = await supabaseAdmin
      .from("orders")
      .update({ logo_path, roster_path, company, contact_email, shipping_address, notes })
      .eq("stripe_session_id", sessionId);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, logo_path, roster_path });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Upload failed" }, { status: 500 });
  }
}
