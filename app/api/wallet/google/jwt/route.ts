export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { buildGoogleSaveUrl } from "@/lib/wallet/google";

export async function POST(req: NextRequest) {
  const { cardId } = await req.json();
  if (!cardId) return NextResponse.json({ error: "cardId required" }, { status: 400 });

  const { data: card, error } = await supabaseAdmin
    .from("manual_cards")
    .select("id, full_name, role, department, company_id, wallet_serial, valid_until")
    .eq("id", cardId)
    .single();

  if (error || !card)
    return NextResponse.json({ error: "manual_cards row not found" }, { status: 404 });

  const baseUrl = process.env.BADGEFLOW_BASE_URL!;
  const { saveUrl } = buildGoogleSaveUrl(card, baseUrl);
  return NextResponse.json({ url: saveUrl });
}
