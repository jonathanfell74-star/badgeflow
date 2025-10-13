export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { issueApplePkpass } from "@/lib/wallet/apple";
import { buildGoogleSaveUrl } from "@/lib/wallet/google";

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get("x-badgeflow-secret");
    if (!secret || secret !== process.env.WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const cardId: string | undefined =
      body?.record?.id || body?.new?.id || body?.id;

    if (!cardId) {
      return NextResponse.json({ error: "No manual_cards id" }, { status: 400 });
    }

    const { data: card, error } = await supabaseAdmin
      .from("manual_cards")
      .select("id, full_name, role, department, company_id, photo_url, wallet_serial, valid_until")
      .eq("id", cardId)
      .single();

    if (error || !card) throw new Error(error?.message || "manual_cards row not found");

    const baseUrl = process.env.BADGEFLOW_BASE_URL!;
    const { pkpassBuffer, serial } = await issueApplePkpass(card, baseUrl);

    const storagePath = `wallet/${card.id}.pkpass`;
    const upload = await supabaseAdmin.storage
      .from("public")
      .upload(storagePath, pkpassBuffer, { upsert: true, contentType: "application/vnd.apple.pkpass" });
    if (upload.error) throw new Error(upload.error.message);

    const { data: signed, error: signErr } = await supabaseAdmin.storage
      .from("public")
      .createSignedUrl(storagePath, 60 * 60 * 24 * 30);
    if (signErr) throw new Error(signErr.message);

    const appleUrl = signed?.signedUrl || null;
    const { saveUrl } = buildGoogleSaveUrl({ ...card, wallet_serial: serial }, baseUrl);

    const { error: upErr } = await supabaseAdmin
      .from("manual_cards")
      .update({
        wallet_serial: serial,
        apple_pass_url: appleUrl,
        google_wallet_link: saveUrl,
        wallet_updated_at: new Date().toISOString()
      })
      .eq("id", card.id);
    if (upErr) throw new Error(upErr.message);

    return NextResponse.json({ ok: true, cardId: card.id, appleUrl, googleUrl: saveUrl });
  } catch (e: any) {
    console.error("Wallet webhook error:", e);
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
